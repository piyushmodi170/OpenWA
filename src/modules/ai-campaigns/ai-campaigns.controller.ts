import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AiCampaignsService } from './ai-campaigns.service';
import { CreateAiCampaignDto, UpdateAiCampaignDto, ImportLeadsDto, PersonalizeLeadsDto } from './dto/ai-campaign.dto';
import { RequireRole } from '../auth/decorators/auth.decorators';
import { ApiKeyRole } from '../auth/entities/api-key.entity';

@ApiTags('ai-campaigns')
@Controller('ai-campaigns')
export class AiCampaignsController {
  constructor(private readonly service: AiCampaignsService) {}

  @Get()
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'List all AI campaigns' })
  async findAll() { return this.service.findAll(); }

  @Post()
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Create an AI campaign' })
  async create(@Body() dto: CreateAiCampaignDto) { return this.service.create(dto); }

  @Get(':id')
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'Get campaign by ID' })
  async findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Put(':id')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Update campaign' })
  async update(@Param('id') id: string, @Body() dto: UpdateAiCampaignDto) { return this.service.update(id, dto); }

  @Delete(':id')
  @RequireRole(ApiKeyRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete campaign' })
  async delete(@Param('id') id: string): Promise<void> { return this.service.delete(id); }

  @Get(':id/leads')
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'Get campaign leads' })
  async getLeads(@Param('id') id: string) { return this.service.getLeads(id); }

  @Post(':id/leads/import')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Import leads into campaign' })
  async importLeads(@Param('id') id: string, @Body() dto: ImportLeadsDto) { return this.service.importLeads(id, dto); }

  @Delete(':id/leads/:leadId')
  @RequireRole(ApiKeyRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a lead from campaign' })
  async deleteLead(@Param('id') id: string, @Param('leadId') leadId: string): Promise<void> { return this.service.deleteLead(id, leadId); }

  @Post(':id/personalize')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'AI-personalize messages for all pending leads' })
  async personalizeLeads(@Param('id') id: string, @Body() dto: PersonalizeLeadsDto) { return this.service.personalizeLeads(id, dto.apiKey); }

  @Post(':id/launch')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Launch campaign — start sending to ready leads' })
  async launch(@Param('id') id: string) { return this.service.launch(id); }

  @Post(':id/pause')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Pause a running campaign' })
  async pause(@Param('id') id: string) { return this.service.pause(id); }

  @Get(':id/analytics')
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'Get campaign analytics' })
  async getAnalytics(@Param('id') id: string) { return this.service.getAnalytics(id); }
}
