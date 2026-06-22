import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiCampaign } from './entities/ai-campaign.entity';
import { CampaignLead } from './entities/campaign-lead.entity';
import { AiCampaignsService } from './ai-campaigns.service';
import { AiCampaignsController } from './ai-campaigns.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AiCampaign, CampaignLead], 'data')],
  controllers: [AiCampaignsController],
  providers: [AiCampaignsService],
  exports: [AiCampaignsService],
})
export class AiCampaignsModule {}
