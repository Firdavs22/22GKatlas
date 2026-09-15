import { IsEmail, IsIn, IsInt, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

export class ChildSafetyDto {
  @IsInt() @Min(0)
  safetyRevision!: number;

  @IsString() @MaxLength(4000)
  forbiddenFoods!: string;

  @IsString() @MaxLength(254) @ValidateIf((_object, value) => value !== '') @IsEmail()
  contactEmail!: string;

  @IsIn(['unknown', 'allowed', 'forbidden'])
  socialPublicationStatus!: string;

  @IsString() @MaxLength(4000)
  socialPublicationComment!: string;
}
