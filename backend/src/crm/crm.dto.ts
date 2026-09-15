import { Type, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
export class LeadDto {
  @IsString() @MinLength(1) @MaxLength(120) parentName!: string;
  @IsString() @MaxLength(40) phone!: string;
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email?: string;
  @IsString() @MaxLength(160) childName!: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) birthDate?: string;
  @IsString() @MaxLength(160) direction!: string;
  @IsIn(['low', 'normal', 'high']) priority!: string;
  @IsOptional() @IsString() @MaxLength(100) ownerId?: string;
  @IsString() @MaxLength(120) source!: string;
  @IsString() @MaxLength(300) utmSource!: string;
  @IsString() @MaxLength(300) utmMedium!: string;
  @IsString() @MaxLength(300) utmCampaign!: string;
  @IsString() @MaxLength(10000) notes!: string;
  @IsOptional() @IsISO8601({ strict: true }) nextActionAt?: string;
  @IsString() @MaxLength(200) nextAction!: string;
  @IsOptional() @IsInt() @Min(1) revision?: number;
}
export class StageDto {
  @IsString() @MinLength(1) @MaxLength(80) title!: string;
  @IsIn(['active', 'deferred', 'lost']) kind!: string;
}
export class StageOrderDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  ids!: string[];
}
export class MoveDto {
  @IsString() @MaxLength(100) stageId!: string;
  @IsInt() @Min(1) revision!: number;
}
export class ActivityDto {
  @IsIn(['note', 'call', 'message', 'meeting', 'tour']) kind!: string;
  @IsString() @MinLength(1) @MaxLength(5000) text!: string;
  @IsOptional() @IsISO8601({ strict: true }) nextActionAt?: string;
  @IsOptional() @IsString() @MaxLength(200) nextAction?: string;
  @IsBoolean() addToCalendar!: boolean;
  @IsInt() @Min(1) revision!: number;
}
export class EnrollDto {
  @IsString() @MinLength(1) @MaxLength(100) groupId!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) startsOn!: string;
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  monthlyFee?: number;
  @IsString() @MinLength(1) @MaxLength(160) childName!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) birthDate!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(100) parentId?: string;
  @IsOptional() @IsString() @MaxLength(100) childId?: string;
  @IsInt() @Min(1) revision!: number;
}
export class LeadQuery {
  @IsOptional() @IsIn(['open', 'won', 'all']) state?: string;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsString() @MaxLength(100) ownerId?: string;
}
export class EnrollmentCheckDto {
  @IsOptional() @IsString() @MaxLength(100) groupId?: string;
  @IsOptional() @IsString() @MaxLength(10) startsOn?: string;
  @IsOptional() @IsString() @MaxLength(160) childName?: string;
  @IsOptional() @IsString() @MaxLength(10) birthDate?: string;
  @IsOptional() @IsString() @MaxLength(254) email?: string;
  @IsOptional() @IsString() @MaxLength(100) parentId?: string;
  @IsOptional() @IsString() @MaxLength(100) childId?: string;
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  monthlyFee?: number;
}
