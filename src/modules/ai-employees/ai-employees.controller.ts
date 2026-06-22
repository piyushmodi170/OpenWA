import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AiEmployeesService } from './ai-employees.service';
import { CreateAiEmployeeDto, UpdateAiEmployeeDto } from './dto/ai-employee.dto';
import { AiEmployee } from './entities/ai-employee.entity';
import { RequireRole } from '../auth/decorators/auth.decorators';
import { ApiKeyRole } from '../auth/entities/api-key.entity';

@ApiTags('ai-employees')
@Controller('ai-employees')
export class AiEmployeesController {
  constructor(private readonly service: AiEmployeesService) {}

  @Get()
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'List all AI employees' })
  async findAll(): Promise<AiEmployee[]> {
    return this.service.findAll();
  }

  @Post()
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Create an AI employee' })
  async create(@Body() dto: CreateAiEmployeeDto): Promise<AiEmployee> {
    return this.service.create(dto);
  }

  @Get(':id')
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'Get AI employee by ID' })
  async findOne(@Param('id') id: string): Promise<AiEmployee> {
    return this.service.findOne(id);
  }

  @Put(':id')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Update AI employee' })
  async update(@Param('id') id: string, @Body() dto: UpdateAiEmployeeDto): Promise<AiEmployee> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequireRole(ApiKeyRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete AI employee' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.service.delete(id);
  }
}
