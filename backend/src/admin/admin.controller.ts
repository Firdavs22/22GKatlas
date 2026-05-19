import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Res, UseGuards, UseInterceptors, UploadedFile, Req } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from '../auth/auth.service';
import { InviteStaffDto, UpdateStaffDto } from './dto/staff.dto';
import { InviteParentDto, UpdateParentDto } from './dto/parent.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private authService: AuthService,
  ) {}

  // ── GROUPS ────────────────────────────────────────────────
  @Get('groups')
  getGroups() { return this.adminService.getGroups(); }

  @Get('groups/:id')
  getGroup(@Param('id') id: string) { return this.adminService.getGroup(id); }

  @Post('groups')
  createGroup(@Body() dto: any) { return this.adminService.createGroup(dto); }

  @Put('groups/:id')
  updateGroup(@Param('id') id: string, @Body() dto: any) { return this.adminService.updateGroup(id, dto); }

  @Delete('groups/:id')
  deleteGroup(@Param('id') id: string) { return this.adminService.deleteGroup(id); }

  // ── CHILDREN ─────────────────────────────────────────────
  @Get('children')
  getChildren() { return this.adminService.getChildren(); }

  @Get('children/:id')
  getChild(@Param('id') id: string) { return this.adminService.getChild(id); }

  @Post('children')
  createChild(@Body() dto: any) { return this.adminService.createChild(dto, this.authService); }

  @Put('children/:id')
  updateChild(@Param('id') id: string, @Body() dto: any) { return this.adminService.updateChild(id, dto, this.authService); }

  @Delete('children/:id')
  archiveChild(@Param('id') id: string) { return this.adminService.archiveChild(id); }

  @Post('children/:id/enroll')
  enrollChild(@Param('id') id: string, @Body() dto: { groupId: string }) {
    return this.adminService.enrollChild(id, dto.groupId);
  }

  @Post('children/:id/assign-specialist')
  assignSpecialist(@Param('id') id: string, @Body() dto: { specialistId: string; role: any }) {
    return this.adminService.assignSpecialist(id, dto.specialistId, dto.role);
  }

  @Post('children/:id/invite-parent')
  inviteParent(@Param('id') id: string, @Body() dto: { email: string; name?: string }) {
    return this.adminService.inviteParent(id, dto.email, dto.name, this.authService);
  }

  // ── PARENTS ────────────────────────────────────────────────
  @Get('parents')
  getParents() { return this.adminService.getParents(); }

  @Post('parents/invite')
  inviteParentAccount(@Body() dto: InviteParentDto) {
    return this.adminService.inviteParentAccount(dto, this.authService);
  }

  @Put('parents/:id')
  updateParent(@Param('id') id: string, @Body() dto: UpdateParentDto) {
    return this.adminService.updateParent(id, dto);
  }

  @Post('parents/:id/invite-link')
  reissueParentInvite(@Param('id') id: string) {
    return this.adminService.reissueParentInvite(id, this.authService);
  }

  // ── STAFF ── superadmin-only ─────────────────────────────
  @Get('staff')
  @Roles('superadmin')
  getStaff() { return this.adminService.getStaff(); }

  @Get('staff/:id')
  @Roles('superadmin')
  getStaffById(@Param('id') id: string) { return this.adminService.getStaffById(id); }

  @Post('staff/invite')
  @Roles('superadmin')
  inviteStaff(@Body() dto: InviteStaffDto) {
    return this.adminService.inviteStaff(dto.email, dto.name, dto.role, this.authService);
  }

  @Put('staff/:id')
  @Roles('superadmin')
  updateStaff(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.adminService.updateStaff(id, dto);
  }

  @Patch('staff/:id/block')
  @Roles('superadmin')
  blockStaff(@Param('id') id: string, @Req() req: any) {
    return this.adminService.blockStaff(id, req.user.id);
  }

  @Patch('staff/:id/unblock')
  @Roles('superadmin')
  unblockStaff(@Param('id') id: string) {
    return this.adminService.unblockStaff(id);
  }

  @Delete('staff/:id')
  @Roles('superadmin')
  deleteStaff(@Param('id') id: string, @Req() req: any) {
    return this.adminService.softDeleteStaff(id, req.user.id);
  }

  @Post('staff/:id/resend-invite')
  @Roles('superadmin')
  resendInvite(@Param('id') id: string) {
    return this.adminService.resendInvite(id, this.authService);
  }

  // ── AREAS ─────────────────────────────────────────────────
  @Get('areas')
  @Roles('admin', 'teacher', 'parent')
  getAreas() { return this.adminService.getAreas(); }

  @Post('areas')
  @Roles('superadmin')
  createArea(@Body() dto: any) { return this.adminService.createArea(dto); }

  @Put('areas/:id')
  @Roles('superadmin')
  updateArea(@Param('id') id: string, @Body() dto: any) { return this.adminService.updateArea(id, dto); }

  @Delete('areas/:id')
  @Roles('superadmin')
  deleteArea(@Param('id') id: string) { return this.adminService.deleteArea(id); }

  // ── SKILL GROUPS ──────────────────────────────────────────
  @Get('skill-groups')
  @Roles('admin', 'teacher')
  getSkillGroups() { return this.adminService.getSkillGroups(); }

  @Post('skill-groups')
  @Roles('superadmin')
  createSkillGroup(@Body() dto: any) { return this.adminService.createSkillGroup(dto); }

  @Put('skill-groups/:id')
  @Roles('superadmin')
  updateSkillGroup(@Param('id') id: string, @Body() dto: any) { return this.adminService.updateSkillGroup(id, dto); }

  @Delete('skill-groups/:id')
  @Roles('superadmin')
  deleteSkillGroup(@Param('id') id: string) { return this.adminService.deleteSkillGroup(id); }

  // ── SKILLS — мутации только superadmin ────────────────────
  @Get('skills')
  @Roles('admin', 'teacher')
  getSkills() { return this.adminService.getSkills(); }

  @Post('skills')
  @Roles('superadmin')
  createSkill(@Body() dto: any) { return this.adminService.createSkill(dto); }

  @Put('skills/:id')
  @Roles('superadmin')
  updateSkill(@Param('id') id: string, @Body() dto: any) { return this.adminService.updateSkill(id, dto); }

  @Delete('skills/:id')
  @Roles('superadmin')
  deleteSkill(@Param('id') id: string) { return this.adminService.deleteSkill(id); }

  @Post('skills/reorder')
  @Roles('superadmin')
  reorderSkills(@Body() dto: { items: { id: string; sortOrder: number }[] }) {
    return this.adminService.reorderSkills(dto.items);
  }

  @Post('skills/import')
  @Roles('superadmin')
  @UseInterceptors(FileInterceptor('file'))
  importSkills(@UploadedFile() file: any) {
    return this.adminService.importSkillsFromExcel(file.buffer);
  }

  // ── ATTENDANCE ─────────────────────────────────────────────
  @Get('attendance')
  getAttendance(@Query() query: { groupId?: string; date?: string }) {
    return this.adminService.getAttendanceByQuery(query);
  }

  @Post('attendance')
  createAttendance(@Body() dto: { groupId: string; date: string; records: { childId: string; status: string }[] }) {
    return this.adminService.bulkUpsertAttendance(dto);
  }

  @Put('attendance/:id')
  updateAttendance(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateAttendance(id, dto);
  }

  // ── PAYMENTS ───────────────────────────────────────────────
  @Get('payments')
  getPayments() { return this.adminService.getPayments(); }

  @Post('payments')
  createPayment(@Body() dto: any) { return this.adminService.createPayment(dto); }

  @Put('payments/:id')
  updatePayment(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updatePayment(id, dto);
  }

  // ── REPORTS — superadmin-only ────────────────────────────
  @Get('reports/attendance')
  @Roles('superadmin')
  async downloadAttendanceReport(@Query('month') month: string | undefined, @Res() res: Response) {
    const buffer = await this.adminService.generateAttendanceReport(month);
    this.sendXlsx(res, buffer, `attendance_${month || 'current'}.xlsx`);
  }

  @Get('reports/progress')
  @Roles('superadmin')
  async downloadProgressReport(@Query('groupId') groupId: string | undefined, @Res() res: Response) {
    const buffer = await this.adminService.generateProgressReport(groupId);
    this.sendXlsx(res, buffer, `progress_${groupId || 'all'}.xlsx`);
  }

  @Get('reports/payments')
  @Roles('superadmin')
  async downloadPaymentsReport(@Query('month') month: string | undefined, @Res() res: Response) {
    const buffer = await this.adminService.generatePaymentsReport(month);
    this.sendXlsx(res, buffer, `payments_${month || 'current'}.xlsx`);
  }

  private sendXlsx(res: Response, buffer: Buffer, filename: string) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
