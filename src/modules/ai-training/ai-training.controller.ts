import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AiTrainingService } from './ai-training.service';
import {
  CreateKnowledgeDocumentDto, UpdateKnowledgeDocumentDto,
  CreateTrainingExampleDto, UpdateTrainingExampleDto,
  CreateTrainingRuleDto, UpdateTrainingRuleDto,
} from './dto/ai-training.dto';
import { RequireRole } from '../auth/decorators/auth.decorators';
import { ApiKeyRole } from '../auth/entities/api-key.entity';

@ApiTags('ai-training')
@Controller('ai-training')
export class AiTrainingController {
  constructor(private readonly service: AiTrainingService) {}

  // ─── Knowledge Documents ──────────────────────────────────────────────────

  @Get('documents')
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'List knowledge documents' })
  @ApiQuery({ name: 'employeeId', required: false })
  async findAllDocuments(@Query('employeeId') employeeId?: string) {
    return this.service.findAllDocuments(employeeId);
  }

  @Post('documents')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Create a knowledge document' })
  async createDocument(@Body() dto: CreateKnowledgeDocumentDto) {
    return this.service.createDocument(dto);
  }

  @Get('documents/:id')
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'Get knowledge document by ID' })
  async findOneDocument(@Param('id') id: string) {
    return this.service.findOneDocument(id);
  }

  @Put('documents/:id')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Update knowledge document' })
  async updateDocument(@Param('id') id: string, @Body() dto: UpdateKnowledgeDocumentDto) {
    return this.service.updateDocument(id, dto);
  }

  @Delete('documents/:id')
  @RequireRole(ApiKeyRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete knowledge document' })
  async deleteDocument(@Param('id') id: string): Promise<void> {
    return this.service.deleteDocument(id);
  }

  // ─── Training Examples ─────────────────────────────────────────────────────

  @Get('examples')
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'List training examples' })
  @ApiQuery({ name: 'employeeId', required: false })
  async findAllExamples(@Query('employeeId') employeeId?: string) {
    return this.service.findAllExamples(employeeId);
  }

  @Post('examples')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Create a training example' })
  async createExample(@Body() dto: CreateTrainingExampleDto) {
    return this.service.createExample(dto);
  }

  @Put('examples/:id')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Update training example' })
  async updateExample(@Param('id') id: string, @Body() dto: UpdateTrainingExampleDto) {
    return this.service.updateExample(id, dto);
  }

  @Delete('examples/:id')
  @RequireRole(ApiKeyRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete training example' })
  async deleteExample(@Param('id') id: string): Promise<void> {
    return this.service.deleteExample(id);
  }

  // ─── Training Rules ────────────────────────────────────────────────────────

  @Get('rules')
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'List training rules' })
  @ApiQuery({ name: 'employeeId', required: false })
  async findAllRules(@Query('employeeId') employeeId?: string) {
    return this.service.findAllRules(employeeId);
  }

  @Post('rules')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Create a training rule' })
  async createRule(@Body() dto: CreateTrainingRuleDto) {
    return this.service.createRule(dto);
  }

  @Put('rules/:id')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Update training rule' })
  async updateRule(@Param('id') id: string, @Body() dto: UpdateTrainingRuleDto) {
    return this.service.updateRule(id, dto);
  }

  @Delete('rules/:id')
  @RequireRole(ApiKeyRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete training rule' })
  async deleteRule(@Param('id') id: string): Promise<void> {
    return this.service.deleteRule(id);
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  @Get('stats')
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'Get training statistics and quality score' })
  @ApiQuery({ name: 'employeeId', required: false })
  async getStats(@Query('employeeId') employeeId?: string) {
    return this.service.getTrainingStats(employeeId);
  }
}
