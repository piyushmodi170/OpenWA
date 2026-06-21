import { IsString, IsBoolean, IsOptional, IsNumber, IsIn, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAiBotConfigDto {
  @ApiProperty({ description: 'Session ID this config applies to, use * for all sessions', default: '*' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({ description: 'Company name' })
  @IsString()
  companyName: string;

  @ApiProperty({ description: 'Company description / what you do' })
  @IsString()
  companyDescription: string;

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
  systemPromptOverride?: string;

  @ApiProperty({ default: 'gpt-4o-mini' })
  @IsOptional()
  @IsString()
  openaiModel?: string;

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

  @ApiProperty({ description: 'Greeting message sent when bot starts', required: false })
  @IsOptional()
  @IsString()
  greetingMessage?: string;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateAiBotConfigDto {
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() companyDescription?: string;
  @IsOptional() @IsString() companyServices?: string;
  @IsOptional() @IsString() companyFaqs?: string;
  @IsOptional() @IsIn(['friendly', 'professional', 'formal']) tone?: string;
  @IsOptional() @IsString() responseLanguage?: string;
  @IsOptional() @IsString() systemPromptOverride?: string;
  @IsOptional() @IsString() openaiModel?: string;
  @IsOptional() @IsNumber() @Min(50) @Max(4000) maxTokens?: number;
  @IsOptional() @IsString() fallbackMessage?: string;
  @IsOptional() @IsString() greetingMessage?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

export class TestAiBotDto {
  @ApiProperty({ description: 'Test message to send to the AI' })
  @IsString()
  message: string;
}
