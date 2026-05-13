'use client';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

interface NavItem { label: string; href: string; }

const NAV_ITEMS: Record<string, NavItem[]> = {
  admin: [
    { label: 'Дашборд', href: '/admin' },
    { label: 'Группы', href: '/admin/groups' },
    { label: 'Дети', href: '/admin/children' },
    { label: 'Родители', href: '/admin/parents' },
    { label: 'Сотрудники', href: '/admin/staff' },
    { label: 'Навыки', href: '/admin/skills' },
    { label: 'Расписание', href: '/admin/schedule' },
    { label: 'Посещаемость', href: '/admin/attendance' },
    { label: 'Оплата', href: '/admin/payments' },
    { label: 'Отчёты', href: '/admin/reports' },
    { label: 'События', href: '/admin/events' },
    { label: 'Меню', href: '/admin/menu' },
    { label: 'Рассылки', href: '/admin/broadcasts' },
  ],
  teacher: [
    { label: 'Матрица', href: '/teacher' },
    { label: 'Тепловая карта', href: '/teacher/heatmap' },
    { label: 'Дневник', href: '/teacher/diary' },
    { label: 'Лента', href: '/teacher/feed' },
    { label: 'Чаты', href: '/teacher/chats' },
    { label: 'Расписание', href: '/teacher/schedule' },
    { label: 'Рекомендации', href: '/teacher/home-tasks' },
    { label: 'Портфолио', href: '/teacher/portfolio' },
  ],
  parent: [
    { label: 'Главная', href: '/parent' },
    { label: 'Лента', href: '/parent/feed' },
    { label: 'Прогресс', href: '/parent/progress' },
    { label: 'Чаты', href: '/parent/chats' },
    { label: 'Посещаемость', href: '/parent/attendance' },
    { label: 'Расписание', href: '/parent/schedule' },
    { label: 'Меню', href: '/parent/menu' },
    { label: 'Оплата', href: '/parent/payments' },
  ],
  psychologist: [
    { label: 'Дети', href: '/psychologist' },
    { label: 'Чаты', href: '/psychologist/chats' },
  ],
  pediatrician: [
    { label: 'Дети', href: '/pediatrician' },
    { label: 'Чаты', href: '/pediatrician/chats' },
    { label: 'Меню', href: '/pediatrician/menu' },
  ],
};

export default function NavBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;
  const items = NAV_ITEMS[user.role] || [];
  const isActive = (href: string) => (
    pathname === href || (href !== `/${user.role}` && pathname.startsWith(href + '/'))
  );

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
      <div className="flex items-center gap-6 min-w-0 flex-1">
        <Link href="/" className="text-indigo-700 font-bold text-lg shrink-0">ГлобоАтлас</Link>
        <div className="flex gap-1 overflow-x-auto whitespace-nowrap min-w-0 pb-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Link href="/notifications" className="text-gray-500 hover:text-indigo-600 text-sm">🔔</Link>
        <span className="text-sm text-gray-600">{user.name}</span>
        <button onClick={logout} className="text-sm text-red-500 hover:text-red-700">Выйти</button>
      </div>
    </nav>
  );
}
