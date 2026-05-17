'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Calendar, MapPin } from 'lucide-react';
import { Card, Button, Badge, SectionLabel } from '@/components/ui';
import api from '@/lib/api';

interface Slot {
  id: string;
  staffId: string;
  startsAt: string;
  endsAt: string;
  location?: string | null;
  notes?: string | null;
  bookings?: { id: string; parentId: string; topic?: string | null; status: string }[];
}

const inputCls =
  'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export default function SlotsManager() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const load = () => {
    api.get('/appointments/slots/mine').then(r => setSlots(r.data));
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/appointments/slots', { startsAt, endsAt, location, notes });
      setFormOpen(false);
      setStartsAt('');
      setEndsAt('');
      setLocation('');
      setNotes('');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Не удалось создать слот');
    }
  };

  const remove = async (slot: Slot) => {
    const hasBooking = (slot.bookings || []).some(b => b.status === 'confirmed');
    if (hasBooking) {
      if (!confirm('На слот есть запись. Отменить запись и удалить слот?')) return;
      const booking = slot.bookings!.find(b => b.status === 'confirmed')!;
      await api.post(`/appointments/bookings/${booking.id}/cancel`);
    } else if (!confirm('Удалить слот?')) {
      return;
    }
    await api.delete(`/appointments/slots/${slot.id}`);
    load();
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="primary" size="sm" onClick={() => setFormOpen(v => !v)}>
          <Plus size={16} />
          {formOpen ? 'Закрыть' : 'Новый слот'}
        </Button>
      </div>

      {formOpen && (
        <Card padding="md" className="mb-6">
          <h3 className="font-serif text-xl mb-4">Открыть время для приёма</h3>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                  Начало
                </label>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={e => setStartsAt(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                  Конец
                </label>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={e => setEndsAt(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
            </div>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Где: кабинет, онлайн… (опц.)"
              className={inputCls}
            />
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Комментарий для родителей (опц.)"
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
            />
            <div className="flex gap-2">
              <Button type="submit" variant="primary">Открыть слот</Button>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Отмена
              </Button>
            </div>
          </form>
        </Card>
      )}

      {slots.length === 0 ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-12 text-center">
            Откройте время — родители смогут записаться
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          <SectionLabel>Мои слоты</SectionLabel>
          {slots.map(slot => {
            const booking = (slot.bookings || []).find(b => b.status === 'confirmed');
            const past = new Date(slot.startsAt) < new Date();
            return (
              <Card key={slot.id} padding="md" className={past ? 'opacity-70' : ''}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar size={14} className="text-brand" />
                      <span className="font-medium text-sm">
                        {new Date(slot.startsAt).toLocaleString('ru-RU', {
                          day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                        })}
                        {' – '}
                        {new Date(slot.endsAt).toLocaleString('ru-RU', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {slot.location && (
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin size={11} />
                        {slot.location}
                      </div>
                    )}
                    {slot.notes && (
                      <div className="text-xs text-slate-500 mt-1">{slot.notes}</div>
                    )}
                    {booking && (
                      <div className="mt-2">
                        <Badge tone="success" dot>
                          Записан родитель{booking.topic ? ` · ${booking.topic}` : ''}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {booking ? null : (
                      <Badge tone={past ? 'neutral' : 'warn'}>{past ? 'прошёл' : 'свободно'}</Badge>
                    )}
                    <button
                      onClick={() => remove(slot)}
                      className="p-1.5 text-slate-400 hover:text-danger transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
