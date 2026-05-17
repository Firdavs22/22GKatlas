'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ROLE_HOME } from '@/lib/types';
import { API_URL } from '@/lib/network';
import api from '@/lib/api';

const inputCls =
  'w-full h-11 px-4 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

interface LoginBranding {
  title: string;
  titleSize: number;
  subtitle: string;
  subtitleSize: number;
  hasLogo: boolean;
  logoSize: number;
  loaded: boolean;
}

const DEFAULT_BRANDING: LoginBranding = {
  title: 'ГлобоАтлас',
  titleSize: 48,
  subtitle: 'Среда, в которой ребёнок ведёт сам.',
  subtitleSize: 14,
  hasLogo: false,
  logoSize: 96,
  loaded: false,
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<LoginBranding>(DEFAULT_BRANDING);
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    api.get('/site-content/login')
      .then(r => {
        const data = r.data || {};
        setBranding({
          title: typeof data.title === 'string' ? data.title : DEFAULT_BRANDING.title,
          titleSize: Number(data.titleSize) || DEFAULT_BRANDING.titleSize,
          subtitle: typeof data.subtitle === 'string' ? data.subtitle : DEFAULT_BRANDING.subtitle,
          subtitleSize: Number(data.subtitleSize) || DEFAULT_BRANDING.subtitleSize,
          hasLogo: Boolean(data.logoUrl),
          logoSize: Number(data.logoSize) || DEFAULT_BRANDING.logoSize,
          loaded: true,
        });
      })
      .catch(() => setBranding(b => ({ ...b, loaded: true })));
  }, []);

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
        {branding.loaded && (
          <div className="text-center mb-10">
            {branding.hasLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${API_URL}/api/site-content/public/logo`}
                alt={branding.title || 'Логотип'}
                className="mx-auto mb-4 object-contain w-auto max-w-full"
                style={{ height: `${branding.logoSize}px` }}
              />
            )}
            {branding.title && (
              <h1 className="font-serif text-foreground" style={{ fontSize: `${branding.titleSize}px`, lineHeight: 1.1 }}>
                {branding.title}
              </h1>
            )}
            {branding.subtitle && (
              <p className="text-slate-500 mt-3 whitespace-pre-line" style={{ fontSize: `${branding.subtitleSize}px` }}>
                {branding.subtitle}
              </p>
            )}
          </div>
        )}

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
            <p className="tabular-nums">admin@test.com · admin123</p>
            <p className="tabular-nums">teacher@test.com · teacher123</p>
            <p className="tabular-nums">parent@test.com · parent123</p>
            <p className="tabular-nums">psychologist@test.com · psych123</p>
            <p className="tabular-nums">pediatrician@test.com · peds123</p>
          </div>
        )}
      </div>
    </div>
  );
}
