import { Controller, Get, Post, Delete, Param, Body, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ConversationIntelligenceService } from './conversation-intelligence.service';
import { AnalyzeConversationDto } from './dto/conversation-intelligence.dto';
import { RequireRole } from '../auth/decorators/auth.decorators';
import { ApiKeyRole } from '../auth/entities/api-key.entity';

@ApiTags('conversation-intelligence')
@Controller('conversation-intelligence')
export class ConversationIntelligenceController {
  constructor(private readonly service: ConversationIntelligenceService) {}

  @Get()
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'List all conversation analyses' })
  @ApiQuery({ name: 'sessionId', required: false })
  async findAll(@Query('sessionId') sessionId?: string) {
    return this.service.findAll(sessionId);
  }

  @Post('analyze')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Analyze a conversation with AI' })
  async analyze(@Body() dto: AnalyzeConversationDto) {
    return this.service.analyze(dto);
  }

  @Get(':sessionId/:chatId')
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'Get analysis for a specific chat' })
  async findByChatId(@Param('sessionId') sessionId: string, @Param('chatId') chatId: string) {
    return this.service.findByChatId(sessionId, chatId);
  }

  @Delete(':id')
  @RequireRole(ApiKeyRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a conversation analysis' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.service.delete(id);
  }
}
