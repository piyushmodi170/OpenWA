import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AiBotService } from './ai-bot.service';
import { CreateAiBotConfigDto, UpdateAiBotConfigDto, TestAiBotDto } from './dto/ai-bot.dto';
import { AiBotConfig } from './entities/ai-bot-config.entity';
import { RequireRole } from '../auth/decorators/auth.decorators';
import { ApiKeyRole } from '../auth/entities/api-key.entity';

@ApiTags('ai-bot')
@Controller('ai-bot')
export class AiBotController {
  constructor(private readonly aiBotService: AiBotService) {}

  @Get('status')
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'Get AI bot status (OpenAI configured, configs count)' })
  async getStatus(): Promise<{ openaiConfigured: boolean; configCount: number }> {
    const configs = await this.aiBotService.findAll();
    return {
      openaiConfigured: this.aiBotService.isOpenAiConfigured(),
      configCount: configs.length,
    };
  }

  @Get('configs')
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'List all AI bot configs' })
  @ApiResponse({ status: 200, description: 'List of AI bot configs', type: [AiBotConfig] })
  async findAll(): Promise<AiBotConfig[]> {
    return this.aiBotService.findAll();
  }

  @Post('configs')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Create an AI bot config' })
  @ApiResponse({ status: 201, description: 'AI bot config created', type: AiBotConfig })
  async create(@Body() dto: CreateAiBotConfigDto): Promise<AiBotConfig> {
    return this.aiBotService.create(dto);
  }

  @Get('configs/:id')
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'Get AI bot config by ID' })
  async findOne(@Param('id') id: string): Promise<AiBotConfig> {
    return this.aiBotService.findOne(id);
  }

  @Put('configs/:id')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Update AI bot config' })
  async update(@Param('id') id: string, @Body() dto: UpdateAiBotConfigDto): Promise<AiBotConfig> {
    return this.aiBotService.update(id, dto);
  }

  @Delete('configs/:id')
  @RequireRole(ApiKeyRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete AI bot config' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.aiBotService.delete(id);
  }

  @Post('configs/:id/test')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Test AI bot with a message' })
  async test(@Param('id') id: string, @Body() dto: TestAiBotDto): Promise<{ reply: string }> {
    const config = await this.aiBotService.findOne(id);
    const reply = await this.aiBotService.generateReply(config, dto.message);
    return { reply };
  }
}
