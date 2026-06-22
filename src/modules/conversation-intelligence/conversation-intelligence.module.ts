import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationAnalysis } from './entities/conversation-analysis.entity';
import { ConversationIntelligenceService } from './conversation-intelligence.service';
import { ConversationIntelligenceController } from './conversation-intelligence.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ConversationAnalysis], 'data')],
  controllers: [ConversationIntelligenceController],
  providers: [ConversationIntelligenceService],
  exports: [ConversationIntelligenceService],
})
export class ConversationIntelligenceModule {}
