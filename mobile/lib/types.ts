// Types shared between web and mobile — kept in sync with web/lib/types.ts

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
  _count?: { likes: number };
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
  type: string;
  childId?: string;
  participants: { userId: string; lastReadAt?: string }[];
  messages?: ChatMessage[];
  otherUser?: { id: string; name: string; avatar?: string; role: Role };
  lastMessage?: ChatMessage;
  unreadCount?: number;
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

export interface Schedule {
  id: string;
  groupId: string;
  dayOfWeek: number;
  timeStart: string;
  timeEnd: string;
  activity: string;
  description?: string;
}

export interface Payment {
  id: string;
  childId: string;
  month: string;
  amount: number;
  paid: number;
  status: 'paid' | 'pending' | 'overdue';
}

export interface Attendance {
  id: string;
  childId: string;
  date: string;
  status: 'present' | 'sick' | 'vacation' | 'absent';
}
