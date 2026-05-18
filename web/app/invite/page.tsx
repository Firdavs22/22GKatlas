'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ROLE_HOME } from '@/lib/types';

const inputCls =
  'w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

interface InviteInfo {
  name: string;
  email: string;
  role: string;
  alreadyActivated: boolean;
}

function InviteForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();
  const token = params.get('token') || '';

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Ссылка приглашения некорректна');
      setChecking(false);
      return;
    }
    api
      .get('/auth/invite/check', { params: { token } })
      .then(r => setInfo(r.data))
      .catch(err => {
        const msg = err?.response?.data?.message || 'Ссылка недействительна или истекла';
        setError(msg);
      })
      .finally(() => setChecking(false));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Пароль должен быть не короче 8 символов');
      return;
    }
    if (password !== password2) {
      setError('Пароли не совпадают');
      return;
    }
    if (!consent) {
      setError('Нужно согласие на обработку персональных данных');
      return;
    }
    if (!info) return;
    setSubmitting(true);
    try {
      await api.post('/auth/invite/accept', { token, password, consent: true });
      const user = await login(info.email, password);
      router.push(ROLE_HOME[user.role] || '/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Не удалось активировать аккаунт';
      setError(msg);
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="text-sm text-slate-400 text-center py-12">
        Проверяем ссылку…
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-danger/15 text-danger flex items-center justify-center mb-3">
          <Lock size={20} />
        </div>
        <h2 className="font-serif text-2xl mb-2">Ссылка недействительна</h2>
        <p className="text-sm text-slate-600">{error}</p>
        <p className="text-xs text-slate-500 mt-4">
          Обратитесь к администратору сада — мы создадим новое приглашение.
        </p>
      </div>
    );
  }

  if (info?.alreadyActivated) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-success/20 text-emerald-700 flex items-center justify-center mb-3">
          <CheckCircle2 size={20} />
        </div>
        <h2 className="font-serif text-2xl mb-2">Аккаунт уже активирован</h2>
        <p className="text-sm text-slate-600 mb-1">
          {info.name}, у вас уже есть пароль.
        </p>
        <p className="text-xs text-slate-500 mb-5">
          Можете войти по адресу <span className="text-foreground">{info.email}</span>
        </p>
        <button
          onClick={() => router.push('/login')}
          className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand-soft transition-colors"
        >
          Перейти ко входу <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
      <div className="mb-6">
        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
          Приглашение в личный кабинет
        </div>
        <h2 className="font-serif text-3xl">
          Здравствуйте, <span className="italic">{info?.name}</span>
        </h2>
        <p className="text-sm text-slate-600 mt-2">
          Создайте пароль чтобы войти в личный кабинет родителя ГлобоАтлас.
          Аккаунт привязан к адресу <span className="text-foreground">{info?.email}</span>.
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
            Повторите пароль
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

        <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 leading-relaxed">
          <input
            type="checkbox"
            checked={consent}
            onChange={e => setConsent(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand shrink-0"
          />
          <span>
            Согласен(на) на обработку персональных данных в соответствии с{' '}
            <a href="/privacy" target="_blank" className="text-brand hover:underline">
              политикой конфиденциальности
            </a>{' '}
            (152-ФЗ). Без галки активировать аккаунт нельзя.
          </span>
        </label>

        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 text-red-900 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !consent}
          className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand-soft transition-colors disabled:opacity-50"
        >
          {submitting ? 'Создаём аккаунт…' : (<>Войти в кабинет <ArrowRight size={16} /></>)}
        </button>
      </form>
    </div>
  );
}

export default function InvitePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl text-foreground leading-tight">
            Глобо<span className="italic">Атлас</span>
          </h1>
        </div>
        <Suspense fallback={<div className="text-sm text-slate-400 text-center py-12">…</div>}>
          <InviteForm />
        </Suspense>
      </div>
    </div>
  );
}
