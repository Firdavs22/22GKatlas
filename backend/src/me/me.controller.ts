import { Body, Controller, Delete, Get, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MeService } from './me.service';
import { ExportService } from './export.service';
import { UpdateMeDto, ChangePasswordDto, DeleteAccountDto } from './dto/me.dto';
import type { Response } from 'express';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(
    private readonly svc: MeService,
    private readonly exportSvc: ExportService,
  ) {}

  @Get()
  get(@CurrentUser() user: { id: string }) {
    return this.svc.getMe(user.id);
  }

  @Put()
  update(@CurrentUser() user: { id: string }, @Body() dto: UpdateMeDto) {
    return this.svc.update(user.id, dto);
  }

  @Put('password')
  changePassword(@CurrentUser() user: { id: string }, @Body() dto: ChangePasswordDto) {
    return this.svc.changePassword(user.id, dto.oldPassword, dto.newPassword);
  }

  @Delete()
  deleteAccount(@CurrentUser() user: { id: string }, @Body() dto: DeleteAccountDto) {
    return this.svc.deleteAccount(user.id, dto.password, dto.confirmation);
  }

  @Post('onboarding/complete')
  completeOnboarding(@CurrentUser() user: { id: string }) {
    return this.svc.completeOnboarding(user.id);
  }

  @Post('onboarding/reset')
  resetOnboarding(@CurrentUser() user: { id: string }) {
    return this.svc.resetOnboarding(user.id);
  }

  /**
   * Personal-data export (152-ФЗ). Streams a ZIP archive with profile + child data + photos.
   * Throttled to avoid abuse — generation is expensive (downloads every photo).
   */
  @Get('export')
  @Throttle({ default: { limit: 3, ttl: 3600_000 } }) // 3 exports / hour per user
  exportData(@CurrentUser() user: { id: string }, @Res() res: Response) {
    return this.exportSvc.streamExport(user.id, res);
  }
}
