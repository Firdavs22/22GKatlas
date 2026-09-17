import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateChatDto {
  @IsString() @MinLength(1) @MaxLength(100) targetUserId!: string;
  // Accepted for older clients; the server derives the actual type from roles.
  @IsOptional() @IsString() @MaxLength(50) type?: string;
}

export class SendMessageDto {
  @IsString() @MaxLength(10000) text!: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  attachments?: string[];
}
