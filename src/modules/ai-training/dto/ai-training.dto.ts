import { IsString, IsBoolean, IsOptional, IsNumber, IsIn, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateKnowledgeDocumentDto {
  @ApiProperty({ description: 'Employee ID to scope this to, null = global' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({ description: 'Document title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Document content text' })
  @IsString()
  content: string;

  @ApiProperty({ enum: ['text', 'faq', 'chat_history', 'sop', 'product_catalog', 'sales_script', 'policy', 'custom'], default: 'text' })
  @IsOptional()
  @IsIn(['text', 'faq', 'chat_history', 'sop', 'product_catalog', 'sales_script', 'policy', 'custom'])
  type?: string;

  @ApiProperty({ description: 'Source of the document', default: '' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ description: 'JSON array of tags', default: '[]' })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateKnowledgeDocumentDto {
  @IsOptional() @IsString() employeeId?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() tags?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

export class CreateTrainingExampleDto {
  @ApiProperty({ description: 'Employee ID to scope this to, null = global' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({ description: 'When user says something like this...' })
  @IsString()
  trigger: string;

  @ApiProperty({ description: 'AI should respond like this' })
  @IsString()
  response: string;

  @ApiProperty({ description: 'Category label', default: 'general' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Priority (1-10), higher = more important', default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  priority?: number;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateTrainingExampleDto {
  @IsOptional() @IsString() employeeId?: string;
  @IsOptional() @IsString() trigger?: string;
  @IsOptional() @IsString() response?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsNumber() @Min(1) @Max(10) priority?: number;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

export class CreateTrainingRuleDto {
  @ApiProperty({ description: 'Employee ID to scope this to, null = global' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({ description: 'The rule instruction' })
  @IsString()
  rule: string;

  @ApiProperty({ enum: ['never', 'always', 'conditional'], default: 'never' })
  @IsOptional()
  @IsIn(['never', 'always', 'conditional'])
  type?: string;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateTrainingRuleDto {
  @IsOptional() @IsString() employeeId?: string;
  @IsOptional() @IsString() rule?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
}
