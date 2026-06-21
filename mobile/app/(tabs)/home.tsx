import { useEffect, useState } from 'react';
import { RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { colors, fontSize, fontWeight, radius, shadows, spacing } from '../../lib/theme';
import { useScreenLayout } from '../../lib/layout';
import { ROLE_LABELS, ROLE_NAV, toneColors } from '../../lib/navigation';
import type { Attendance, Child, Payment, Progress, Schedule } from '../../lib/types';
import MobileShell from '../../components/MobileShell';
import NavList from '../../components/NavList';

export default function HomeScreen() {
  const { user } = useAuth();
  if (!user) return null;

  switch (user.role) {
    case 'admin':
      return <AdminHome />;
    case 'teacher':
      return <TeacherHome />;
    case 'parent':
      return <ParentHome />;
    default:
      return <SpecialistHome />;
  }
}

function formatToday() {
  const d = new Date();
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });
}

function ageLabel(birthDate?: string) {
  if (!birthDate) return '';
  const b = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) years--;
  return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`;
}

function paymentTone(status?: string) {
  if (status === 'paid') return { label: 'оплачен', tone: 'success' as const };
  if (status === 'overdue') return { label: 'просрочен', tone: 'danger' as const };
  return { label: 'ожидает', tone: 'warn' as const };
}

function StatCard({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

function AdminHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ children: 0, groups: 0, staff: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [children, groups, staff] = await Promise.all([
        api.get('/admin/children'),
        api.get('/admin/groups'),
        api.get('/admin/staff'),
      ]);
      setStats({ children: children.data.length, groups: groups.data.length, staff: staff.data.length });
    } catch {}
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  return (
    <MobileShell eyebrow={ROLE_LABELS.admin} title="Дашборд">
      <RefreshControlShim refreshing={refreshing} onRefresh={onRefresh} />
      <View style={styles.statsGrid}>
        <StatCard label="Дети" value={stats.children} />
        <StatCard label="Группы" value={stats.groups} />
        <StatCard label="Сотрудники" value={stats.staff} />
      </View>
      <Text style={styles.sectionTitle}>Управление как в web</Text>
      <NavList items={ROLE_NAV.admin} userRole={user?.role} />
    </MobileShell>
  );
}

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

  const group = children[0]?.group;

  return (
    <MobileShell eyebrow={formatToday()} title={`Здравствуйте, ${user?.name?.split(' ')[0] || 'педагог'}`}>
      <RefreshControlShim refreshing={refreshing} onRefresh={onRefresh} />
      <View style={styles.hero}>
        <View>
          <Text style={styles.heroLabel}>Группа</Text>
          <Text style={styles.heroTitle}>{group?.name || 'Моя группа'}</Text>
          <Text style={styles.heroMeta}>{group?.ageRange || 'Матрица развития и дневник'}</Text>
        </View>
        <View style={styles.heroCount}>
          <Text style={styles.heroCountValue}>{children.length}</Text>
          <Text style={styles.heroCountLabel}>детей</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Рабочие разделы</Text>
      <NavList items={ROLE_NAV.teacher} />

      <Text style={styles.sectionTitle}>Дети группы</Text>
      {children.map((child) => (
        <ChildRow key={child.id} child={child} onPress={() => router.push(`/child/${child.id}`)} />
      ))}
    </MobileShell>
  );
}

function ParentHome() {
  const [children, setChildren] = useState<Child[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const loadData = async () => {
    try {
      const { data } = await api.get('/children');
      setChildren(data);
      const first = data[0];
      if (!first) return;
      const groupId = first.group?.id || first.groupId;
      const [p, a, pay, s] = await Promise.all([
        api.get(`/children/${first.id}/progress`).catch(() => ({ data: [] })),
        api.get(`/children/${first.id}/attendance`).catch(() => ({ data: [] })),
        api.get(`/children/${first.id}/payments`).catch(() => ({ data: [] })),
        groupId ? api.get(`/groups/${groupId}/schedule`).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);
      setProgress(p.data);
      setAttendance(a.data);
      setPayments(pay.data);
      setSchedule(s.data);
    } catch {}
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const child = children[0];
  const now = new Date();
  const monthAttendance = attendance.filter((item) => {
    const d = new Date(item.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const present = monthAttendance.filter((item) => item.status === 'present').length;
  const attendancePct = monthAttendance.length ? Math.round((present / monthAttendance.length) * 100) : 0;
  const mastered = progress.filter((item) => item.stage === 'mastered').length;
  const currentPayment =
    payments.find((p) => {
      const d = new Date(p.month);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }) || payments.find((p) => p.status !== 'paid') || payments[0];
  const pay = paymentTone(currentPayment?.status);
  const payTone = toneColors(pay.tone);
  const todaySchedule = schedule
    .filter((item) => item.dayOfWeek === now.getDay())
    .sort((a, b) => a.timeStart.localeCompare(b.timeStart))
    .slice(0, 4);

  return (
    <MobileShell eyebrow={formatToday()} title={`Здравствуйте, ${user?.name?.split(' ')[0] || 'родители'}`}>
      <RefreshControlShim refreshing={refreshing} onRefresh={onRefresh} />

      <TouchableOpacity style={styles.childHero} activeOpacity={0.78} onPress={() => child && router.push(`/child/${child.id}`)}>
        <View style={styles.childPhoto}>
          <Ionicons name="image-outline" size={26} color={colors.brand} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.childHeroLabel}>Ваш ребенок</Text>
          <Text style={styles.childHeroName} numberOfLines={1}>{child?.name || 'Ребенок'}</Text>
          <Text style={styles.childHeroMeta} numberOfLines={1}>
            {[child?.group?.name, ageLabel(child?.birthDate)].filter(Boolean).join(' · ') || 'Данные загружаются'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <View style={styles.statsGrid}>
        <StatCard label="Посещаемость" value={attendancePct} unit="%" />
        <StatCard label="Навыки" value={mastered} unit={progress.length ? `/${progress.length}` : ''} />
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>Оплата</Text>
          <View style={[styles.paymentBadge, { backgroundColor: payTone.bg }]}>
            <Text style={[styles.paymentText, { color: payTone.fg }]}>{pay.label}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Сегодня</Text>
      <View style={styles.todayCard}>
        {todaySchedule.length === 0 ? (
          <Text style={styles.emptyText}>На сегодня расписания нет</Text>
        ) : todaySchedule.map((item) => (
          <View key={item.id} style={styles.scheduleRow}>
            <Text style={styles.scheduleTime}>{item.timeStart}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.scheduleTitle}>{item.activity}</Text>
              {!!item.description && <Text style={styles.scheduleMeta}>{item.description}</Text>}
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Разделы</Text>
      <NavList items={ROLE_NAV.parent} />
    </MobileShell>
  );
}

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

  const role = user?.role === 'psychologist' ? 'psychologist' : 'pediatrician';

  return (
    <MobileShell eyebrow={ROLE_LABELS[role]} title="Назначенные дети">
      <RefreshControlShim refreshing={refreshing} onRefresh={onRefresh} />
      <View style={styles.statsGrid}>
        <StatCard label="Дети" value={children.length} />
        <StatCard label="Разделы" value={ROLE_NAV[role].length} />
      </View>
      <Text style={styles.sectionTitle}>Рабочие разделы</Text>
      <NavList items={ROLE_NAV[role]} />
      <Text style={styles.sectionTitle}>Дети</Text>
      {children.map((child) => (
        <ChildRow key={child.id} child={child} onPress={() => router.push(`/child/${child.id}`)} />
      ))}
    </MobileShell>
  );
}

function ChildRow({ child, onPress }: { child: Child; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.childRow} activeOpacity={0.75} onPress={onPress}>
      <View style={styles.childInitial}>
        <Text style={styles.childInitialText}>{child.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.childName} numberOfLines={1}>{child.name}</Text>
        <Text style={styles.childMeta} numberOfLines={1}>{child.group?.name || ageLabel(child.birthDate) || 'Без группы'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function RefreshControlShim(_props: { refreshing: boolean; onRefresh: () => void }) {
  return null;
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
    backgroundColor: colors.brand,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  heroLabel: { color: 'rgba(255,255,255,0.72)', fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 1 },
  heroTitle: { color: colors.textInverse, fontSize: fontSize.xxl, fontWeight: fontWeight.bold, marginTop: spacing.xs },
  heroMeta: { color: 'rgba(255,255,255,0.74)', fontSize: fontSize.sm, marginTop: spacing.xs },
  heroCount: {
    width: 76,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCountValue: { color: colors.textInverse, fontSize: fontSize.xxl, fontWeight: fontWeight.bold },
  heroCountLabel: { color: 'rgba(255,255,255,0.72)', fontSize: fontSize.xs },

  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md },
  statTile: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 98,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  statLabel: { color: colors.textSecondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.sm },
  statValue: { color: colors.textPrimary, fontSize: fontSize.xxl, fontWeight: fontWeight.bold },
  statUnit: { color: colors.textSecondary, fontSize: fontSize.sm, marginLeft: 2 },

  childHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  childPhoto: {
    width: 76,
    height: 76,
    borderRadius: radius.lg,
    backgroundColor: colors.brandPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childHeroLabel: { color: colors.textSecondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  childHeroName: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginTop: 2 },
  childHeroMeta: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 },

  paymentBadge: { alignSelf: 'flex-start', borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 5, marginTop: spacing.md },
  paymentText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },

  todayCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  scheduleRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  scheduleTime: { width: 48, color: colors.brand, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  scheduleTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  scheduleMeta: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  emptyText: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.lg },

  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  childInitial: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.brandPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childInitialText: { color: colors.brand, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  childName: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  childMeta: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
});
