import { Controller, Get, Post, Put, Delete, Body, Param, Query, Res, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from '../auth/auth.service';

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
  inviteParentAccount(@Body() dto: { email: string; name: string; phone?: string; childIds?: string[] }) {
    return this.adminService.inviteParentAccount(dto, this.authService);
  }

  @Put('parents/:id')
  updateParent(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateParent(id, dto);
  }

  @Post('parents/:id/invite-link')
  reissueParentInvite(@Param('id') id: string) {
    return this.adminService.reissueParentInvite(id, this.authService);
  }

  // ── STAFF ─────────────────────────────────────────────────
  @Get('staff')
  getStaff() { return this.adminService.getStaff(); }

  @Get('staff/:id')
  getStaffById(@Param('id') id: string) { return this.adminService.getStaffById(id); }

  @Post('staff/invite')
  inviteStaff(@Body() dto: { email: string; name: string; role: any }) {
    return this.adminService.inviteStaff(dto.email, dto.name, dto.role, this.authService);
  }

  @Put('staff/:id')
  updateStaff(@Param('id') id: string, @Body() dto: any) { return this.adminService.updateStaff(id, dto); }

  // ── AREAS ─────────────────────────────────────────────────
  @Get('areas')
  @Roles('admin', 'teacher', 'parent')
  getAreas() { return this.adminService.getAreas(); }

  @Post('areas')
  createArea(@Body() dto: any) { return this.adminService.createArea(dto); }

  @Put('areas/:id')
  updateArea(@Param('id') id: string, @Body() dto: any) { return this.adminService.updateArea(id, dto); }

  @Delete('areas/:id')
  deleteArea(@Param('id') id: string) { return this.adminService.deleteArea(id); }

  // ── SKILL GROUPS ──────────────────────────────────────────
  @Get('skill-groups')
  @Roles('admin', 'teacher')
  getSkillGroups() { return this.adminService.getSkillGroups(); }

  @Post('skill-groups')
  createSkillGroup(@Body() dto: any) { return this.adminService.createSkillGroup(dto); }

  @Put('skill-groups/:id')
  updateSkillGroup(@Param('id') id: string, @Body() dto: any) { return this.adminService.updateSkillGroup(id, dto); }

  @Delete('skill-groups/:id')
  deleteSkillGroup(@Param('id') id: string) { return this.adminService.deleteSkillGroup(id); }

  // ── SKILLS ────────────────────────────────────────────────
  @Get('skills')
  @Roles('admin', 'teacher')
  getSkills() { return this.adminService.getSkills(); }

  @Post('skills')
  createSkill(@Body() dto: any) { return this.adminService.createSkill(dto); }

  @Put('skills/:id')
  updateSkill(@Param('id') id: string, @Body() dto: any) { return this.adminService.updateSkill(id, dto); }

  @Delete('skills/:id')
  deleteSkill(@Param('id') id: string) { return this.adminService.deleteSkill(id); }

  @Post('skills/reorder')
  reorderSkills(@Body() dto: { items: { id: string; sortOrder: number }[] }) {
    return this.adminService.reorderSkills(dto.items);
  }

  @Post('skills/import')
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

  // ── REPORTS ────────────────────────────────────────────
  @Get('reports/attendance')
  async downloadAttendanceReport(@Query('month') month: string | undefined, @Res() res: Response) {
    const buffer = await this.adminService.generateAttendanceReport(month);
    this.sendXlsx(res, buffer, `attendance_${month || 'current'}.xlsx`);
  }

  @Get('reports/progress')
  async downloadProgressReport(@Query('groupId') groupId: string | undefined, @Res() res: Response) {
    const buffer = await this.adminService.generateProgressReport(groupId);
    this.sendXlsx(res, buffer, `progress_${groupId || 'all'}.xlsx`);
  }

  @Get('reports/payments')
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
