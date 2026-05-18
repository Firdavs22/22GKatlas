import { IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { FeedItemType, FeedScope } from '@prisma/client';

export class CreateFeedItemDto {
  @IsEnum(FeedItemType)
  type!: FeedItemType;

  @IsEnum(FeedScope)
  scope!: FeedScope;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  text?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  mediaUrls?: string[];

  @IsOptional()
  @IsString()
  childId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;
}
