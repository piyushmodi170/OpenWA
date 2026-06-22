import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeConversationDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Chat ID (phone number or group ID)' })
  @IsString()
  chatId: string;

  @ApiProperty({ description: 'Contact display name', default: '' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiProperty({ description: 'Conversation text to analyze' })
  @IsString()
  conversationText: string;

  @ApiProperty({ description: 'AI provider to use', default: 'openai' })
  @IsOptional()
  @IsString()
  aiProvider?: string;

  @ApiProperty({ description: 'AI model to use', default: 'gpt-4o-mini' })
  @IsOptional()
  @IsString()
  model?: string;
}
