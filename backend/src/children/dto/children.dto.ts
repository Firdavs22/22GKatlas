import { IsArray, IsBoolean, IsEnum, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { HomeTaskStatus, NoteType, NoteVisibility, ProgressStage } from '@prisma/client';

export class UpdateProgressDto {
  @IsString()
  skillId!: string;

  @IsEnum(ProgressStage)
  stage!: ProgressStage;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class CreateObservationDto {
  @IsString()
  @MaxLength(10_000)
  text!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsOptional()
  @IsBoolean()
  privateToTeacher?: boolean;
}

export class CreatePortfolioItemDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  fileUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}

export class CreateNoteDto {
  @IsEnum(NoteType)
  type!: NoteType;

  @IsString()
  @MaxLength(20_000)
  text!: string;

  @IsEnum(NoteVisibility)
  visibility!: NoteVisibility;

  @IsOptional()
  @IsISO8601()
  date?: string;
}

export class CreateHomeTaskDto {
  @IsString()
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  description?: string;

  @IsOptional()
  @IsString()
  skillId?: string;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;
}

export class UpdateHomeTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  description?: string;

  @IsOptional()
  @IsEnum(HomeTaskStatus)
  status?: HomeTaskStatus;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;
}
