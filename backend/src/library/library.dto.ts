import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
export class DocumentDto {
  @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @IsIn(['policy', 'manual', 'curriculum']) kind!: string;
  @IsString() @MaxLength(100000) body!: string;
  @IsIn(['all', 'staff', 'teachers', 'parents', 'specialists'])
  audience!: string;
  @IsBoolean() published!: boolean;
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  attachments!: string[];
  @IsArray()
  @ArrayMaxSize(30)
  @IsUrl(
    { protocols: ['https', 'http'], require_protocol: true },
    { each: true },
  )
  links!: string[];
  @IsOptional() @IsInt() @Min(1) revision?: number;
}

export class ReviewDocumentDto {
  @IsInt() @Min(1) revision!: number;
  @IsIn(['approve', 'return']) decision!: 'approve' | 'return';
  @IsString() @MaxLength(3000) comment!: string;
  @IsIn(['all', 'staff', 'teachers', 'parents', 'specialists'])
  audience!: string;
}
