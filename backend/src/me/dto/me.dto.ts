import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  oldPassword!: string;

  @IsString()
  @MinLength(8, { message: 'Новый пароль должен быть не короче 8 символов' })
  @MaxLength(200)
  newPassword!: string;
}

export class DeleteAccountDto {
  /** Current password — proof the request is genuinely the account owner. */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password!: string;

  /** Explicit phrase the user must type to confirm. UI shows what to type. */
  @IsString()
  confirmation!: string;
}
