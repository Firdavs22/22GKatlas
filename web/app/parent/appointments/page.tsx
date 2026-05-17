'use client';
import { useEffect, useMemo, useState } from 'react';
import { Calendar, MapPin, X, Check } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, Badge, SectionLabel } from '@/components/ui';
import api from '@/lib/api';

interface Slot {
  id: string;
  startsAt: string;
  endsAt: string;
  location?: string | null;
  notes?: string | null;
  staff?: { id: string; name: string; role: string } | null;
}

interface Booking {
  id: string;
  slotId: string;
  childId?: string | null;
  topic?: string | null;
  createdAt: string;
  slot: Slot & { staffId: string };
}

interface ChildLite { id: string; name: string }

const ROLE_LABEL: Record<string, string> = {
  psychologist: 'Психолог',
  pediatrician: 'Педиатр',
  teacher: 'Педагог',
};

export default function ParentAppointments() {
  const [available, setAvailable] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [children, setChildren] = useState<ChildLite[]>([]);
  const [booking, setBooking] = useState<{ slot: Slot; childId: string; topic: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    api.get('/appointments/available').then(r => setAvailable(r.data));
    api.get('/appointments/bookings/mine').then(r => setBookings(r.data));
  };

  useEffect(() => {
    load();
    api.get('/children').then(r => setChildren(r.data));
  }, []);

  const byStaff = useMemo(() => {
    const map = new Map<string, { staff: Slot['staff']; slots: Slot[] }>();
    for (const s of available) {
      if (!s.staff) continue;
      if (!map.has(s.staff.id)) map.set(s.staff.id, { staff: s.staff, slots: [] });
      map.get(s.staff.id)!.slots.push(s);
    }
    return Array.from(map.values());
  }, [available]);

  const confirmBooking = async () => {
    if (!booking) return;
    setSubmitting(true);
    try {
      await api.post(`/appointments/slots/${booking.slot.id}/book`, {
        childId: booking.childId || undefined,
        topic: booking.topic || undefined,
      });
      setBooking(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Не удалось записаться');
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async (id: string) => {
    if (!window.confirm('Отменить запись?')) return;
    await api.post(`/appointments/bookings/${id}/cancel`);
    load();
  };

  return (
    <PageLayout
      eyebrow="К психологу, педиатру, педагогу"
      title="Запись на приём"
    >
      {bookings.length > 0 && (
        <div className="mb-6">
          <SectionLabel>Мои записи</SectionLabel>
          <div className="space-y-3 mt-3">
            {bookings.map(b => (
              <Card key={b.id} padding="md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar size={14} className="text-brand" />
                      <span className="font-medium text-sm">
                        {new Date(b.slot.startsAt).toLocaleString('ru-RU', {
                          day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {b.slot.location && (
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin size={11} />
                        {b.slot.location}
                      </div>
                    )}
                    {b.topic && <div className="text-xs text-slate-500 mt-1">Тема: {b.topic}</div>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => cancel(b.id)}>
                    <X size={14} />
                    Отменить
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <SectionLabel>Свободные слоты</SectionLabel>
      {byStaff.length === 0 ? (
        <Card padding="md" className="mt-3">
          <div className="text-sm text-slate-400 py-12 text-center">
            Сейчас нет свободных слотов
          </div>
        </Card>
      ) : (
        <div className="space-y-5 mt-3">
          {byStaff.map(({ staff, slots }) => (
            <div key={staff!.id}>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-medium text-sm">{staff!.name}</span>
                <span className="text-xs text-slate-500">{ROLE_LABEL[staff!.role] || staff!.role}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {slots.map(slot => (
                  <button
                    key={slot.id}
                    onClick={() =>
                      setBooking({
                        slot,
                        childId: children[0]?.id || '',
                        topic: '',
                      })
                    }
                    className="text-left p-3 rounded-xl border border-slate-200 hover:border-brand transition-colors"
                  >
                    <div className="flex items-center gap-1.5 tabular-nums text-sm text-brand mb-1">
                      <Calendar size={12} />
                      {new Date(slot.startsAt).toLocaleString('ru-RU', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(slot.endsAt).toLocaleTimeString('ru-RU', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                      {slot.location && ` · ${slot.location}`}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {booking && (
        <div
          className="fixed inset-0 bg-foreground/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setBooking(null)}
        >
          <div
            className="bg-background rounded-3xl shadow-xl w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100">
              <SectionLabel>Запись на приём</SectionLabel>
              <div className="font-serif text-2xl mt-1">
                {new Date(booking.slot.startsAt).toLocaleString('ru-RU', {
                  day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                })}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {booking.slot.staff?.name} · {ROLE_LABEL[booking.slot.staff?.role || ''] || ''}
                {booking.slot.location && ` · ${booking.slot.location}`}
              </div>
            </div>
            <div className="p-5 space-y-3">
              {children.length > 1 && (
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                    Ребёнок
                  </label>
                  <select
                    value={booking.childId}
                    onChange={e => setBooking(b => (b ? { ...b, childId: e.target.value } : b))}
                    className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  >
                    {children.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                  Тема (опц.)
                </label>
                <textarea
                  value={booking.topic}
                  onChange={e => setBooking(b => (b ? { ...b, topic: e.target.value } : b))}
                  rows={3}
                  placeholder="С чем хочется разобраться…"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                />
              </div>
              <Badge tone="success" dot>Время будет занято только для вас</Badge>
            </div>
            <div className="p-5 border-t border-slate-100 flex gap-2">
              <Button variant="primary" onClick={confirmBooking} disabled={submitting}>
                <Check size={14} />
                {submitting ? 'Записываю…' : 'Подтвердить'}
              </Button>
              <Button variant="outline" onClick={() => setBooking(null)}>Отмена</Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
