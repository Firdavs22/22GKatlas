import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  /** Specialist/teacher creates a slot they offer. */
  async createSlot(user: { id: string; role: string }, dto: {
    startsAt?: string; endsAt?: string; location?: string; notes?: string;
  }) {
    if (!['psychologist', 'pediatrician', 'teacher', 'admin'].includes(user.role)) {
      throw new ForbiddenException();
    }
    if (!dto.startsAt || !dto.endsAt) {
      throw new BadRequestException('Укажите дату и время начала и конца');
    }
    const starts = new Date(dto.startsAt);
    const ends = new Date(dto.endsAt);
    if (!(starts instanceof Date) || isNaN(+starts) || !(ends instanceof Date) || isNaN(+ends)) {
      throw new BadRequestException('Неверный формат даты');
    }
    if (ends <= starts) throw new BadRequestException('Конец должен быть позже начала');
    return this.prisma.appointmentSlot.create({
      data: {
        staffId: user.id,
        startsAt: starts,
        endsAt: ends,
        location: dto.location?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
    });
  }

  /** Specialist sees own slots (busy + free). Admin sees everything. */
  async listMySlots(user: { id: string; role: string }, opts: { from?: string; to?: string }) {
    const where: { staffId?: string; startsAt?: { gte?: Date; lte?: Date } } = {};
    if (user.role !== 'admin') where.staffId = user.id;
    if (opts.from || opts.to) {
      where.startsAt = {};
      if (opts.from) where.startsAt.gte = new Date(opts.from);
      if (opts.to) where.startsAt.lte = new Date(opts.to);
    }
    return this.prisma.appointmentSlot.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: { bookings: true },
    });
  }

  /** Parent sees free slots for the given staff member (or any specialist if no staffId). */
  async listAvailableForParent(_parentId: string, opts: { staffId?: string }) {
    const slots = await this.prisma.appointmentSlot.findMany({
      where: {
        ...(opts.staffId ? { staffId: opts.staffId } : {}),
        startsAt: { gte: new Date() },
        bookings: { none: { status: 'confirmed' } },
      },
      orderBy: { startsAt: 'asc' },
    });
    const staffIds = Array.from(new Set(slots.map(s => s.staffId)));
    const staff = staffIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: staffIds } },
          select: { id: true, name: true, role: true, avatar: true },
        })
      : [];
    const staffById = new Map(staff.map(s => [s.id, s]));
    return slots.map(s => ({ ...s, staff: staffById.get(s.staffId) || null }));
  }

  async bookSlot(parentId: string, slotId: string, dto: { childId?: string; topic?: string }) {
    const slot = await this.prisma.appointmentSlot.findUnique({
      where: { id: slotId },
      include: { bookings: { where: { status: 'confirmed' } } },
    });
    if (!slot) throw new NotFoundException();
    if (slot.bookings.length > 0) {
      throw new BadRequestException('Это время уже занято');
    }
    if (slot.startsAt < new Date()) {
      throw new BadRequestException('Время уже прошло');
    }
    const booking = await this.prisma.appointmentBooking.create({
      data: {
        slotId,
        parentId,
        childId: dto.childId || null,
        topic: dto.topic?.trim() || null,
      },
    });

    // Notify the staff member
    try {
      const parent = await this.prisma.user.findUnique({
        where: { id: parentId },
        select: { name: true },
      });
      await this.prisma.notification.create({
        data: {
          userId: slot.staffId,
          type: 'appointment',
          title: 'Новая запись на приём',
          body: `${parent?.name || 'Родитель'} · ${slot.startsAt.toLocaleString('ru-RU')}`,
          data: { bookingId: booking.id, slotId },
        },
      });
    } catch { /* best effort */ }

    return booking;
  }

  async cancelBooking(user: { id: string; role: string }, bookingId: string) {
    const booking = await this.prisma.appointmentBooking.findUnique({
      where: { id: bookingId },
      include: { slot: true },
    });
    if (!booking) throw new NotFoundException();
    // Parent may cancel own booking. Staff may cancel bookings on their slots. Admin always.
    if (user.role !== 'admin') {
      if (booking.parentId !== user.id && booking.slot.staffId !== user.id) {
        throw new ForbiddenException();
      }
    }
    return this.prisma.appointmentBooking.update({
      where: { id: bookingId },
      data: { status: 'cancelled' },
    });
  }

  async deleteSlot(user: { id: string; role: string }, slotId: string) {
    const slot = await this.prisma.appointmentSlot.findUnique({
      where: { id: slotId },
      include: { bookings: { where: { status: 'confirmed' } } },
    });
    if (!slot) throw new NotFoundException();
    if (user.role !== 'admin' && slot.staffId !== user.id) throw new ForbiddenException();
    if (slot.bookings.length > 0) {
      throw new BadRequestException('Сначала отмените запись на этот слот');
    }
    return this.prisma.appointmentSlot.delete({ where: { id: slotId } });
  }

  /** Parent: my upcoming bookings. */
  listMyBookings(parentId: string) {
    return this.prisma.appointmentBooking.findMany({
      where: { parentId, status: 'confirmed' },
      orderBy: { createdAt: 'desc' },
      include: { slot: true },
    });
  }
}
