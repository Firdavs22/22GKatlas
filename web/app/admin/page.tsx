'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import Link from 'next/link';

type DashboardStats = {
  children: number;
  activeChildren: number;
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

const fmtMoney = (value: number) => `${value.toLocaleString('ru-RU')} ₽`;

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    children: 0,
    activeChildren: 0,
    groups: 0,
    capacity: 0,
    staff: 0,
    unpaidAmount: 0,
    pendingPayments: 0,
    overduePayments: 0,
    presentToday: 0,
    absentToday: 0,
    menus: 0,
    upcomingEvents: 0,
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
      const todayAttendance = attendance.filter((a: any) => String(a.date).slice(0, 10) === today);
      const now = new Date();

      setStats({
        children: children.length,
        activeChildren: children.filter((c: any) => c.status === 'active').length,
        groups: groups.length,
        capacity: groups.reduce((sum: number, g: any) => sum + Number(g.capacity || 0), 0),
        staff: staffRes.data.length,
        unpaidAmount: payments.reduce((sum: number, p: any) => sum + Math.max(0, Number(p.amount) - Number(p.paid || 0)), 0),
        pendingPayments: payments.filter((p: any) => p.status === 'pending').length,
        overduePayments: payments.filter((p: any) => p.status === 'overdue').length,
        presentToday: todayAttendance.filter((a: any) => a.status === 'present').length,
        absentToday: todayAttendance.filter((a: any) => a.status !== 'present').length,
        menus: menusRes.data.length,
        upcomingEvents: eventsRes.data.filter((event: any) => new Date(event.eventDate) >= now).length,
      });
    });
  }, []);

  const occupancy = stats.capacity ? Math.round((stats.activeChildren / stats.capacity) * 100) : 0;

  const metricCards = [
    { label: 'Активных детей', value: stats.activeChildren, sub: `Всего: ${stats.children}`, href: '/admin/children', color: 'bg-blue-50 text-blue-700' },
    { label: 'Группы', value: stats.groups, sub: `Заполненность: ${occupancy}%`, href: '/admin/groups', color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Сотрудники', value: stats.staff, sub: 'Команда сада', href: '/admin/staff', color: 'bg-violet-50 text-violet-700' },
    { label: 'К оплате', value: fmtMoney(stats.unpaidAmount), sub: `${stats.pendingPayments} ожидают, ${stats.overduePayments} просрочены`, href: '/admin/payments', color: 'bg-rose-50 text-rose-700' },
    { label: 'Сегодня пришли', value: stats.presentToday, sub: stats.absentToday ? `Не пришли: ${stats.absentToday}` : 'Отметок отсутствия нет', href: '/admin/attendance', color: 'bg-teal-50 text-teal-700' },
    { label: 'События', value: stats.upcomingEvents, sub: `Меню: ${stats.menus}`, href: '/admin/events', color: 'bg-amber-50 text-amber-700' },
  ];

  const quickLinks = [
    { label: 'Оплаты', href: '/admin/payments', desc: 'Начисления, статусы и долги' },
    { label: 'Посещаемость', href: '/admin/attendance', desc: 'Быстрая отметка по группе' },
    { label: 'Родители', href: '/admin/parents', desc: 'Аккаунты родителей и связь с детьми' },
    { label: 'Навыки', href: '/admin/skills', desc: 'Дерево Montessori-навыков' },
    { label: 'Расписание', href: '/admin/schedule', desc: 'Занятия по дням и группам' },
    { label: 'Меню', href: '/admin/menu', desc: 'Питание и альтернативы' },
    { label: 'Рассылки', href: '/admin/broadcasts', desc: 'Сообщения родителям' },
  ];

  return (
    <PageLayout title="Дашборд">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {metricCards.map(card => (
          <Link key={card.label} href={card.href} className={`${card.color} p-5 rounded-xl border border-transparent hover:border-current/20 hover:shadow-sm transition-all`}>
            <span className="text-3xl font-bold block">{card.value}</span>
            <span className="font-medium block mt-1">{card.label}</span>
            <span className="text-sm opacity-75 block mt-1">{card.sub}</span>
          </Link>
        ))}
      </div>

      <h2 className="text-lg font-bold text-gray-800 mt-8 mb-3">Быстрый доступ</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickLinks.map(link => (
          <Link key={link.href} href={link.href} className="bg-white border rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all">
            <div className="font-medium">{link.label}</div>
            <div className="text-sm text-gray-500 mt-1">{link.desc}</div>
          </Link>
        ))}
      </div>
    </PageLayout>
  );
}
