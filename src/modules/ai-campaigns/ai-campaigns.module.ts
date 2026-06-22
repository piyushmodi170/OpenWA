import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiCampaign } from './entities/ai-campaign.entity';
import { CampaignLead } from './entities/campaign-lead.entity';
import { AiCampaignsService } from './ai-campaigns.service';
import { AiCampaignsController } from './ai-campaigns.controller';
import { MessageModule } from '../message/message.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiCampaign, CampaignLead], 'data'),
    forwardRef(() => MessageModule),
  ],
  controllers: [AiCampaignsController],
  providers: [AiCampaignsService],
  exports: [AiCampaignsService],
})
export class AiCampaignsModule {}
