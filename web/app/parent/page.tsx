'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import Onboarding from '@/components/Onboarding';
import api from '@/lib/api';
import { Child } from '@/lib/types';
import Link from 'next/link';

interface Payment { id: string; month: string; status: string; amount: number; paid: number; }
interface ScheduleItem { id: string; dayOfWeek: number; timeStart: string; timeEnd: string; activity: string; description?: string; }

const MONTH_NAMES_GEN = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];

const SECTIONS = [
  { href: '/parent/feed', icon: '📰', label: 'Лента', desc: 'Новости и фотографии', color: 'from-orange-400 to-amber-500' },
  { href: '/parent/progress', icon: '📊', label: 'Прогресс', desc: 'Карта развития', color: 'from-green-500 to-emerald-600' },
  { href: '/parent/chats', icon: '💬', label: 'Чаты', desc: 'Диалог с педагогом', color: 'from-indigo-500 to-violet-600' },
  { href: '/parent/attendance', icon: '📋', label: 'Посещаемость', desc: 'Дни посещения', color: 'from-teal-400 to-cyan-500' },
  { href: '/parent/schedule', icon: '🕐', label: 'Расписание', desc: 'Расписание группы', color: 'from-purple-500 to-fuchsia-600' },
  { href: '/parent/menu', icon: '🍎', label: 'Меню', desc: 'Питание на неделю', color: 'from-amber-500 to-orange-600' },
  { href: '/parent/payments', icon: '💰', label: 'Оплата', desc: 'Счета и история', color: 'from-rose-500 to-red-600' },
  { href: '/parent/about', icon: '📚', label: 'О методе', desc: 'Что такое зоны Монтессори', color: 'from-slate-400 to-gray-500' },
];

export default function ParentDashboard() {
  const [children, setChildren] = useState<Child[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [homeTasks, setHomeTasks] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    api.get('/children').then(r => {
      setChildren(r.data);
      if (r.data[0]) {
        const firstChild = r.data[0];
        api.get(`/children/${firstChild.id}/payments`).then(p => setPayments(p.data));
        api.get(`/children/${firstChild.id}/attendance`).then(a => setAttendance(a.data));
        api.get(`/children/${firstChild.id}/home-tasks`).then(t => setHomeTasks(t.data));
        api.get('/feed').then(f => setFeed(f.data));
        api.get('/activities/menu').then(m => setMenu(m.data));

        const groupId = firstChild.group?.id || firstChild.groupId;
        if (groupId) {
          api.get(`/groups/${groupId}/schedule`).then(s => setSchedule(s.data));
        }
      }
    });
  }, []);

  const now = new Date();
  const currentMonthPayment = payments.find(p => {
    const d = new Date(p.month);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const currentPayment = currentMonthPayment || payments.find(p => p.status !== 'paid') || payments[0];

  // This month attendance stats
  const monthAtt = attendance.filter(a => {
    const d = new Date(a.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const presentDays = monthAtt.filter(a => a.status === 'present').length;
  const childName = children[0]?.name || '';
  const groupName = (children[0] as any)?.group?.name || '';
  const todayDay = now.getDay();
  const nowTime = now.toTimeString().slice(0, 5);
  const todaySchedule = schedule
    .filter(s => s.dayOfWeek === todayDay)
    .sort((a, b) => a.timeStart.localeCompare(b.timeStart));
  const nextScheduleItem = todaySchedule.find(s => s.timeEnd >= nowTime) || todaySchedule[0];
  const pendingTasks = homeTasks.filter(t => t.status !== 'done');
  const latestFeed = feed[0];
  const activeMenu = menu.find(m => {
    const start = new Date(m.startDate);
    const end = new Date(m.endDate);
    return start <= now && end >= now;
  }) || menu[0];

  const [showOnboarding, setShowOnboarding] = useState(
    typeof window !== 'undefined' && !localStorage.getItem('onboarding_done')
  );

  return (
    <PageLayout title="Главная">
      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
      {/* Welcome */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6 mb-6 shadow-lg">
        <div className="text-indigo-200 text-sm">Добро пожаловать!</div>
        <div className="text-2xl font-bold mt-1">{childName}</div>
        {groupName && <div className="text-indigo-200 text-sm mt-1">Группа: {groupName}</div>}

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
            <div className="text-2xl font-bold">{presentDays}</div>
            <div className="text-xs text-indigo-200">Дней посещено</div>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
            <div className="text-2xl font-bold">{currentPayment ? `${(Number(currentPayment.amount) / 1000).toFixed(0)}к` : '—'}</div>
            <div className="text-xs text-indigo-200">К оплате</div>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
            <div className="text-2xl font-bold">
              {currentPayment ? (
                <span className={currentPayment.status === 'paid' ? 'text-green-300' : currentPayment.status === 'overdue' ? 'text-red-300' : 'text-yellow-300'}>
                  {currentPayment.status === 'paid' ? '✓' : currentPayment.status === 'overdue' ? '!' : '⏳'}
                </span>
              ) : '—'}
            </div>
            <div className="text-xs text-indigo-200">Статус</div>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-bold text-gray-800 mb-3">Актуально сегодня</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">Расписание</div>
          <div className="font-medium text-gray-800">
            {nextScheduleItem ? `${nextScheduleItem.timeStart} — ${nextScheduleItem.activity}` : 'На сегодня расписания нет'}
          </div>
          {nextScheduleItem?.description && <div className="text-sm text-gray-500 mt-1">{nextScheduleItem.description}</div>}
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">Домашние задания</div>
          <div className="font-medium text-gray-800">{pendingTasks.length ? `${pendingTasks.length} в работе` : 'Всё выполнено'}</div>
          {pendingTasks[0] && <div className="text-sm text-gray-500 mt-1">{pendingTasks[0].title}</div>}
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">Лента</div>
          <div className="font-medium text-gray-800">{latestFeed?.title || latestFeed?.text || 'Новых записей нет'}</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">Меню</div>
          <div className="font-medium text-gray-800">{activeMenu?.title || 'Меню пока не опубликовано'}</div>
        </div>
      </div>

      {/* Quick access grid */}
      <h2 className="text-lg font-bold text-gray-800 mb-3">Быстрый доступ</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {SECTIONS.map(s => (
          <Link key={s.href} href={s.href} className="group">
            <div className="bg-white border rounded-xl p-4 hover:shadow-md transition-all hover:-translate-y-0.5">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center text-xl mb-3 shadow-sm`}>
                {s.icon}
              </div>
              <div className="font-medium text-sm text-gray-800 group-hover:text-indigo-600 transition-colors">{s.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Children list if multiple */}
      {children.length > 1 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">Ваши дети</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {children.map(c => (
              <div key={c.id} className="bg-white border rounded-xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-xl">👧</div>
                <div>
                  <div className="font-medium text-sm">{c.name}</div>
                  <div className="text-xs text-gray-500">
                    {(c as any)?.group?.name || 'Без группы'} · {new Date(c.birthDate).toLocaleDateString('ru')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
