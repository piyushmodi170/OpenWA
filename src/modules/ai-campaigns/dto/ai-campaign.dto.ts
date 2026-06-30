import { IsString, IsBoolean, IsOptional, IsNumber, IsIn, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CampaignLeadDto {
  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty({ default: '' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Custom data for personalization as JSON object string', default: '{}' })
  @IsOptional()
  @IsString()
  customData?: string;
}

export class CreateAiCampaignDto {
  @ApiProperty({ description: 'Campaign name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Campaign goal / objective', default: '' })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiProperty({ description: 'Session ID to send from', default: '*' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({ description: 'AI Employee ID to use for writing messages', required: false })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({ description: 'Base message template (use {{name}} for lead name, {{custom}} for custom fields)', default: '' })
  @IsOptional()
  @IsString()
  messageTemplate?: string;

  @ApiProperty({ description: 'Use AI to personalize each message', default: true })
  @IsOptional()
  @IsBoolean()
  useAiPersonalization?: boolean;

  @ApiProperty({ enum: ['openai', 'gemini'], default: 'openai' })
  @IsOptional()
  @IsIn(['openai', 'gemini'])
  aiProvider?: string;

  @ApiProperty({ description: 'AI model to use', default: 'gpt-4o-mini' })
  @IsOptional()
  @IsString()
  aiModel?: string;

  @ApiProperty({ description: 'JSON array of follow-up step objects {delay: ms, message: string}', default: '[]' })
  @IsOptional()
  @IsString()
  followUpSequence?: string;

  @ApiProperty({ description: 'Delay between messages in ms', default: 3000 })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(60000)
  delayBetweenMessages?: number;

  @ApiProperty({ description: 'Stop sending follow-ups when lead replies', default: true })
  @IsOptional()
  @IsBoolean()
  stopOnReply?: boolean;

  @ApiProperty({ description: 'ISO date string to schedule campaign', required: false })
  @IsOptional()
  @IsString()
  scheduledAt?: string;
}

export class UpdateAiCampaignDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() goal?: string;
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsString() employeeId?: string;
  @IsOptional() @IsString() messageTemplate?: string;
  @IsOptional() @IsBoolean() useAiPersonalization?: boolean;
  @IsOptional() @IsIn(['openai', 'gemini']) aiProvider?: string;
  @IsOptional() @IsString() aiModel?: string;
  @IsOptional() @IsString() followUpSequence?: string;
  @IsOptional() @IsNumber() @Min(1000) @Max(60000) delayBetweenMessages?: number;
  @IsOptional() @IsBoolean() stopOnReply?: boolean;
  @IsOptional() @IsString() scheduledAt?: string;
}

export class ImportLeadsDto {
  @ApiProperty({ type: [CampaignLeadDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignLeadDto)
  leads: CampaignLeadDto[];
}

export class PersonalizeLeadsDto {
  @ApiProperty({ description: 'API key for AI provider', required: false })
  @IsOptional()
  @IsString()
  apiKey?: string;
}
