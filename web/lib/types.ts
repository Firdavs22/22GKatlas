export type Role = 'admin' | 'teacher' | 'parent' | 'psychologist' | 'pediatrician';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar?: string;
  createdAt: string;
}

export interface Child {
  id: string;
  name: string;
  birthDate: string;
  photo?: string;
  status: 'active' | 'graduated' | 'left';
  groupId?: string;
  group?: Group;
  parents?: { parent: User }[];
  specialists?: { specialist: User; role: Role }[];
}

export interface Group {
  id: string;
  name: string;
  ageRange: string;
  year: number;
  teacher?: User;
  _count?: { children: number };
}

export interface FeedItem {
  id: string;
  type: 'child_photo' | 'child_achievement' | 'group_news' | 'school_news';
  scope: 'child' | 'group' | 'school';
  authorId: string;
  author?: { id: string; name: string };
  childId?: string;
  child?: { id: string; name: string };
  groupId?: string;
  group?: { id: string; name: string };
  title?: string;
  text?: string;
  mediaUrls: string[];
  pinned: boolean;
  createdAt: string;
}

export interface Observation {
  id: string;
  childId: string;
  userId: string;
  author?: { id: string; name: string };
  text: string;
  areaId?: string;
  tags: string[];
  photos: string[];
  visible: boolean;
  date: string;
  createdAt: string;
}

export interface Progress {
  id: string;
  childId: string;
  skillId: string;
  stage: 'none' | 'presented' | 'practicing' | 'mastered';
  updatedAt: string;
  skill?: Skill;
}

export interface Area {
  id: string;
  title: string;
  icon: string;
  color: string;
  sortOrder: number;
  groups?: SkillGroup[];
}

export interface SkillGroup {
  id: string;
  title: string;
  areaId: string;
  sortOrder: number;
  skills?: Skill[];
}

export interface Skill {
  id: string;
  title: string;
  description?: string;
  ageRange?: string;
  sortOrder: number;
  groupId: string;
  group?: SkillGroup & { area?: Area };
}

export interface ChatRoom {
  id: string;
  type: 'teacher_parent' | 'pediatrician_parent' | 'teacher_psychologist';
  childId?: string;
  participants: { userId: string; lastReadAt?: string }[];
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderId: string;
  sender?: { id: string; name: string; avatar?: string };
  text: string;
  attachments: string[];
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface SpecialistNote {
  id: string;
  childId: string;
  specialistId: string;
  specialist?: { id: string; name: string; role: Role };
  type: string;
  text: string;
  recommendations?: string;
  visibility: 'specialist_only' | 'with_teacher' | 'with_parent';
  attachments: string[];
  createdAt: string;
}

export interface Schedule {
  id: string;
  groupId: string;
  dayOfWeek: number;
  timeStart: string;
  timeEnd: string;
  activity: string;
  description?: string;
}

export const ROLE_HOME: Record<Role, string> = {
  admin: '/admin',
  teacher: '/teacher',
  parent: '/parent',
  psychologist: '/psychologist',
  pediatrician: '/pediatrician',
};

export const STAGE_LABELS: Record<string, string> = {
  none: '—',
  presented: 'ЗН',
  practicing: 'ПВ',
  mastered: 'УС',
};

export const STAGE_COLORS: Record<string, string> = {
  none: 'bg-gray-100 text-gray-400',
  presented: 'bg-yellow-100 text-yellow-700',
  practicing: 'bg-blue-100 text-blue-700',
  mastered: 'bg-green-100 text-green-700',
};

export const DAY_NAMES = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт'];
