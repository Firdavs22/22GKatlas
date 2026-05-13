import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../../lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Child } from '../../lib/types';

export default function HomeScreen() {
  const { user } = useAuth();
  if (!user) return null;

  switch (user.role) {
    case 'admin': return <AdminHome />;
    case 'teacher': return <TeacherHome />;
    case 'parent': return <ParentHome />;
    default: return <SpecialistHome />;
  }
}

// ── Admin Dashboard ─────────────────────────────────────
function AdminHome() {
  const [stats, setStats] = useState({ children: 0, groups: 0, staff: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadData = async () => {
    try {
      const [c, g, s] = await Promise.all([
        api.get('/admin/children'),
        api.get('/admin/groups'),
        api.get('/admin/staff'),
      ]);
      setStats({ children: c.data.length, groups: g.data.length, staff: s.data.length });
    } catch {}
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const cards = [
    { label: 'Детей', value: stats.children, icon: 'people' as const, color: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Групп', value: stats.groups, icon: 'grid' as const, color: '#10B981', bg: '#ECFDF5' },
    { label: 'Сотрудников', value: stats.staff, icon: 'briefcase' as const, color: '#8B5CF6', bg: '#F5F3FF' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <Text style={styles.greeting}>Панель управления</Text>
        <Text style={styles.role}>Администратор</Text>

        <View style={styles.statsRow}>
          {cards.map(c => (
            <View key={c.label} style={[styles.statCard, { backgroundColor: c.bg }]}>
              <Ionicons name={c.icon} size={24} color={c.color} />
              <Text style={[styles.statValue, { color: c.color }]}>{c.value}</Text>
              <Text style={styles.statLabel}>{c.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Управление</Text>
        {[
          { label: 'Дети', desc: 'Создать, редактировать', icon: 'people-outline' as const },
          { label: 'Группы', desc: 'Назначить педагога', icon: 'grid-outline' as const },
          { label: 'Сотрудники', desc: 'Пригласить, роли', icon: 'briefcase-outline' as const },
          { label: 'Навыки', desc: 'Дерево навыков', icon: 'library-outline' as const },
        ].map(item => (
          <TouchableOpacity key={item.label} style={styles.menuItem} activeOpacity={0.7}>
            <View style={styles.menuIcon}>
              <Ionicons name={item.icon} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuDesc}>{item.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Teacher Dashboard ───────────────────────────────────
function TeacherHome() {
  const [children, setChildren] = useState<Child[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const loadData = async () => {
    try {
      const { data } = await api.get('/children');
      setChildren(data);
    } catch {}
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <Text style={styles.greeting}>Привет, {user?.name?.split(' ')[0]}! 👋</Text>
        <Text style={styles.role}>Педагог</Text>

        {/* Quick stats */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Моя группа</Text>
          <Text style={styles.heroValue}>{children.length} детей</Text>
          <Text style={styles.heroSubtext}>{children[0]?.group?.name || ''}</Text>
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Быстрые действия</Text>
        <View style={styles.actionsRow}>
          {[
            { label: 'Матрица', icon: '📊', color: '#10B981' },
            { label: 'Наблюдение', icon: '📝', color: '#F59E0B' },
            { label: 'Портфолио', icon: '📸', color: '#8B5CF6' },
            { label: 'Задания', icon: '📋', color: '#3B82F6' },
          ].map(a => (
            <TouchableOpacity key={a.label} style={styles.actionCard} activeOpacity={0.7}>
              <View style={[styles.actionIcon, { backgroundColor: a.color + '15' }]}>
                <Text style={{ fontSize: 22 }}>{a.icon}</Text>
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Children list */}
        <Text style={styles.sectionTitle}>Дети группы</Text>
        {children.map(child => (
          <TouchableOpacity
            key={child.id}
            style={styles.childCard}
            activeOpacity={0.7}
            onPress={() => router.push(`/child/${child.id}`)}
          >
            <View style={styles.childAvatar}>
              <Text style={{ fontSize: 20 }}>👧</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.childName}>{child.name}</Text>
              <Text style={styles.childAge}>
                {new Date(child.birthDate).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Parent Dashboard ────────────────────────────────────
function ParentHome() {
  const [children, setChildren] = useState<Child[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const loadData = async () => {
    try {
      const { data } = await api.get('/children');
      setChildren(data);
      if (data[0]) {
        const [p, a] = await Promise.all([
          api.get(`/children/${data[0].id}/payments`),
          api.get(`/children/${data[0].id}/attendance`),
        ]);
        setPayments(p.data);
        setAttendance(a.data);
      }
    } catch {}
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const now = new Date();
  const monthAtt = attendance.filter(a => {
    const d = new Date(a.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const presentDays = monthAtt.filter(a => a.status === 'present').length;
  const childName = children[0]?.name || '';
  const groupName = (children[0] as any)?.group?.name || '';

  const sections = [
    { label: 'Лента', icon: '📰', desc: 'Новости и фото', color: '#F59E0B', href: '/(tabs)/feed' },
    { label: 'Прогресс', icon: '📊', desc: 'Карта развития', color: '#10B981', href: '/parent/progress' },
    { label: 'Чаты', icon: '💬', desc: 'Диалог с педагогом', color: '#6366F1', href: '/(tabs)/chats' },
    { label: 'Посещаемость', icon: '📋', desc: 'Дни посещения', color: '#14B8A6', href: '/parent/attendance' },
    { label: 'Расписание', icon: '🕐', desc: 'Режим дня', color: '#A855F7', href: '/parent/schedule' },
    { label: 'Оплата', icon: '💰', desc: 'Счета и история', color: '#EF4444', href: '/parent/payments' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {/* Hero card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroSubtext}>Добро пожаловать!</Text>
          <Text style={styles.heroTitle}>{childName}</Text>
          {groupName ? <Text style={styles.heroSubtext}>Группа: {groupName}</Text> : null}

          <View style={styles.miniStats}>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValue}>{presentDays}</Text>
              <Text style={styles.miniStatLabel}>Дней</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValue}>{children.length}</Text>
              <Text style={styles.miniStatLabel}>Детей</Text>
            </View>
          </View>
        </View>

        {/* Quick access */}
        <Text style={styles.sectionTitle}>Быстрый доступ</Text>
        <View style={styles.sectionGrid}>
          {sections.map(s => (
            <TouchableOpacity
              key={s.label}
              style={styles.sectionCard}
              activeOpacity={0.7}
              onPress={() => router.push(s.href as any)}
            >
              <View style={[styles.sectionIcon, { backgroundColor: s.color + '15' }]}>
                <Text style={{ fontSize: 22 }}>{s.icon}</Text>
              </View>
              <Text style={styles.sectionLabel}>{s.label}</Text>
              <Text style={styles.sectionDesc}>{s.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Specialist Dashboard ────────────────────────────────
function SpecialistHome() {
  const [children, setChildren] = useState<Child[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const loadData = async () => {
    try {
      const { data } = await api.get('/children');
      setChildren(data);
    } catch {}
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const roleLabel = user?.role === 'psychologist' ? 'Психолог' : 'Педиатр';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <Text style={styles.greeting}>Привет, {user?.name?.split(' ')[0]}! 👋</Text>
        <Text style={styles.role}>{roleLabel}</Text>

        <Text style={styles.sectionTitle}>Мои пациенты ({children.length})</Text>
        {children.map(child => (
          <TouchableOpacity
            key={child.id}
            style={styles.childCard}
            activeOpacity={0.7}
            onPress={() => router.push(`/child/${child.id}`)}
          >
            <View style={styles.childAvatar}>
              <Text style={{ fontSize: 20 }}>👧</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.childName}>{child.name}</Text>
              <Text style={styles.childAge}>{child.group?.name || 'Без группы'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Shared Styles ───────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1, paddingHorizontal: spacing.lg },

  greeting: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.textPrimary, marginTop: spacing.lg },
  role: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xl },

  // Hero card
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    marginBottom: spacing.xl,
    ...shadows.lg,
  },
  heroTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.textInverse },
  heroValue: { fontSize: fontSize.xxxl, fontWeight: fontWeight.bold, color: colors.textInverse, marginTop: spacing.sm },
  heroSubtext: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.7)' },

  // Mini stats inside hero
  miniStats: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  miniStat: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  miniStatValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textInverse },
  miniStatLabel: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.7)' },

  // Stats row (admin)
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  statCard: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  statValue: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary },

  // Section title
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },

  // Menu items (admin)
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.md,
    ...shadows.sm,
  },
  menuIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center', alignItems: 'center',
  },
  menuLabel: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary },
  menuDesc: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },

  // Quick actions (teacher)
  actionsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  actionCard: {
    flex: 1, alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.md, ...shadows.sm,
  },
  actionIcon: { width: 44, height: 44, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  actionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.textPrimary },

  // Child card
  childCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.sm, gap: spacing.md,
    ...shadows.sm,
  },
  childAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center', alignItems: 'center',
  },
  childName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary },
  childAge: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },

  // Section grid (parent)
  sectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xl },
  sectionCard: {
    width: '47%' as any, backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, ...shadows.sm,
  },
  sectionIcon: { width: 40, height: 40, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  sectionLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textPrimary },
  sectionDesc: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
});
