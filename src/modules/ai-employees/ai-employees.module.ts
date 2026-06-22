import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiEmployee } from './entities/ai-employee.entity';
import { AiEmployeesService } from './ai-employees.service';
import { AiEmployeesController } from './ai-employees.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AiEmployee], 'data')],
  controllers: [AiEmployeesController],
  providers: [AiEmployeesService],
  exports: [AiEmployeesService],
})
export class AiEmployeesModule {}
