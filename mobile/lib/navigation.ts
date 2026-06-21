import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { Role } from './types';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export interface MobileNavItem {
  label: string;
  description: string;
  href?: string;
  icon: IconName;
  tone: 'brand' | 'success' | 'warn' | 'danger' | 'info' | 'neutral';
  implemented?: boolean;
  /** Hide from regular admin — only superadmin sees this item. */
  superadminOnly?: boolean;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Администратор',
  superadmin: 'Главный администратор',
  teacher: 'Педагог',
  parent: 'Родитель',
  psychologist: 'Психолог',
  pediatrician: 'Педиатр',
};

export const ROLE_HOME_TITLE: Record<Role, string> = {
  admin: 'Дашборд',
  superadmin: 'Дашборд',
  teacher: 'Матрица прогресса',
  parent: 'Главная',
  psychologist: 'Дети',
  pediatrician: 'Дети',
};

export const ROLE_NAV: Record<Role, MobileNavItem[]> = {
  superadmin: [], // mirrored from admin after the record is constructed
  parent: [
    { label: 'Карта развития', description: 'Навыки, история и наблюдения', href: '/parent/progress', icon: 'map-outline', tone: 'brand', implemented: true },
    { label: 'Лента группы', description: 'Новости и фотографии', href: '/feed', icon: 'newspaper-outline', tone: 'warn', implemented: true },
    { label: 'Чаты', description: 'Педагог и специалисты', href: '/chats', icon: 'chatbubbles-outline', tone: 'info', implemented: true },
    { label: 'Посещаемость', description: 'Дни присутствия и пропуски', href: '/parent/attendance', icon: 'checkbox-outline', tone: 'success', implemented: true },
    { label: 'Расписание', description: 'Режим дня группы', href: '/parent/schedule', icon: 'calendar-outline', tone: 'brand', implemented: true },
    { label: 'Оплата', description: 'Начисления и статус', href: '/parent/payments', icon: 'wallet-outline', tone: 'danger', implemented: true },
    { label: 'Меню', description: 'Питание по дням', href: '/parent/menu', icon: 'restaurant-outline', tone: 'warn', implemented: true },
    { label: 'Рекомендации', description: 'Домашние задания специалистов', href: '/parent/home-tasks', icon: 'list-outline', tone: 'success', implemented: true },
    { label: 'Дневник', description: 'Записи от педагогов', href: '/parent/diary', icon: 'journal-outline', tone: 'brand', implemented: true },
    { label: 'База знаний', description: 'Материалы для родителей', href: '/parent/knowledge', icon: 'book-outline', tone: 'info', implemented: true },
    { label: 'Запись на прием', description: 'Психолог и педиатр', href: '/parent/appointments', icon: 'medkit-outline', tone: 'brand', implemented: true },
    { label: 'Обратная связь', description: 'Сообщение заведующей, можно анонимно', href: '/parent/feedback', icon: 'chatbox-ellipses-outline', tone: 'info', implemented: true },
    { label: 'О системе', description: 'Описание и материалы сада', href: '/parent/about', icon: 'information-circle-outline', tone: 'neutral', implemented: true },
    { label: 'Настройки', description: 'Пароль, экспорт данных, удаление аккаунта', href: '/parent/settings', icon: 'settings-outline', tone: 'neutral', implemented: true },
  ],
  teacher: [
    { label: 'Дети группы', description: 'Список и карточки детей', href: '/teacher', icon: 'school-outline', tone: 'brand', implemented: true },
    { label: 'Матрица прогресса', description: 'Навыки детей группы', href: '/teacher/progress', icon: 'grid-outline', tone: 'brand', implemented: true },
    { label: 'Тепловая карта', description: 'Динамика по зонам', href: '/teacher/heatmap', icon: 'analytics-outline', tone: 'warn', implemented: true },
    { label: 'Дневник', description: 'Наблюдения по детям', href: '/teacher/diary', icon: 'create-outline', tone: 'success', implemented: true },
    { label: 'Лента группы', description: 'Публикации для родителей', href: '/feed', icon: 'newspaper-outline', tone: 'warn', implemented: true },
    { label: 'Портфолио', description: 'Работы и фотографии', href: '/teacher/portfolio', icon: 'images-outline', tone: 'info', implemented: true },
    { label: 'Рекомендации', description: 'Домашние задания', href: '/teacher/home-tasks', icon: 'clipboard-outline', tone: 'success', implemented: true },
    { label: 'Расписание', description: 'Дневной план группы', href: '/teacher/schedule', icon: 'calendar-outline', tone: 'brand', implemented: true },
    { label: 'Чаты', description: 'Родители и специалисты', href: '/chats', icon: 'chatbubbles-outline', tone: 'info', implemented: true },
  ],
  admin: [
    { label: 'Группы', description: 'Состав и педагоги', href: '/admin/groups', icon: 'people-outline', tone: 'brand', implemented: true },
    { label: 'Дети', description: 'Карточки и родители', href: '/admin/children', icon: 'school-outline', tone: 'success', implemented: true },
    { label: 'Сотрудники', description: 'Роли и приглашения', href: '/admin/staff', icon: 'briefcase-outline', tone: 'info', implemented: true },
    { label: 'Навыки', description: 'Дерево развития', icon: 'library-outline', tone: 'warn' },
    { label: 'Посещаемость', description: 'Отметки по группам', icon: 'checkbox-outline', tone: 'success' },
    { label: 'Оплата', description: 'Начисления и статусы', icon: 'wallet-outline', tone: 'danger' },
    { label: 'События', description: 'Праздники и объявления', href: '/admin/events', icon: 'calendar-outline', tone: 'warn', implemented: true },
    { label: 'Рассылки', description: 'Объявления для групп', href: '/admin/broadcasts', icon: 'megaphone-outline', tone: 'brand', implemented: true },
    { label: 'Обратная связь', description: 'Сообщения от родителей', href: '/admin/feedback', icon: 'chatbox-ellipses-outline', tone: 'info', implemented: true, superadminOnly: true },
    { label: 'Контент', description: 'Логин, sidebar и about', icon: 'settings-outline', tone: 'neutral' },
  ],
  psychologist: [
    { label: 'Дети', description: 'Назначенные дети', href: '/psychologist', icon: 'school-outline', tone: 'brand', implemented: true },
    { label: 'Рекомендации', description: 'Задания для родителей', href: '/psychologist/recommendations', icon: 'clipboard-outline', tone: 'success', implemented: true },
    { label: 'Запись на прием', description: 'Свободные слоты', href: '/psychologist/slots', icon: 'calendar-number-outline', tone: 'warn', implemented: true },
    { label: 'Чаты', description: 'Родители и педагоги', href: '/chats', icon: 'chatbubbles-outline', tone: 'info', implemented: true },
  ],
  pediatrician: [
    { label: 'Дети', description: 'Назначенные дети', href: '/pediatrician', icon: 'school-outline', tone: 'brand', implemented: true },
    { label: 'Рекомендации', description: 'Назначения и советы', href: '/pediatrician/recommendations', icon: 'clipboard-outline', tone: 'success', implemented: true },
    { label: 'Запись на прием', description: 'Свободные слоты', href: '/pediatrician/slots', icon: 'calendar-number-outline', tone: 'warn', implemented: true },
    { label: 'Меню', description: 'Питание и ограничения', href: '/parent/menu', icon: 'restaurant-outline', tone: 'danger', implemented: true },
    { label: 'Чаты', description: 'Родители и педагоги', href: '/chats', icon: 'chatbubbles-outline', tone: 'info', implemented: true },
  ],
};

// Superadmin uses the same nav as admin — declared after the object literal to avoid
// duplicating the long admin list.
ROLE_NAV.superadmin = ROLE_NAV.admin;

export function toneColors(tone: MobileNavItem['tone']) {
  const map = {
    brand: { bg: '#E8EEF5', fg: '#0F5192' },
    success: { bg: '#EAF5EE', fg: '#1E5731' },
    warn: { bg: '#FBEFE3', fg: '#7A4A1F' },
    danger: { bg: '#FBE9E9', fg: '#7C2424' },
    info: { bg: '#E8F3FB', fg: '#0F3D6B' },
    neutral: { bg: '#F1F5F9', fg: '#64748B' },
  } as const;
  return map[tone];
}
