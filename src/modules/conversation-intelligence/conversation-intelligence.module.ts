import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationAnalysis } from './entities/conversation-analysis.entity';
import { ConversationIntelligenceService } from './conversation-intelligence.service';
import { ConversationIntelligenceController } from './conversation-intelligence.controller';
import { AiBotModule } from '../ai-bot/ai-bot.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConversationAnalysis], 'data'),
    forwardRef(() => AiBotModule),
  ],
  controllers: [ConversationIntelligenceController],
  providers: [ConversationIntelligenceService],
  exports: [ConversationIntelligenceService],
})
export class ConversationIntelligenceModule {}
