import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';

export class ChecklistItemDto {
  @Matches(/^[a-z0-9_-]{1,80}$/) id!: string;
  @IsString() @MinLength(1) @Matches(/\S/) @MaxLength(160) title!: string;
  @IsBoolean() required!: boolean;
  @IsBoolean() received!: boolean;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
export class ChecklistInputDto {
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique((item: ChecklistItemDto) => item.id)
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  items!: ChecklistItemDto[];
  @IsString() @MaxLength(2000) exceptionReason!: string;
}
export class SaveChecklistDto extends ChecklistInputDto {
  @IsInt() @Min(1) revision!: number;
}
export const DOCUMENT_CHECKLIST = [
  { id: 'signed_contract', title: 'Подписанный договор', required: true },
  {
    id: 'parent_passport',
    title: 'Паспорт родителя / законного представителя',
    required: true,
  },
  {
    id: 'birth_certificate',
    title: 'Свидетельство о рождении',
    required: true,
  },
  { id: 'medical_certificates', title: 'Медицинские справки', required: true },
  {
    id: 'personal_data_consent',
    title: 'Согласие на обработку персональных данных',
    required: false,
  },
  {
    id: 'pickup_authorization',
    title: 'Разрешение на получение ребенка представителями',
    required: false,
  },
];

export function reviewDocumentChecklist(value: unknown) {
  const raw =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const supplied = Array.isArray(raw.items)
    ? (raw.items as ChecklistItemDto[])
    : [];
  // Core documents cannot silently disappear from the checklist when a client
  // submits fewer items. An explicit exception is recorded for incomplete sets.
  const items = DOCUMENT_CHECKLIST.map((base) => {
    const item = supplied.find((i) => i?.id === base.id);
    return {
      ...base,
      received: item?.received === true,
      note: item?.note?.trim() || '',
    };
  });
  for (const item of supplied) {
    if (item && !DOCUMENT_CHECKLIST.some((base) => base.id === item.id)) {
      items.push({
        id: item.id,
        title: item.title.trim(),
        required: item.required,
        received: item.received,
        note: item.note?.trim() || '',
      });
    }
  }
  if (items.length > 30)
    throw new BadRequestException(
      'В чек-листе может быть до 30 документов, включая основные',
    );
  const missing = items
    .filter((item) => item.required && !item.received)
    .map((item) => item.title);
  const exceptionReason =
    typeof raw.exceptionReason === 'string' ? raw.exceptionReason.trim() : '';
  return {
    items,
    missing,
    exceptionReason,
    ready: !missing.length || exceptionReason.length >= 10,
  };
}
