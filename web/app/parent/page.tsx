'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ImageIcon, MessageCircle } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, Badge, StatTile, SectionLabel } from '@/components/ui';
import api from '@/lib/api';
import { Child, Progress, Schedule } from '@/lib/types';

interface Payment { id: string; month: string; status: string; amount: number; paid: number; }
interface Attendance { id: string; date: string; status: 'present' | 'sick' | 'vacation' | 'absent'; }

function calcAge(birthDate: string): { years: number; label: string } {
  const b = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) years--;
  const label = years === 1 ? 'год' : years < 5 ? 'года' : 'лет';
  return { years, label };
}

function formatToday(): string {
  const d = new Date();
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  const weekday = d.toLocaleDateString('ru-RU', { weekday: 'long' });
  return `${date}, ${weekday}`;
}

function splitFirstName(name: string): { first: string; rest: string } {
  const parts = name.trim().split(/\s+/);
  return { first: parts[0] || name, rest: parts.slice(1).join(' ') };
}

function paymentTone(status: string): { tone: 'success' | 'warn' | 'danger'; label: string } {
  if (status === 'paid') return { tone: 'success', label: 'Оплачен' };
  if (status === 'overdue') return { tone: 'danger', label: 'Просрочен' };
  return { tone: 'warn', label: 'Ожидает' };
}

export default function ParentDashboard() {
  const [children, setChildren] = useState<Child[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        if (u?.name) setUserName(u.name);
      } catch {}
    }
    api.get('/children').then(r => {
      setChildren(r.data);
      const first = r.data[0];
      if (!first) return;
      api.get(`/children/${first.id}/progress`).then(p => setProgress(p.data));
      api.get(`/children/${first.id}/attendance`).then(a => setAttendance(a.data));
      api.get(`/children/${first.id}/payments`).then(p => setPayments(p.data));
      const groupId = first.group?.id || first.groupId;
      if (groupId) api.get(`/groups/${groupId}/schedule`).then(s => setSchedule(s.data));
    });
  }, []);

  const child = children[0];
  const now = new Date();
  const monthAtt = attendance.filter(a => {
    const d = new Date(a.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const presentCount = monthAtt.filter(a => a.status === 'present').length;
  const attendancePct = monthAtt.length ? Math.round((presentCount / monthAtt.length) * 100) : 0;

  const masteredCount = progress.filter(p => p.stage === 'mastered').length;
  const totalSkills = progress.length;

  const currentPayment =
    payments.find(p => {
      const d = new Date(p.month);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }) || payments.find(p => p.status !== 'paid') || payments[0];

  const todayDay = now.getDay();
  const todaySchedule = schedule
    .filter(s => s.dayOfWeek === todayDay)
    .sort((a, b) => a.timeStart.localeCompare(b.timeStart))
    .slice(0, 5);

  const { first: firstName } = splitFirstName(userName);

  return (
    <PageLayout
      eyebrow={formatToday()}
      title={
        <>
          Здравствуйте, <span className="italic">{firstName || 'друзья'}</span>
        </>
      }
      actions={
        <Link href="/parent/chats">
          <Button variant="primary">
            <MessageCircle size={16} />
            Написать педагогу
          </Button>
        </Link>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* Child hero card */}
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-col sm:flex-row">
            {/* Photo */}
            <div className="sm:w-56 shrink-0 bg-brand-pale/50 flex items-center justify-center aspect-square sm:aspect-auto">
              {child?.photo ? (
                <img src={child.photo} alt={child.name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-brand/70">
                  <ImageIcon size={28} strokeWidth={1.5} />
                  <span className="text-sm font-medium">
                    {child?.name.split(' ')[0] || '—'}
                  </span>
                </div>
              )}
            </div>
            {/* Info */}
            <div className="flex-1 p-6 flex flex-col gap-5">
              <div>
                <SectionLabel>Ваш ребёнок</SectionLabel>
                <h2 className="font-serif text-3xl mt-1">
                  {child?.name || '—'}
                </h2>
                <div className="text-sm text-slate-500 mt-1">
                  {child?.group?.name || 'Без группы'}
                  {child?.group?.ageRange && ` · ${child.group.ageRange}`}
                  {child?.group?.teacher?.name && ` · педагог ${child.group.teacher.name}`}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                <StatTile
                  label="Посещаемость"
                  value={attendancePct}
                  unit="%"
                />
                <StatTile
                  label="Навыки усвоено"
                  value={masteredCount}
                  unit={totalSkills ? `/${totalSkills}` : ''}
                />
                <div className="flex flex-col gap-1">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Оплата
                  </div>
                  <div className="mt-1">
                    {currentPayment ? (
                      <Badge tone={paymentTone(currentPayment.status).tone} dot>
                        {new Date(currentPayment.month).toLocaleDateString('ru-RU', { month: 'long' })}{' '}
                        {paymentTone(currentPayment.status).label.toLowerCase()}
                      </Badge>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Today's schedule */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <SectionLabel>Актуально сегодня</SectionLabel>
              <h3 className="font-serif text-2xl mt-1">Расписание</h3>
            </div>
            <Link href="/parent/schedule">
              <Button variant="outline" size="sm">Все</Button>
            </Link>
          </div>
          {todaySchedule.length === 0 ? (
            <div className="text-sm text-slate-400 py-8 text-center">
              На сегодня расписания нет
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {todaySchedule.map(item => {
                const start = new Date(`2000-01-01T${item.timeStart}`);
                const end = new Date(`2000-01-01T${item.timeEnd}`);
                const mins = Math.round((end.getTime() - start.getTime()) / 60000);
                return (
                  <li key={item.id} className="flex items-start gap-4 py-3">
                    <div className="tabular-nums text-sm text-slate-500 w-12 shrink-0 mt-0.5">
                      {item.timeStart}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">{item.activity}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {item.description || `${mins} мин`}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Footer link tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <Link href="/parent/progress" className="group">
          <Card padding="md" className="hover:border-brand transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-pale flex items-center justify-center text-brand shrink-0">
                <ArrowRight size={18} />
              </div>
              <div className="flex-1">
                <div className="font-serif text-xl">Карта развития</div>
                <div className="text-sm text-slate-500 mt-0.5">
                  Прогресс ребёнка по 5 областям
                </div>
              </div>
              <ArrowRight size={20} className="text-slate-300 group-hover:text-brand transition-colors" />
            </div>
          </Card>
        </Link>
        <Link href="/parent/feed" className="group">
          <Card padding="md" className="hover:border-brand transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-pale flex items-center justify-center text-brand shrink-0">
                <ArrowRight size={18} />
              </div>
              <div className="flex-1">
                <div className="font-serif text-xl">Лента группы</div>
                <div className="text-sm text-slate-500 mt-0.5">
                  Новости и фотографии из сада
                </div>
              </div>
              <ArrowRight size={20} className="text-slate-300 group-hover:text-brand transition-colors" />
            </div>
          </Card>
        </Link>
      </div>
    </PageLayout>
  );
}
