'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Home, Map, Newspaper, MessageCircle, CalendarCheck, Calendar,
  UtensilsCrossed, Wallet, ListChecks, BookOpen, Bell, LogOut,
  Grid3x3, Flame, NotebookPen, Images, ClipboardList, Users,
  Stethoscope, Brain, Megaphone, BarChart3, ChefHat, GraduationCap,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { API_URL } from '@/lib/network';
import { Child } from '@/lib/types';

interface SidebarBranding {
  label: string;
  labelSize: number;
  hasIcon: boolean;
  iconSize: number;
}

const DEFAULT_SIDEBAR: SidebarBranding = {
  label: 'GloboAtlas',
  labelSize: 14,
  hasIcon: false,
  iconSize: 36,
};

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  badge?: number;
}

const NAV: Record<string, NavItem[]> = {
  parent: [
    { href: '/parent', label: 'Главная', icon: Home },
    { href: '/parent/progress', label: 'Карта развития', icon: Map },
    { href: '/parent/feed', label: 'Лента группы', icon: Newspaper },
    { href: '/parent/chats', label: 'Чаты', icon: MessageCircle },
    { href: '/parent/attendance', label: 'Посещаемость', icon: CalendarCheck },
    { href: '/parent/schedule', label: 'Расписание', icon: Calendar },
    { href: '/parent/menu', label: 'Меню', icon: UtensilsCrossed },
    { href: '/parent/payments', label: 'Оплата', icon: Wallet },
    { href: '/parent/home-tasks', label: 'Рекомендации', icon: ListChecks },
    { href: '/parent/knowledge', label: 'База знаний', icon: BookOpen },
    { href: '/parent/appointments', label: 'Запись на приём', icon: CalendarCheck },
    { href: '/parent/about', label: 'О системе', icon: BookOpen },
  ],
  teacher: [
    { href: '/teacher', label: 'Матрица прогресса', icon: Grid3x3 },
    { href: '/teacher/heatmap', label: 'Тепловая карта', icon: Flame },
    { href: '/teacher/diary', label: 'Дневник', icon: NotebookPen },
    { href: '/teacher/feed', label: 'Лента группы', icon: Newspaper },
    { href: '/teacher/portfolio', label: 'Портфолио', icon: Images },
    { href: '/teacher/home-tasks', label: 'Рекомендации', icon: ClipboardList },
    { href: '/teacher/chats', label: 'Чаты', icon: MessageCircle },
    { href: '/teacher/schedule', label: 'Расписание', icon: Calendar },
  ],
  admin: [
    { href: '/admin', label: 'Дашборд', icon: BarChart3 },
    { href: '/admin/groups', label: 'Группы', icon: Users },
    { href: '/admin/children', label: 'Дети', icon: GraduationCap },
    { href: '/admin/parents', label: 'Родители', icon: Users },
    { href: '/admin/staff', label: 'Сотрудники', icon: Users },
    { href: '/admin/skills', label: 'Навыки', icon: BookOpen },
    { href: '/admin/schedule', label: 'Расписание', icon: Calendar },
    { href: '/admin/attendance', label: 'Посещаемость', icon: CalendarCheck },
    { href: '/admin/payments', label: 'Оплата', icon: Wallet },
    { href: '/admin/reports', label: 'Отчёты', icon: BarChart3 },
    { href: '/admin/events', label: 'События', icon: Calendar },
    { href: '/admin/menu', label: 'Меню', icon: ChefHat },
    { href: '/admin/broadcasts', label: 'Рассылки', icon: Megaphone },
    { href: '/admin/knowledge', label: 'База знаний', icon: BookOpen },
    { href: '/admin/site-content', label: 'О системе и логин', icon: Settings },
  ],
  psychologist: [
    { href: '/psychologist', label: 'Дети', icon: GraduationCap },
    { href: '/psychologist/recommendations', label: 'Рекомендации', icon: ClipboardList },
    { href: '/psychologist/slots', label: 'Запись на приём', icon: CalendarCheck },
    { href: '/psychologist/chats', label: 'Чаты', icon: MessageCircle },
  ],
  pediatrician: [
    { href: '/pediatrician', label: 'Дети', icon: GraduationCap },
    { href: '/pediatrician/recommendations', label: 'Рекомендации', icon: ClipboardList },
    { href: '/pediatrician/slots', label: 'Запись на приём', icon: CalendarCheck },
    { href: '/pediatrician/chats', label: 'Чаты', icon: MessageCircle },
    { href: '/pediatrician/menu', label: 'Меню', icon: UtensilsCrossed },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  parent: 'Родитель',
  teacher: 'Педагог',
  admin: 'Администратор',
  psychologist: 'Психолог',
  pediatrician: 'Педиатр',
};

const ROLE_ICON: Record<string, typeof Home> = {
  parent: Home,
  teacher: GraduationCap,
  admin: Settings,
  psychologist: Brain,
  pediatrician: Stethoscope,
};

function calcAgeYears(birthDate: string): number {
  const b = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) years--;
  return years;
}

function ContextCard() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'parent' || user.role === 'teacher') {
      api.get('/children').then(r => setChildren(r.data)).catch(() => {});
    }
  }, [user]);

  if (!user) return null;

  if (user.role === 'parent' && children[0]) {
    const child = children[0];
    const age = calcAgeYears(child.birthDate);
    const initial = child.name.charAt(0).toUpperCase();
    return (
      <div className="rounded-2xl bg-brand-pale/50 p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-serif text-lg text-brand shrink-0">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm text-foreground truncate">{child.name}</div>
          <div className="text-xs text-slate-500 truncate">
            {child.group?.name || 'Без группы'} · {age} {age === 1 ? 'год' : age < 5 ? 'года' : 'лет'}
          </div>
        </div>
      </div>
    );
  }

  if (user.role === 'teacher' && children[0]?.group) {
    const group = children[0].group;
    const count = children.length;
    const Icon = ROLE_ICON[user.role];
    return (
      <div className="rounded-2xl bg-brand-pale/50 p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-brand shrink-0">
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm text-foreground truncate">{group.name}</div>
          <div className="text-xs text-slate-500 truncate">
            {group.ageRange} · {count} {count === 1 ? 'ребёнок' : count < 5 ? 'ребёнка' : 'детей'}
          </div>
        </div>
      </div>
    );
  }

  const Icon = ROLE_ICON[user.role];
  return (
    <div className="rounded-2xl bg-brand-pale/50 p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-brand shrink-0">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm text-foreground truncate">{user.name}</div>
        <div className="text-xs text-slate-500 truncate">{ROLE_LABEL[user.role]}</div>
      </div>
    </div>
  );
}

export default function AppSidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [unreadChats, setUnreadChats] = useState(0);
  const [brand, setBrand] = useState<SidebarBranding>(DEFAULT_SIDEBAR);

  useEffect(() => {
    if (!user) return;
    let stopped = false;
    const load = () => api
      .get('/chats/unread-total')
      .then(r => { if (!stopped) setUnreadChats(r.data?.total || 0); })
      .catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => { stopped = true; clearInterval(id); };
  }, [user, pathname]);

  useEffect(() => {
    if (!user) return;
    api.get('/site-content/sidebar')
      .then(r => {
        const data = r.data || {};
        setBrand({
          label: typeof data.label === 'string' ? data.label : DEFAULT_SIDEBAR.label,
          labelSize: Number(data.labelSize) || DEFAULT_SIDEBAR.labelSize,
          hasIcon: Boolean(data.iconUrl),
          iconSize: Number(data.iconSize) || DEFAULT_SIDEBAR.iconSize,
        });
      })
      .catch(() => {});
  }, [user]);

  if (!user) return null;

  const items = NAV[user.role] || [];
  const isActive = (href: string) =>
    pathname === href || (href !== `/${user.role}` && pathname.startsWith(href + '/'));

  return (
    <aside className="hidden md:flex w-64 shrink-0 border-r border-slate-200 bg-white flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        {brand.hasIcon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${API_URL}/api/site-content/public/sidebar-icon`}
            alt=""
            className="object-contain shrink-0"
            style={{ width: `${brand.iconSize}px`, height: `${brand.iconSize}px` }}
          />
        ) : (
          <div
            className="rounded-xl bg-brand text-white flex items-center justify-center font-serif shrink-0"
            style={{
              width: `${brand.iconSize}px`,
              height: `${brand.iconSize}px`,
              fontSize: `${brand.iconSize / 2}px`,
            }}
          >
            G
          </div>
        )}
        <div className="leading-tight min-w-0">
          {brand.label && (
            <div
              className="font-medium text-foreground truncate"
              style={{ fontSize: `${brand.labelSize}px` }}
            >
              {brand.label}
            </div>
          )}
          <div className="text-[10px] uppercase tracking-wider text-slate-500">
            {ROLE_LABEL[user.role]}
          </div>
        </div>
      </div>

      {/* Context card */}
      <div className="px-3 mb-4">
        <ContextCard />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-0.5">
          {items.map(item => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const isChats = item.href.endsWith('/chats');
            const badge = isChats ? unreadChats : item.badge ?? 0;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                    active
                      ? 'bg-brand-pale/60 text-brand font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {badge > 0 && (
                    <span className="bg-brand text-white text-[11px] min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center font-medium">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-slate-200 space-y-0.5">
        <Link
          href="/notifications"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
        >
          <Bell size={18} className="shrink-0" />
          <span className="flex-1 truncate">Уведомления</span>
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
        >
          <LogOut size={18} className="shrink-0" />
          <span className="flex-1 text-left truncate">{user.name}</span>
        </button>
      </div>
    </aside>
  );
}
