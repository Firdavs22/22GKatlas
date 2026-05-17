'use client';
import { useEffect, useState } from 'react';
import { Check, Loader2, AlertCircle, X, Plus, Trash2 } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, SectionLabel } from '@/components/ui';
import FileUpload from '@/components/FileUpload';
import AuthMedia from '@/components/AuthMedia';
import api from '@/lib/api';

interface LoginContent {
  title: string;
  titleSize: number;       // px
  subtitle: string;
  subtitleSize: number;    // px
  logoUrl: string | null;
  logoSize: number;        // max height in px
}

interface SidebarContent {
  label: string;
  labelSize: number;       // px
  iconUrl: string | null;
  iconSize: number;        // px (square)
}

interface ZoneItem { n: string; title: string; desc: string; accent: string; }
interface StageItem { label: string; desc: string; }
interface AboutContent {
  intro: string;
  zones: ZoneItem[];
  stages: StageItem[];
}

const DEFAULT_LOGIN: LoginContent = {
  title: 'ГлобоАтлас',
  titleSize: 48,
  subtitle: 'Среда, в которой ребёнок ведёт сам.',
  subtitleSize: 14,
  logoUrl: null,
  logoSize: 96,
};

const DEFAULT_SIDEBAR: SidebarContent = {
  label: 'GloboAtlas',
  labelSize: 14,
  iconUrl: null,
  iconSize: 36,
};

const DEFAULT_ABOUT: AboutContent = {
  intro:
    'Среда устроена так, чтобы ребёнок мог сам выбирать материал, работать в своём темпе и осваивать навыки в естественной последовательности. Педагог — наблюдатель и проводник.',
  zones: [
    { n: '01', title: 'Практическая жизнь', desc: 'Уход за собой, уход за средой, контроль движений.', accent: 'text-success' },
    { n: '02', title: 'Сенсорика', desc: 'Изоляция качеств: размер, форма, цвет, текстура.', accent: 'text-success' },
    { n: '03', title: 'Математика', desc: 'Конкретное → абстрактное.', accent: 'text-brand-soft' },
    { n: '04', title: 'Язык', desc: 'Обогащение словаря, чтение и письмо.', accent: 'text-warn' },
    { n: '05', title: 'Космос', desc: 'Природа, география, история, биология.', accent: 'text-danger' },
  ],
  stages: [
    { label: 'Не начат', desc: 'Презентация ещё не проводилась.' },
    { label: 'Знакомство', desc: 'Педагог провёл первое знакомство с материалом.' },
    { label: 'Повторение', desc: 'Ребёнок практикуется самостоятельно.' },
    { label: 'Усвоено', desc: 'Уверенно демонстрирует навык в работе.' },
  ],
};

const inputCls =
  'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';
const taCls =
  'w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none';

function Slider({
  label, value, min, max, step = 1, unit = 'px', onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</label>
        <span className="text-xs text-slate-700 tabular-nums">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-brand"
      />
    </div>
  );
}

export default function AdminSiteContent() {
  const [login, setLogin] = useState<LoginContent>(DEFAULT_LOGIN);
  const [sidebar, setSidebar] = useState<SidebarContent>(DEFAULT_SIDEBAR);
  const [about, setAbout] = useState<AboutContent>(DEFAULT_ABOUT);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/site-content').then(r => {
      const data = r.data || {};
      if (data.login) setLogin({ ...DEFAULT_LOGIN, ...data.login });
      if (data.sidebar) setSidebar({ ...DEFAULT_SIDEBAR, ...data.sidebar });
      if (data.about) setAbout({ ...DEFAULT_ABOUT, ...data.about });
    }).catch(() => {});
  }, []);

  const save = async (key: 'login' | 'sidebar' | 'about', value: unknown) => {
    setSavingKey(key);
    setError(null);
    try {
      await api.put(`/site-content/${key}`, { value });
      setSavedKey(key);
      setTimeout(() => setSavedKey(s => (s === key ? null : s)), 1500);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Не удалось сохранить');
    } finally {
      setSavingKey(null);
    }
  };

  const StatusIcon = ({ k }: { k: string }) =>
    savingKey === k ? <Loader2 size={12} className="animate-spin" /> :
    savedKey === k ? <Check size={12} className="text-success" /> : null;

  return (
    <PageLayout
      eyebrow="Брендинг и контент"
      title="Внешний вид системы"
      actions={
        error ? (
          <span className="inline-flex items-center gap-1.5 text-xs px-3 h-9 rounded-full bg-danger/10 text-danger">
            <AlertCircle size={12} /> {error}
          </span>
        ) : null
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LOGIN */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-3">
            <div>
              <SectionLabel>Экран входа</SectionLabel>
              <h3 className="text-xl mt-0.5">Логотип, заголовок, подпись</h3>
            </div>
            <Button size="sm" onClick={() => save('login', login)} disabled={savingKey === 'login'}>
              <StatusIcon k="login" /> Сохранить
            </Button>
          </div>

          <div className="space-y-4">
            {/* Logo */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Логотип
              </label>
              {login.logoUrl ? (
                <div className="flex items-center gap-3 mb-2">
                  <div className="rounded-xl bg-slate-50 p-2 inline-flex">
                    <AuthMedia
                      src={login.logoUrl}
                      alt="Логотип"
                      className="object-contain"
                      style={{ height: `${login.logoSize}px`, maxWidth: `${login.logoSize * 4}px` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setLogin(s => ({ ...s, logoUrl: null }))}
                    className="inline-flex items-center gap-1 text-xs text-danger hover:underline"
                  >
                    <Trash2 size={12} /> Убрать
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-400 mb-2">Не загружен. SVG сохранится без изменений.</div>
              )}
              <FileUpload
                accept="image/*,image/svg+xml"
                onUpload={urls => setLogin(s => ({ ...s, logoUrl: urls[0] || null }))}
                label={
                  <span className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline cursor-pointer">
                    Загрузить новый
                  </span>
                }
              />
            </div>

            <Slider
              label="Высота логотипа"
              value={login.logoSize}
              min={48}
              max={300}
              onChange={n => setLogin(s => ({ ...s, logoSize: n }))}
            />

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Заголовок (оставьте пустым — будет скрыт)
              </label>
              <input
                value={login.title}
                onChange={e => setLogin(s => ({ ...s, title: e.target.value }))}
                className={inputCls}
              />
            </div>
            <Slider
              label="Размер шрифта заголовка"
              value={login.titleSize}
              min={20}
              max={96}
              onChange={n => setLogin(s => ({ ...s, titleSize: n }))}
            />

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Подпись (оставьте пустой — будет скрыта)
              </label>
              <textarea
                rows={2}
                value={login.subtitle}
                onChange={e => setLogin(s => ({ ...s, subtitle: e.target.value }))}
                className={taCls}
              />
            </div>
            <Slider
              label="Размер шрифта подписи"
              value={login.subtitleSize}
              min={10}
              max={32}
              onChange={n => setLogin(s => ({ ...s, subtitleSize: n }))}
            />

            {/* Preview */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-6 text-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-3">Предпросмотр</div>
              {login.logoUrl && (
                <AuthMedia
                  src={login.logoUrl}
                  alt=""
                  className="mx-auto mb-3 object-contain"
                  style={{ height: `${login.logoSize}px`, width: 'auto', maxWidth: '100%' }}
                />
              )}
              {login.title && (
                <div className="font-serif" style={{ fontSize: `${login.titleSize}px`, lineHeight: 1.1 }}>
                  {login.title}
                </div>
              )}
              {login.subtitle && (
                <div className="text-slate-500 mt-2 whitespace-pre-line" style={{ fontSize: `${login.subtitleSize}px` }}>
                  {login.subtitle}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* SIDEBAR */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-3">
            <div>
              <SectionLabel>Боковое меню</SectionLabel>
              <h3 className="text-xl mt-0.5">Иконка и подпись бренда</h3>
            </div>
            <Button size="sm" onClick={() => save('sidebar', sidebar)} disabled={savingKey === 'sidebar'}>
              <StatusIcon k="sidebar" /> Сохранить
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Иконка (пусто — будет показана буква «G»)
              </label>
              {sidebar.iconUrl ? (
                <div className="flex items-center gap-3 mb-2">
                  <div className="rounded-xl bg-slate-50 p-2 inline-flex">
                    <AuthMedia
                      src={sidebar.iconUrl}
                      alt="Иконка"
                      className="object-contain"
                      style={{ width: `${sidebar.iconSize}px`, height: `${sidebar.iconSize}px` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSidebar(s => ({ ...s, iconUrl: null }))}
                    className="inline-flex items-center gap-1 text-xs text-danger hover:underline"
                  >
                    <Trash2 size={12} /> Убрать
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-400 mb-2">Не загружена.</div>
              )}
              <FileUpload
                accept="image/*,image/svg+xml"
                onUpload={urls => setSidebar(s => ({ ...s, iconUrl: urls[0] || null }))}
                label={
                  <span className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline cursor-pointer">
                    Загрузить
                  </span>
                }
              />
            </div>

            <Slider
              label="Размер иконки"
              value={sidebar.iconSize}
              min={24}
              max={72}
              onChange={n => setSidebar(s => ({ ...s, iconSize: n }))}
            />

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Подпись (пусто — без подписи)
              </label>
              <input
                value={sidebar.label}
                onChange={e => setSidebar(s => ({ ...s, label: e.target.value }))}
                className={inputCls}
              />
            </div>

            <Slider
              label="Размер шрифта подписи"
              value={sidebar.labelSize}
              min={10}
              max={22}
              onChange={n => setSidebar(s => ({ ...s, labelSize: n }))}
            />

            {/* Preview */}
            <div className="rounded-2xl border border-slate-100 bg-white p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Предпросмотр</div>
              <div className="flex items-center gap-3">
                {sidebar.iconUrl ? (
                  <AuthMedia
                    src={sidebar.iconUrl}
                    alt=""
                    className="object-contain"
                    style={{ width: `${sidebar.iconSize}px`, height: `${sidebar.iconSize}px` }}
                  />
                ) : (
                  <div
                    className="rounded-xl bg-brand text-white flex items-center justify-center font-serif"
                    style={{ width: `${sidebar.iconSize}px`, height: `${sidebar.iconSize}px`, fontSize: `${sidebar.iconSize / 2}px` }}
                  >
                    G
                  </div>
                )}
                {sidebar.label && (
                  <div className="font-medium text-foreground" style={{ fontSize: `${sidebar.labelSize}px` }}>
                    {sidebar.label}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ABOUT */}
      <Card padding="md" className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <SectionLabel>Страница «О нашей системе»</SectionLabel>
            <h3 className="text-xl mt-0.5">Вступление, зоны, стадии</h3>
          </div>
          <Button size="sm" onClick={() => save('about', about)} disabled={savingKey === 'about'}>
            <StatusIcon k="about" /> Сохранить
          </Button>
        </div>

        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
            Вступление
          </label>
          <textarea
            rows={4}
            value={about.intro}
            onChange={e => setAbout(s => ({ ...s, intro: e.target.value }))}
            className={taCls}
          />
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between mb-2">
            <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Зоны развития
            </label>
            <button
              type="button"
              onClick={() =>
                setAbout(s => ({
                  ...s,
                  zones: [
                    ...s.zones,
                    { n: String(s.zones.length + 1).padStart(2, '0'), title: '', desc: '', accent: 'text-brand-soft' },
                  ],
                }))
              }
              className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
            >
              <Plus size={12} /> Добавить зону
            </button>
          </div>
          <div className="space-y-3">
            {about.zones.map((z, i) => (
              <div key={i} className="rounded-xl border border-slate-100 p-3 bg-slate-50/40">
                <div className="grid grid-cols-[60px_1fr_auto] gap-2 mb-2 items-center">
                  <input
                    value={z.n}
                    onChange={e =>
                      setAbout(s => ({
                        ...s,
                        zones: s.zones.map((zz, ii) => (ii === i ? { ...zz, n: e.target.value } : zz)),
                      }))
                    }
                    placeholder="01"
                    className={inputCls}
                  />
                  <input
                    value={z.title}
                    onChange={e =>
                      setAbout(s => ({
                        ...s,
                        zones: s.zones.map((zz, ii) => (ii === i ? { ...zz, title: e.target.value } : zz)),
                      }))
                    }
                    placeholder="Название зоны"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAbout(s => ({ ...s, zones: s.zones.filter((_, ii) => ii !== i) }))
                    }
                    className="h-10 px-3 rounded-xl text-slate-400 hover:text-danger hover:bg-danger/10"
                    aria-label="Удалить"
                  >
                    <X size={14} />
                  </button>
                </div>
                <textarea
                  value={z.desc}
                  rows={2}
                  onChange={e =>
                    setAbout(s => ({
                      ...s,
                      zones: s.zones.map((zz, ii) => (ii === i ? { ...zz, desc: e.target.value } : zz)),
                    }))
                  }
                  placeholder="Описание"
                  className={taCls}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between mb-2">
            <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Стадии освоения
            </label>
            <button
              type="button"
              onClick={() =>
                setAbout(s => ({ ...s, stages: [...s.stages, { label: '', desc: '' }] }))
              }
              className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
            >
              <Plus size={12} /> Добавить
            </button>
          </div>
          <div className="space-y-2">
            {about.stages.map((st, i) => (
              <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-start">
                <input
                  value={st.label}
                  placeholder="Название"
                  onChange={e =>
                    setAbout(s => ({
                      ...s,
                      stages: s.stages.map((ss, ii) => (ii === i ? { ...ss, label: e.target.value } : ss)),
                    }))
                  }
                  className={inputCls}
                />
                <textarea
                  rows={1}
                  value={st.desc}
                  placeholder="Описание"
                  onChange={e =>
                    setAbout(s => ({
                      ...s,
                      stages: s.stages.map((ss, ii) => (ii === i ? { ...ss, desc: e.target.value } : ss)),
                    }))
                  }
                  className={taCls}
                />
                <button
                  type="button"
                  onClick={() =>
                    setAbout(s => ({ ...s, stages: s.stages.filter((_, ii) => ii !== i) }))
                  }
                  className="h-10 px-3 rounded-xl text-slate-400 hover:text-danger hover:bg-danger/10"
                  aria-label="Удалить"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </PageLayout>
  );
}
