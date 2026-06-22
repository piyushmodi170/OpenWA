import { IsString, IsBoolean, IsOptional, IsNumber, IsIn, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAiEmployeeDto {
  @ApiProperty({ description: 'Employee name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Emoji or URL avatar', default: '🤖' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ enum: ['sales_rep', 'support_agent', 'appointment_setter', 'follow_up_manager', 'marketing_assistant', 'research_assistant', 'custom'], default: 'support_agent' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ description: 'Short description of the role', default: '' })
  @IsOptional()
  @IsString()
  roleDescription?: string;

  @ApiProperty({ description: 'JSON array of goals', default: '[]' })
  @IsOptional()
  @IsString()
  goals?: string;

  @ApiProperty({ description: 'Personality description', default: '' })
  @IsOptional()
  @IsString()
  personality?: string;

  @ApiProperty({ enum: ['friendly', 'professional', 'formal', 'casual', 'empathetic'], default: 'friendly' })
  @IsOptional()
  @IsString()
  tone?: string;

  @ApiProperty({ description: 'Response language, auto = match user', default: 'auto' })
  @IsOptional()
  @IsString()
  responseLanguage?: string;

  @ApiProperty({ description: 'Custom system prompt override', required: false })
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiProperty({ enum: ['openai', 'gemini'], default: 'openai' })
  @IsOptional()
  @IsIn(['openai', 'gemini'])
  aiProvider?: string;

  @ApiProperty({ description: 'AI model to use', default: 'gpt-4o-mini' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ default: 600 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(4000)
  maxTokens?: number;

  @ApiProperty({ description: 'JSON array of allowed topic strings', default: '[]' })
  @IsOptional()
  @IsString()
  allowedTopics?: string;

  @ApiProperty({ description: 'JSON array of blocked topic strings', default: '[]' })
  @IsOptional()
  @IsString()
  blockedTopics?: string;

  @ApiProperty({ description: 'JSON array of KPI strings', default: '[]' })
  @IsOptional()
  @IsString()
  kpis?: string;

  @ApiProperty({ description: 'Session ID, * for all sessions', default: '*' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateAiEmployeeDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() avatar?: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsString() roleDescription?: string;
  @IsOptional() @IsString() goals?: string;
  @IsOptional() @IsString() personality?: string;
  @IsOptional() @IsString() tone?: string;
  @IsOptional() @IsString() responseLanguage?: string;
  @IsOptional() @IsString() systemPrompt?: string;
  @IsOptional() @IsIn(['openai', 'gemini']) aiProvider?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsNumber() @Min(50) @Max(4000) maxTokens?: number;
  @IsOptional() @IsString() allowedTopics?: string;
  @IsOptional() @IsString() blockedTopics?: string;
  @IsOptional() @IsString() kpis?: string;
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
}
