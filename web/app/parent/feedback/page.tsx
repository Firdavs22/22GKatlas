'use client';
import { useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, SectionLabel } from '@/components/ui';
import api from '@/lib/api';

export default function ParentFeedbackPage() {
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const canSend = message.trim().length >= 3 && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setSubmitting(true);
    try {
      await api.post('/feedback', { message: message.trim(), isAnonymous: anonymous });
      setSent(true);
      setMessage('');
      setAnonymous(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Не удалось отправить');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout eyebrow="Голос родителя" title="Обратная связь">
      <p className="text-sm text-slate-500 mb-6 max-w-2xl">
        Ваше мнение читает только заведующая. Педагоги и обычные администраторы это сообщение не увидят.
        Если включите «Анонимно» — ваше имя не сохранится.
      </p>

      {sent && (
        <Card padding="md" className="mb-4 border-green-200 bg-green-50/50">
          <div className="flex items-start gap-3">
            <MessageSquare size={18} className="text-green-700 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium text-sm text-green-900">Спасибо, сообщение отправлено</div>
              <div className="text-xs text-green-800/80 mt-1">
                Можно отправить ещё одно, если есть что добавить.
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card padding="md">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <SectionLabel>Сообщение</SectionLabel>
            <textarea
              value={message}
              onChange={e => { setMessage(e.target.value); if (sent) setSent(false); }}
              required
              rows={8}
              placeholder="Поделитесь идеей, замечанием или благодарностью…"
              className="w-full mt-2 px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
            />
            <div className="mt-1 text-xs text-slate-400 text-right">
              {message.trim().length}/4000
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <span className="relative inline-flex">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={e => setAnonymous(e.target.checked)}
                className="sr-only peer"
              />
              <span className="w-10 h-6 rounded-full bg-slate-200 peer-checked:bg-brand transition-colors" />
              <span className="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
            </span>
            <span className="text-sm">
              <span className="font-medium">Отправить анонимно</span>
              <span className="block text-xs text-slate-500 mt-0.5">
                {anonymous
                  ? 'Имя и контакты не сохранятся — заведующая не сможет с вами связаться.'
                  : 'Заведующая увидит, кто отправил сообщение, и сможет ответить.'}
              </span>
            </span>
          </label>

          <Button type="submit" variant="primary" className="w-full" disabled={!canSend}>
            <Send size={16} />
            {submitting ? 'Отправляем…' : 'Отправить'}
          </Button>
        </form>
      </Card>
    </PageLayout>
  );
}
