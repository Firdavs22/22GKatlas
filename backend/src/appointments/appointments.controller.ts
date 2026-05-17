import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly svc: AppointmentsService) {}

  // ── Staff (psychologist/pediatrician/teacher/admin) — manage own slots ──
  @Get('slots/mine')
  @Roles('psychologist', 'pediatrician', 'teacher', 'admin')
  listMySlots(@Request() req, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.listMySlots(req.user, { from, to });
  }

  @Post('slots')
  @Roles('psychologist', 'pediatrician', 'teacher', 'admin')
  createSlot(@Request() req, @Body() body: { startsAt: string; endsAt: string; location?: string; notes?: string }) {
    return this.svc.createSlot(req.user, body);
  }

  @Delete('slots/:id')
  @Roles('psychologist', 'pediatrician', 'teacher', 'admin')
  deleteSlot(@Request() req, @Param('id') id: string) {
    return this.svc.deleteSlot(req.user, id);
  }

  // ── Parent — see open slots, book, cancel ──
  @Get('available')
  @Roles('parent', 'admin')
  listAvailable(@Request() req, @Query('staffId') staffId?: string) {
    return this.svc.listAvailableForParent(req.user.id, { staffId });
  }

  @Get('bookings/mine')
  @Roles('parent')
  listMyBookings(@Request() req) {
    return this.svc.listMyBookings(req.user.id);
  }

  @Post('slots/:id/book')
  @Roles('parent')
  book(@Request() req, @Param('id') slotId: string, @Body() body: { childId?: string; topic?: string }) {
    return this.svc.bookSlot(req.user.id, slotId, body);
  }

  @Post('bookings/:id/cancel')
  @Roles('parent', 'psychologist', 'pediatrician', 'teacher', 'admin')
  cancel(@Request() req, @Param('id') id: string) {
    return this.svc.cancelBooking(req.user, id);
  }
}
