'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import api from '@/lib/api';

const inputCls =
  'w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (!token) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-danger/15 text-danger flex items-center justify-center mb-3">
          <Lock size={20} />
        </div>
        <h2 className="font-serif text-2xl mb-2">Ссылка некорректна</h2>
        <p className="text-sm text-slate-600">
          Откройте ссылку из письма — она должна содержать токен.
        </p>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Пароль должен быть не короче 8 символов'); return; }
    if (password !== password2) { setError('Пароли не совпадают'); return; }
    setSubmitting(true);
    try {
      await api.post('/auth/reset', { token, password });
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join('. ') : (msg || 'Не удалось сменить пароль'));
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-success/20 text-emerald-700 flex items-center justify-center mb-3">
          <CheckCircle2 size={20} />
        </div>
        <h2 className="font-serif text-2xl mb-2">Пароль сменён</h2>
        <p className="text-sm text-slate-600">Перенаправляем на вход…</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
      <div className="mb-6">
        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
          Сброс пароля
        </div>
        <h2 className="font-serif text-3xl">Придумайте новый пароль</h2>
        <p className="text-sm text-slate-600 mt-2">
          Все ваши открытые сессии (включая телефон) будут разлогинены.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
            Новый пароль
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Минимум 8 символов"
            autoComplete="new-password"
            required
            minLength={8}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
            Повторите
          </label>
          <input
            type="password"
            value={password2}
            onChange={e => setPassword2(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            className={inputCls}
          />
        </div>

        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 text-red-900 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand-soft transition-colors disabled:opacity-50"
        >
          {submitting ? 'Сохраняем…' : (<>Сменить пароль <ArrowRight size={16} /></>)}
        </button>
      </form>

      <Link href="/login" className="block mt-4 text-center text-sm text-slate-500 hover:text-foreground">
        ← Назад ко входу
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl text-foreground">
            Глобо<span className="italic">Атлас</span>
          </h1>
        </div>
        <Suspense fallback={<div className="text-sm text-slate-400 text-center py-12">…</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
