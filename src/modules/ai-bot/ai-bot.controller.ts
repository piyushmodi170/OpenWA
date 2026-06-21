import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AiBotService } from './ai-bot.service';
import { CreateAiBotConfigDto, UpdateAiBotConfigDto, TestAiBotDto, ListModelsDto, SaveProviderKeyDto } from './dto/ai-bot.dto';
import { AiBotConfig } from './entities/ai-bot-config.entity';
import { RequireRole } from '../auth/decorators/auth.decorators';
import { ApiKeyRole } from '../auth/entities/api-key.entity';

@ApiTags('ai-bot')
@Controller('ai-bot')
export class AiBotController {
  constructor(private readonly aiBotService: AiBotService) {}

  @Get('status')
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'Get AI bot status' })
  async getStatus(): Promise<{ configCount: number; activeCount: number; hasEnvFallbackKey: boolean }> {
    const configs = await this.aiBotService.findAll();
    return {
      configCount: configs.length,
      activeCount: configs.filter(c => c.enabled).length,
      hasEnvFallbackKey: this.aiBotService.hasEnvFallbackKey(),
    };
  }

  // ─── Bot Configs ────────────────────────────────────────────────────────────

  @Get('configs')
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'List all AI bot configs' })
  @ApiResponse({ status: 200, type: [AiBotConfig] })
  async findAll(): Promise<AiBotConfig[]> {
    return this.aiBotService.findAll();
  }

  @Post('configs')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Create an AI bot config' })
  @ApiResponse({ status: 201, type: AiBotConfig })
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

  // ─── Provider Keys ──────────────────────────────────────────────────────────

  @Get('provider-keys')
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'List saved AI provider keys (masked)' })
  async listProviderKeys() {
    return this.aiBotService.listProviderKeys();
  }

  @Post('provider-keys')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Save or replace an AI provider key' })
  async saveProviderKey(@Body() dto: SaveProviderKeyDto) {
    return this.aiBotService.saveProviderKey(dto);
  }

  @Delete('provider-keys/:id')
  @RequireRole(ApiKeyRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a saved provider key' })
  async deleteProviderKey(@Param('id') id: string): Promise<void> {
    return this.aiBotService.deleteProviderKey(id);
  }

  @Post('provider-keys/:provider/list-models')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'List models using a saved provider key' })
  async listModelsForProvider(@Param('provider') provider: string): Promise<{ models: { id: string; label: string }[] }> {
    const apiKey = await this.aiBotService.getProviderApiKey(provider);
    if (!apiKey) return { models: [] };
    const models = await this.aiBotService.listModels(provider, apiKey);
    return { models };
  }

  // ─── Model Listing ──────────────────────────────────────────────────────────

  @Post('list-models')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'List available models for a given provider and API key' })
  async listModels(@Body() dto: ListModelsDto): Promise<{ models: { id: string; label: string }[] }> {
    const models = await this.aiBotService.listModels(dto.provider, dto.apiKey);
    return { models };
  }

  @Post('configs/:id/list-models')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'List models using the stored key for this config (per-config key or saved provider key)' })
  async listModelsForConfig(@Param('id') id: string): Promise<{ models: { id: string; label: string }[] }> {
    const config = await this.aiBotService.findOne(id);
    const apiKey = config.apiKey || await this.aiBotService.getProviderApiKey(config.aiProvider || 'openai');
    if (!apiKey) return { models: [] };
    const models = await this.aiBotService.listModels(config.aiProvider || 'openai', apiKey);
    return { models };
  }

  // ─── Test ───────────────────────────────────────────────────────────────────

  @Post('configs/:id/test')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Test AI bot with a message' })
  async test(
    @Param('id') id: string,
    @Body() dto: TestAiBotDto,
  ): Promise<{ reply: string; error?: string; isError?: boolean }> {
    const config = await this.aiBotService.findOne(id);
    const apiKey = config.apiKey || await this.aiBotService.getProviderApiKey(config.aiProvider || 'openai');
    if (!apiKey) {
      return {
        reply: config.fallbackMessage || 'Sorry, I am unable to respond right now.',
        error: 'No API key found. Add one in Provider Keys or set a per-config key.',
        isError: true,
      };
    }
    try {
      const reply = await this.aiBotService.generateReplyRaw(config, dto.message);
      return { reply };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        reply: config.fallbackMessage || 'Sorry, I am unable to respond right now.',
        error: msg,
        isError: true,
      };
    }
  }
}
