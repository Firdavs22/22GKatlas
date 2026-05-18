import { Body, Controller, Delete, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MeService } from './me.service';
import { UpdateMeDto, ChangePasswordDto, DeleteAccountDto } from './dto/me.dto';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly svc: MeService) {}

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
}
