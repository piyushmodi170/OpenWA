import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeDocument } from './entities/knowledge-document.entity';
import { TrainingExample } from './entities/training-example.entity';
import { TrainingRule } from './entities/training-rule.entity';
import { AiTrainingService } from './ai-training.service';
import { AiTrainingController } from './ai-training.controller';

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgeDocument, TrainingExample, TrainingRule], 'data')],
  controllers: [AiTrainingController],
  providers: [AiTrainingService],
  exports: [AiTrainingService],
})
export class AiTrainingModule {}
