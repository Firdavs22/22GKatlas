'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Loader2, Trash2, Download, BookOpen } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, SectionLabel } from '@/components/ui';
import FileUpload from '@/components/FileUpload';
import AuthMedia from '@/components/AuthMedia';
import api, { clearAuthData } from '@/lib/api';

interface MeProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  avatar: string | null;
  consentGivenAt: string | null;
}

const inputCls =
  'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Администратор',
  teacher: 'Педагог',
  parent: 'Родитель',
  psychologist: 'Психолог',
  pediatrician: 'Педиатр',
};

export default function SettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);

  const [profileStatus, setProfileStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [profileError, setProfileError] = useState<string | null>(null);

  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newPwd2, setNewPwd2] = useState('');
  const [pwdStatus, setPwdStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [pwdError, setPwdError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePwd, setDeletePwd] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/me').then(r => {
      const data = r.data as MeProfile;
      setMe(data);
      setName(data.name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setAvatar(data.avatar || null);
    }).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  const saveProfile = async () => {
    setProfileStatus('saving');
    setProfileError(null);
    try {
      const { data } = await api.put('/me', {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        avatar: avatar || '',
      });
      setMe(prev => prev ? { ...prev, ...data } : data);
      setProfileStatus('saved');
      setTimeout(() => setProfileStatus(s => (s === 'saved' ? 'idle' : s)), 1500);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setProfileError(Array.isArray(msg) ? msg.join('. ') : (msg || 'Не удалось сохранить'));
      setProfileStatus('error');
    }
  };

  const changePassword = async () => {
    setPwdError(null);
    if (newPwd.length < 8) { setPwdError('Новый пароль должен быть не короче 8 символов'); return; }
    if (newPwd !== newPwd2) { setPwdError('Пароли не совпадают'); return; }
    setPwdStatus('saving');
    try {
      await api.put('/me/password', { oldPassword: oldPwd, newPassword: newPwd });
      setPwdStatus('saved');
      setOldPwd(''); setNewPwd(''); setNewPwd2('');
      setTimeout(() => setPwdStatus(s => (s === 'saved' ? 'idle' : s)), 1500);
      // Backend invalidates refresh-tokens. Force re-login.
      setTimeout(() => {
        clearAuthData();
        router.push('/login');
      }, 1500);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setPwdError(Array.isArray(msg) ? msg.join('. ') : (msg || 'Не удалось сменить пароль'));
      setPwdStatus('error');
    }
  };

  const confirmDelete = async () => {
    setDeleteError(null);
    setDeleting(true);
    try {
      await api.delete('/me', { data: { password: deletePwd, confirmation: deleteConfirm } });
      clearAuthData();
      router.push('/login');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setDeleteError(Array.isArray(msg) ? msg.join('. ') : (msg || 'Не удалось удалить аккаунт'));
    } finally {
      setDeleting(false);
    }
  };

  if (!loaded) {
    return (
      <PageLayout title="Настройки">
        <p className="text-sm text-slate-400 text-center py-12">Загрузка…</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout eyebrow="Аккаунт" title="Настройки">
      {/* PROFILE */}
      <Card padding="md" className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <SectionLabel>Профиль</SectionLabel>
            <h3 className="text-xl mt-0.5">Личные данные</h3>
            <p className="text-xs text-slate-500 mt-1">Роль: {ROLE_LABEL[me?.role || ''] || me?.role}</p>
          </div>
          <Button size="sm" onClick={saveProfile} disabled={profileStatus === 'saving'}>
            {profileStatus === 'saving' ? <Loader2 size={12} className="animate-spin" /> :
             profileStatus === 'saved'  ? <Check size={12} className="text-success" /> : null}
            Сохранить
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-5">
          <div className="flex flex-col items-center gap-2">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-brand-pale flex items-center justify-center">
              {avatar ? (
                <AuthMedia src={avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-serif text-3xl text-brand">{name.charAt(0).toUpperCase() || '?'}</span>
              )}
            </div>
            <FileUpload
              accept="image/*"
              onUpload={urls => setAvatar(urls[0] || null)}
              label={
                <span className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline cursor-pointer">
                  {avatar ? 'Заменить' : 'Загрузить'}
                </span>
              }
            />
            {avatar && (
              <button
                type="button"
                onClick={() => setAvatar(null)}
                className="text-xs text-slate-500 hover:text-danger"
              >
                Убрать
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                ФИО
              </label>
              <input value={name} onChange={e => setName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Email
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Телефон
              </label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7…" className={inputCls} />
            </div>
            {profileError && (
              <div className="rounded-xl border border-danger/30 bg-danger/10 text-red-900 px-3 py-2 text-xs">
                {profileError}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* PASSWORD */}
      <Card padding="md" className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <SectionLabel>Безопасность</SectionLabel>
            <h3 className="text-xl mt-0.5">Сменить пароль</h3>
            <p className="text-xs text-slate-500 mt-1">
              После смены пароля все ваши сессии (включая телефон) будут разлогинены.
            </p>
          </div>
          <Button size="sm" onClick={changePassword} disabled={pwdStatus === 'saving' || !oldPwd || !newPwd}>
            {pwdStatus === 'saving' ? <Loader2 size={12} className="animate-spin" /> :
             pwdStatus === 'saved'  ? <Check size={12} className="text-success" /> : null}
            Сменить
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
              Старый пароль
            </label>
            <input
              type="password"
              value={oldPwd}
              onChange={e => setOldPwd(e.target.value)}
              autoComplete="current-password"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
              Новый пароль
            </label>
            <input
              type="password"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
              Повторите
            </label>
            <input
              type="password"
              value={newPwd2}
              onChange={e => setNewPwd2(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              className={inputCls}
            />
          </div>
        </div>

        {pwdError && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 text-red-900 px-3 py-2 text-xs mt-3">
            {pwdError}
          </div>
        )}
      </Card>

      {/* ONBOARDING REPLAY */}
      <Card padding="md" className="mb-6">
        <div className="flex items-center justify-between">
          <div className="max-w-2xl">
            <SectionLabel>Подсказки</SectionLabel>
            <h3 className="text-xl mt-0.5 mb-1">Тур по приложению</h3>
            <p className="text-sm text-slate-600">
              Повторно показать обзорные подсказки при следующем входе.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await api.post('/me/onboarding/reset');
                alert('При следующем входе вы увидите тур');
              } catch { alert('Не удалось'); }
            }}
          >
            <BookOpen size={14} />
            Посмотреть тур
          </Button>
        </div>
      </Card>

      {/* DATA EXPORT */}
      <Card padding="md" className="mb-6">
        <div className="flex items-center justify-between">
          <div className="max-w-2xl">
            <SectionLabel>Ваши данные</SectionLabel>
            <h3 className="text-xl mt-0.5 mb-1">Экспорт персональных данных</h3>
            <p className="text-sm text-slate-600">
              Получите ZIP-архив со всеми данными, которые хранит о вас система: профиль,
              данные ребёнка (для родителей), фото из ленты и портфолио, прогресс,
              наблюдения, посещаемость. Право, гарантированное 152-ФЗ.
            </p>
          </div>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL || '/api'}/me/export?token=${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 inline-flex items-center gap-2 h-10 px-4 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors"
          >
            <Download size={14} />
            Скачать ZIP
          </a>
        </div>
      </Card>

      {/* DANGER ZONE */}
      <Card padding="md" className="border-danger/30">
        <SectionLabel>Удаление</SectionLabel>
        <h3 className="text-xl mt-0.5 mb-1">Удалить аккаунт</h3>
        <p className="text-sm text-slate-600 mb-3 max-w-2xl">
          После удаления ваши данные обезличиваются. Через 30 дней — физически удаляются
          из системы. <span className="text-danger font-medium">Это действие необратимо.</span>{' '}
          Прогресс ребёнка, посещаемость, наблюдения педагога — останутся в системе
          {' '}(они не привязаны только к вашему аккаунту), но связь «родитель — ребёнок» будет утеряна.
        </p>
        <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 size={14} />
          Удалить мой аккаунт
        </Button>
      </Card>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => !deleting && setDeleteOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-danger/15 text-danger flex items-center justify-center">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h3 className="font-serif text-xl">Удалить аккаунт?</h3>
                  <p className="text-xs text-slate-500">Это действие необратимо.</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                  Введите свой пароль
                </label>
                <input
                  type="password"
                  value={deletePwd}
                  onChange={e => setDeletePwd(e.target.value)}
                  autoComplete="current-password"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                  Для подтверждения напишите слово <span className="text-danger font-medium">УДАЛИТЬ</span>
                </label>
                <input
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  className={inputCls}
                  autoFocus
                />
              </div>
              {deleteError && (
                <div className="rounded-xl border border-danger/30 bg-danger/10 text-red-900 px-3 py-2 text-xs">
                  {deleteError}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                Отмена
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={confirmDelete}
                disabled={deleting || !deletePwd || deleteConfirm !== 'УДАЛИТЬ'}
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Удалить навсегда
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
