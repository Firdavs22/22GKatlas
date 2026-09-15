import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class MonthQuery {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) month!: string;
  @IsOptional() @IsString() @MaxLength(100) userId?: string;
}
export class TimeEntryDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/) date!: string;
  @IsInt() @Min(0) revision!: number;
  @IsOptional() @IsBoolean() clearPlan?: boolean;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) plannedStart?: string;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) plannedEnd?: string;
  @IsOptional() @IsInt() @Min(0) @Max(1440) breakMinutes?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1440) actualMinutes?: number;
  @IsIn(['work', 'sick', 'vacation', 'absent', 'day_off']) status!: string;
  @IsString() @MaxLength(1000) note!: string;
}
export class EventQuery {
  @IsISO8601({ strict: true }) from!: string;
  @IsISO8601({ strict: true }) to!: string;
}
export class TeamEventDto {
  @IsString() @MinLength(1) @MaxLength(160) title!: string;
  @IsString() @MaxLength(5000) description!: string;
  @IsIn(['meeting', 'event', 'plan']) kind!: string;
  @IsISO8601({ strict: true }) startsAt!: string;
  @IsISO8601({ strict: true }) endsAt!: string;
  @IsIn(['staff', 'participants']) visibility!: string;
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  participantIds!: string[];
  @IsInt() @IsIn([0, 15, 30, 60, 1440]) reminderMinutes!: number;
  @IsOptional() @IsInt() @Min(1) revision?: number;
}
export class RevisionDto {
  @IsInt() @Min(1) revision!: number;
}
