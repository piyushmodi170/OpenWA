import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiBotConfig } from './entities/ai-bot-config.entity';
import { AiProviderKey } from './entities/ai-provider-key.entity';
import { AiBotService } from './ai-bot.service';
import { AiBotController } from './ai-bot.controller';
import { MessageModule } from '../message/message.module';
import { AiEmployeesModule } from '../ai-employees/ai-employees.module';
import { AiTrainingModule } from '../ai-training/ai-training.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiBotConfig, AiProviderKey], 'data'),
    forwardRef(() => MessageModule),
    AiEmployeesModule,
    AiTrainingModule,
  ],
  controllers: [AiBotController],
  providers: [AiBotService],
  exports: [AiBotService],
})
export class AiBotModule {}
