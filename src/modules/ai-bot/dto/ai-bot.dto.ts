import { IsString, IsBoolean, IsOptional, IsNumber, IsIn, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAiBotConfigDto {
  @ApiProperty({ description: 'Session ID this config applies to, use * for all sessions', default: '*' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({ enum: ['openai', 'gemini'], default: 'openai' })
  @IsOptional()
  @IsIn(['openai', 'gemini'])
  aiProvider?: string;

  @ApiProperty({ description: 'API key for the selected AI provider (stored per-config)', required: false })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiProperty({ enum: ['company', 'casual'], default: 'company' })
  @IsOptional()
  @IsIn(['company', 'casual'])
  botType?: string;

  @ApiProperty({ description: 'Company name (required for company bots)', default: '' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ description: 'Company description / what you do', default: '' })
  @IsOptional()
  @IsString()
  companyDescription?: string;

  @ApiProperty({ description: 'JSON array of service names', default: '[]' })
  @IsOptional()
  @IsString()
  companyServices?: string;

  @ApiProperty({ description: 'JSON array of FAQ objects {q, a}', default: '[]' })
  @IsOptional()
  @IsString()
  companyFaqs?: string;

  @ApiProperty({ enum: ['friendly', 'professional', 'formal'], default: 'friendly' })
  @IsOptional()
  @IsIn(['friendly', 'professional', 'formal'])
  tone?: string;

  @ApiProperty({ description: 'Language to respond in, auto = match user', default: 'auto' })
  @IsOptional()
  @IsString()
  responseLanguage?: string;

  @ApiProperty({ description: 'Custom system prompt (overrides auto-generated)', required: false })
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiProperty({ description: 'Model to use (gpt-4o-mini, gemini-1.5-flash, etc.)', default: 'gpt-4o-mini' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ default: 500 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(4000)
  maxTokens?: number;

  @ApiProperty({ description: 'Message to send when AI fails', required: false })
  @IsOptional()
  @IsString()
  fallbackMessage?: string;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateAiBotConfigDto {
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsIn(['openai', 'gemini']) aiProvider?: string;
  @IsOptional() @IsString() apiKey?: string;
  @IsOptional() @IsIn(['company', 'casual']) botType?: string;
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() companyDescription?: string;
  @IsOptional() @IsString() companyServices?: string;
  @IsOptional() @IsString() companyFaqs?: string;
  @IsOptional() @IsIn(['friendly', 'professional', 'formal']) tone?: string;
  @IsOptional() @IsString() responseLanguage?: string;
  @IsOptional() @IsString() systemPrompt?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsNumber() @Min(50) @Max(4000) maxTokens?: number;
  @IsOptional() @IsString() fallbackMessage?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

export class TestAiBotDto {
  @ApiProperty({ description: 'Test message to send to the AI' })
  @IsString()
  message: string;
}

export class ListModelsDto {
  @ApiProperty({ enum: ['openai', 'gemini'] })
  @IsIn(['openai', 'gemini'])
  provider: string;

  @ApiProperty({ description: 'API key to use for listing models' })
  @IsString()
  apiKey: string;
}

export class SaveProviderKeyDto {
  @ApiProperty({ enum: ['openai', 'gemini'] })
  @IsIn(['openai', 'gemini'])
  provider: string;

  @ApiProperty({ description: 'Human-readable label for this key', required: false })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ description: 'The API key value' })
  @IsString()
  apiKey: string;
}
