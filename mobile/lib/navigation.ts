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
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Администратор',
  teacher: 'Педагог',
  parent: 'Родитель',
  psychologist: 'Психолог',
  pediatrician: 'Педиатр',
};

export const ROLE_HOME_TITLE: Record<Role, string> = {
  admin: 'Дашборд',
  teacher: 'Матрица прогресса',
  parent: 'Главная',
  psychologist: 'Дети',
  pediatrician: 'Дети',
};

export const ROLE_NAV: Record<Role, MobileNavItem[]> = {
  parent: [
    { label: 'Карта развития', description: 'Навыки, история и наблюдения', href: '/parent/progress', icon: 'map-outline', tone: 'brand', implemented: true },
    { label: 'Лента группы', description: 'Новости и фотографии', href: '/(tabs)/feed', icon: 'newspaper-outline', tone: 'warn', implemented: true },
    { label: 'Чаты', description: 'Педагог и специалисты', href: '/(tabs)/chats', icon: 'chatbubbles-outline', tone: 'info', implemented: true },
    { label: 'Посещаемость', description: 'Дни присутствия и пропуски', href: '/parent/attendance', icon: 'checkbox-outline', tone: 'success', implemented: true },
    { label: 'Расписание', description: 'Режим дня группы', href: '/parent/schedule', icon: 'calendar-outline', tone: 'brand', implemented: true },
    { label: 'Оплата', description: 'Начисления и статус', href: '/parent/payments', icon: 'wallet-outline', tone: 'danger', implemented: true },
    { label: 'Меню', description: 'Питание по дням', href: '/parent/menu', icon: 'restaurant-outline', tone: 'warn', implemented: true },
    { label: 'Рекомендации', description: 'Домашние задания специалистов', href: '/parent/home-tasks', icon: 'list-outline', tone: 'success', implemented: true },
    { label: 'Дневник', description: 'Записи от педагогов', href: '/parent/diary', icon: 'journal-outline', tone: 'brand', implemented: true },
    { label: 'База знаний', description: 'Материалы для родителей', href: '/parent/knowledge', icon: 'book-outline', tone: 'info', implemented: true },
    { label: 'Запись на прием', description: 'Психолог и педиатр', href: '/parent/appointments', icon: 'medkit-outline', tone: 'brand', implemented: true },
    { label: 'О системе', description: 'Описание и материалы сада', href: '/parent/about', icon: 'information-circle-outline', tone: 'neutral', implemented: true },
  ],
  teacher: [
    { label: 'Матрица прогресса', description: 'Навыки детей группы', href: '/(tabs)/home', icon: 'grid-outline', tone: 'brand', implemented: true },
    { label: 'Дневник', description: 'Наблюдения по детям', href: '/new-post', icon: 'create-outline', tone: 'success', implemented: true },
    { label: 'Лента группы', description: 'Публикации для родителей', href: '/(tabs)/feed', icon: 'newspaper-outline', tone: 'warn', implemented: true },
    { label: 'Портфолио', description: 'Работы и фотографии', href: '/new-post', icon: 'images-outline', tone: 'info', implemented: true },
    { label: 'Рекомендации', description: 'Домашние задания', icon: 'clipboard-outline', tone: 'success' },
    { label: 'Расписание', description: 'Дневной план группы', href: '/parent/schedule', icon: 'calendar-outline', tone: 'brand', implemented: true },
    { label: 'Чаты', description: 'Родители и специалисты', href: '/(tabs)/chats', icon: 'chatbubbles-outline', tone: 'info', implemented: true },
  ],
  admin: [
    { label: 'Группы', description: 'Состав и педагоги', icon: 'people-outline', tone: 'brand' },
    { label: 'Дети', description: 'Карточки и родители', icon: 'school-outline', tone: 'success' },
    { label: 'Сотрудники', description: 'Роли и приглашения', icon: 'briefcase-outline', tone: 'info' },
    { label: 'Навыки', description: 'Дерево развития', icon: 'library-outline', tone: 'warn' },
    { label: 'Посещаемость', description: 'Отметки по группам', icon: 'checkbox-outline', tone: 'success' },
    { label: 'Оплата', description: 'Начисления и статусы', icon: 'wallet-outline', tone: 'danger' },
    { label: 'Рассылки', description: 'Объявления для групп', icon: 'megaphone-outline', tone: 'brand' },
    { label: 'Контент', description: 'Логин, sidebar и about', icon: 'settings-outline', tone: 'neutral' },
  ],
  psychologist: [
    { label: 'Дети', description: 'Назначенные дети', href: '/(tabs)/home', icon: 'school-outline', tone: 'brand', implemented: true },
    { label: 'Рекомендации', description: 'Задания для родителей', icon: 'clipboard-outline', tone: 'success' },
    { label: 'Запись на прием', description: 'Свободные слоты', icon: 'calendar-number-outline', tone: 'warn' },
    { label: 'Чаты', description: 'Родители и педагоги', href: '/(tabs)/chats', icon: 'chatbubbles-outline', tone: 'info', implemented: true },
  ],
  pediatrician: [
    { label: 'Дети', description: 'Назначенные дети', href: '/(tabs)/home', icon: 'school-outline', tone: 'brand', implemented: true },
    { label: 'Рекомендации', description: 'Назначения и советы', icon: 'clipboard-outline', tone: 'success' },
    { label: 'Запись на прием', description: 'Свободные слоты', icon: 'calendar-number-outline', tone: 'warn' },
    { label: 'Меню', description: 'Питание и ограничения', icon: 'restaurant-outline', tone: 'danger' },
    { label: 'Чаты', description: 'Родители и педагоги', href: '/(tabs)/chats', icon: 'chatbubbles-outline', tone: 'info', implemented: true },
  ],
};

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
