'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Mail } from 'lucide-react';
import api from '@/lib/api';

const inputCls =
  'w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot', { email });
      setSent(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join('. ') : (msg || 'Не удалось отправить запрос'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl text-foreground">
            Глобо<span className="italic">Атлас</span>
          </h1>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-success/15 text-emerald-700 flex items-center justify-center mb-3">
                <Mail size={20} />
              </div>
              <h2 className="font-serif text-2xl mb-2">Проверьте почту</h2>
              <p className="text-sm text-slate-600">
                Если аккаунт с адресом <span className="text-foreground">{email}</span> существует —
                на него отправлена ссылка для сброса пароля. Она действует 1 час.
              </p>
              <p className="text-xs text-slate-500 mt-4">
                Не пришло письмо? Проверьте папку «Спам» или попробуйте через 5 минут.
              </p>
              <Link href="/login" className="inline-block mt-6 text-sm text-brand hover:underline">
                ← Назад ко входу
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                  Восстановление доступа
                </div>
                <h2 className="font-serif text-3xl">Забыли пароль?</h2>
                <p className="text-sm text-slate-600 mt-2">
                  Введите email — пришлём ссылку для сброса.
                </p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="вы@почта.com"
                  required
                  className={inputCls}
                />

                {error && (
                  <div className="rounded-xl border border-danger/30 bg-danger/10 text-red-900 px-3 py-2 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand-soft transition-colors disabled:opacity-50"
                >
                  {loading ? 'Отправляем…' : (<>Прислать ссылку <ArrowRight size={16} /></>)}
                </button>
              </form>

              <Link href="/login" className="block mt-4 text-center text-sm text-slate-500 hover:text-foreground">
                ← Назад ко входу
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
