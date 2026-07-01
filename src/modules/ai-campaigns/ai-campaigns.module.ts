import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiCampaign } from './entities/ai-campaign.entity';
import { CampaignLead } from './entities/campaign-lead.entity';
import { AiCampaignsService } from './ai-campaigns.service';
import { AiCampaignsController } from './ai-campaigns.controller';
import { MessageModule } from '../message/message.module';
import { AiEmployeesModule } from '../ai-employees/ai-employees.module';
import { AiTrainingModule } from '../ai-training/ai-training.module';
import { AiBotModule } from '../ai-bot/ai-bot.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiCampaign, CampaignLead], 'data'),
    forwardRef(() => MessageModule),
    forwardRef(() => AiBotModule),
    AiEmployeesModule,
    AiTrainingModule,
  ],
  controllers: [AiCampaignsController],
  providers: [AiCampaignsService],
  exports: [AiCampaignsService],
})
export class AiCampaignsModule {}
