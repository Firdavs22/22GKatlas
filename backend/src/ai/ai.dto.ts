import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class LegacyReferenceDto {
  @IsOptional() @IsString() @MaxLength(100) id?: string;
  @IsOptional() @IsString() @MaxLength(500) title?: string;
}

export class GenerateObservationDto {
  @IsOptional()
  @IsIn([
    'general',
    'practical',
    'sensory',
    'math',
    'language',
    'world',
    'social',
    'movement',
  ])
  topic?: string;
  @IsOptional() @IsString() @MaxLength(100) childId?: string;
  // Old clients still send these fields. They are never forwarded to a provider.
  @IsOptional() @IsString() @MaxLength(500) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) hint?: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => LegacyReferenceDto)
  skill?: LegacyReferenceDto;
  @IsOptional()
  @ValidateNested()
  @Type(() => LegacyReferenceDto)
  area?: LegacyReferenceDto;
  @IsOptional() @IsNumber() @Min(0) @Max(30) childAgeYears?: number;
}
