'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, GraduationCap, UserCog, Wallet, CalendarCheck, CalendarDays,
  ArrowRight, BookOpen, Calendar, ChefHat, Megaphone,
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, SectionLabel, StatTile } from '@/components/ui';
import api from '@/lib/api';

type DashboardStats = {
  children: number;
  activeChildren: number;
  inAdaptation: number;
  groups: number;
  capacity: number;
  staff: number;
  unpaidAmount: number;
  pendingPayments: number;
  overduePayments: number;
  presentToday: number;
  absentToday: number;
  menus: number;
  upcomingEvents: number;
};

const fmtMoney = (v: number) => `${v.toLocaleString('ru-RU')} ₽`;

function formatToday(): string {
  const d = new Date();
  return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}, ${d.toLocaleDateString('ru-RU', { weekday: 'long' })}`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    children: 0, activeChildren: 0, inAdaptation: 0, groups: 0, capacity: 0, staff: 0,
    unpaidAmount: 0, pendingPayments: 0, overduePayments: 0,
    presentToday: 0, absentToday: 0, menus: 0, upcomingEvents: 0,
  });

  useEffect(() => {
    Promise.all([
      api.get('/admin/children'),
      api.get('/admin/groups'),
      api.get('/admin/staff'),
      api.get('/admin/payments'),
      api.get('/admin/attendance'),
      api.get('/activities/menu'),
      api.get('/activities/events'),
    ]).then(([childrenRes, groupsRes, staffRes, paymentsRes, attendanceRes, menusRes, eventsRes]) => {
      const children = childrenRes.data || [];
      const groups = groupsRes.data || [];
      const payments = paymentsRes.data || [];
      const attendance = attendanceRes.data || [];
      const today = new Date().toISOString().slice(0, 10);
      const todayAtt = attendance.filter((a: { date: string }) => String(a.date).slice(0, 10) === today);
      const now = new Date();

      setStats({
        children: children.length,
        activeChildren: children.filter((c: { status: string }) => c.status === 'active').length,
        inAdaptation: children.filter(
          (c: { status: string; inAdaptation?: boolean }) => c.status === 'active' && c.inAdaptation,
        ).length,
        groups: groups.length,
        capacity: groups.reduce((s: number, g: { capacity?: number }) => s + Number(g.capacity || 0), 0),
        staff: staffRes.data.length,
        unpaidAmount: payments.reduce(
          (s: number, p: { amount: number; paid?: number }) =>
            s + Math.max(0, Number(p.amount) - Number(p.paid || 0)),
          0,
        ),
        pendingPayments: payments.filter((p: { status: string }) => p.status === 'pending').length,
        overduePayments: payments.filter((p: { status: string }) => p.status === 'overdue').length,
        presentToday: todayAtt.filter((a: { status: string }) => a.status === 'present').length,
        absentToday: todayAtt.filter((a: { status: string }) => a.status !== 'present').length,
        menus: menusRes.data.length,
        upcomingEvents: eventsRes.data.filter(
          (e: { eventDate: string }) => new Date(e.eventDate) >= now,
        ).length,
      });
    });
  }, []);

  const occupancy = stats.capacity ? Math.round((stats.activeChildren / stats.capacity) * 100) : 0;

  const metrics: { label: string; value: string | number; hint: string; href: string; icon: typeof Users }[] = [
    { label: 'Активных детей', value: stats.activeChildren, hint: `Всего: ${stats.children}`, href: '/admin/children', icon: GraduationCap },
    { label: 'В адаптации', value: stats.inAdaptation, hint: stats.inAdaptation ? 'Новички — нужен особый присмотр' : 'Все освоились', href: '/admin/children?adaptation=1', icon: GraduationCap },
    { label: 'Группы', value: stats.groups, hint: `Заполненность ${occupancy}%`, href: '/admin/groups', icon: Users },
    { label: 'Сотрудники', value: stats.staff, hint: 'Команда сада', href: '/admin/staff', icon: UserCog },
    { label: 'К оплате', value: fmtMoney(stats.unpaidAmount), hint: `${stats.pendingPayments} ожидают · ${stats.overduePayments} просрочены`, href: '/admin/payments', icon: Wallet },
    { label: 'Сегодня пришли', value: stats.presentToday, hint: stats.absentToday ? `Не пришли: ${stats.absentToday}` : 'Все на месте', href: '/admin/attendance', icon: CalendarCheck },
    { label: 'События впереди', value: stats.upcomingEvents, hint: `Меню: ${stats.menus}`, href: '/admin/events', icon: CalendarDays },
  ];

  const quickLinks: { label: string; href: string; desc: string; icon: typeof BookOpen }[] = [
    { label: 'Оплаты', href: '/admin/payments', desc: 'Начисления, статусы и долги', icon: Wallet },
    { label: 'Посещаемость', href: '/admin/attendance', desc: 'Быстрая отметка по группе', icon: CalendarCheck },
    { label: 'Родители', href: '/admin/parents', desc: 'Аккаунты и связь с детьми', icon: Users },
    { label: 'Навыки', href: '/admin/skills', desc: 'Дерево навыков', icon: BookOpen },
    { label: 'Расписание', href: '/admin/schedule', desc: 'Занятия по дням и группам', icon: Calendar },
    { label: 'Меню', href: '/admin/menu', desc: 'Питание и альтернативы', icon: ChefHat },
    { label: 'Рассылки', href: '/admin/broadcasts', desc: 'Сообщения родителям', icon: Megaphone },
  ];

  return (
    <PageLayout
      eyebrow={formatToday()}
      title={<>Сводка по <span className="italic">саду</span></>}
      wide
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {metrics.map(m => {
          const Icon = m.icon;
          return (
            <Link key={m.label} href={m.href} className="group">
              <Card padding="md" className="hover:border-brand transition-colors h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-pale flex items-center justify-center text-brand">
                    <Icon size={18} />
                  </div>
                  <ArrowRight size={16} className="text-slate-300 group-hover:text-brand transition-colors mt-1" />
                </div>
                <StatTile label={m.label} value={m.value} hint={m.hint} />
              </Card>
            </Link>
          );
        })}
      </div>

      <SectionLabel>Быстрый доступ</SectionLabel>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
        {quickLinks.map(l => {
          const Icon = l.icon;
          return (
            <Link key={l.href} href={l.href} className="group">
              <Card padding="md" className="hover:border-brand transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-pale flex items-center justify-center text-brand shrink-0">
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{l.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{l.desc}</div>
                  </div>
                  <ArrowRight size={16} className="text-slate-300 group-hover:text-brand transition-colors" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </PageLayout>
  );
}
