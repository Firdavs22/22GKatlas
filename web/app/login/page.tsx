'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ROLE_HOME } from '@/lib/types';

const inputCls =
  'w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      router.push(ROLE_HOME[user.role]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-3">
            Метод Марии Монтессори
          </div>
          <h1 className="font-serif text-5xl text-foreground leading-tight">
            Глобо<span className="italic">Атлас</span>
          </h1>
          <p className="text-sm text-slate-500 mt-3">
            Среда, в которой ребёнок ведёт сам.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="вы@почта.com"
                required
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
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
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand-soft transition-colors disabled:opacity-50"
            >
              {loading ? 'Вход…' : (<>Войти <ArrowRight size={16} /></>)}
            </button>
          </form>
        </div>

        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-6 text-xs text-slate-400 text-center space-y-0.5">
            <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Тестовые аккаунты</p>
            <p className="font-mono">admin@test.com · admin123</p>
            <p className="font-mono">teacher@test.com · teacher123</p>
            <p className="font-mono">parent@test.com · parent123</p>
            <p className="font-mono">psychologist@test.com · psych123</p>
            <p className="font-mono">pediatrician@test.com · peds123</p>
          </div>
        )}
      </div>
    </div>
  );
}
