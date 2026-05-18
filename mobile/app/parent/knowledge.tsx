import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MobileShell from '../../components/MobileShell';
import { Badge, Card } from '../../components/ui';
import { API_URL } from '../../lib/api';
import api from '../../lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '../../lib/theme';

interface KbCategory {
  id: string;
  title: string;
  description?: string | null;
  _count?: { articles: number };
}

interface KbArticle {
  id: string;
  categoryId: string;
  title: string;
  excerpt?: string | null;
  videoUrl?: string | null;
  coverUrl?: string | null;
  createdAt: string;
  category?: { id: string; title: string };
}

function mediaUrl(url?: string | null) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_URL}${url}`;
}

export default function ParentKnowledgeScreen() {
  const [categories, setCategories] = useState<KbCategory[]>([]);
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [activeCat, setActiveCat] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.get('/kb/categories').then(r => setCategories(r.data));
    api.get('/kb/articles').then(r => setArticles(r.data));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter(article => {
      if (activeCat && article.categoryId !== activeCat) return false;
      if (!q) return true;
      return [article.title, article.excerpt].filter(Boolean).some(value => value!.toLowerCase().includes(q));
    });
  }, [articles, activeCat, query]);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'База знаний', headerTintColor: colors.brand }} />
      <MobileShell eyebrow="Полезные материалы для родителей" title="База знаний">
        <Card padding="md" style={styles.filters}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Поиск по статьям"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
          <View style={styles.chips}>
            <Pressable onPress={() => setActiveCat('')} style={[styles.chip, !activeCat && styles.chipActive]}>
              <Text style={[styles.chipText, !activeCat && styles.chipTextActive]}>Все</Text>
            </Pressable>
            {categories.map(category => (
              <Pressable key={category.id} onPress={() => setActiveCat(category.id)} style={[styles.chip, activeCat === category.id && styles.chipActive]}>
                <Text style={[styles.chipText, activeCat === category.id && styles.chipTextActive]}>
                  {category.title} {category._count?.articles ?? 0}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {filtered.length === 0 ? (
          <Card><Text style={styles.empty}>{articles.length === 0 ? 'Статей пока нет' : 'По вашему запросу ничего не найдено'}</Text></Card>
        ) : (
          <View style={styles.stack}>
            {filtered.map(article => (
              <Pressable key={article.id} onPress={() => router.push(`/parent/knowledge/${article.id}`)}>
                <Card padding="md">
                  {article.coverUrl ? <Image source={{ uri: mediaUrl(article.coverUrl) }} style={styles.cover} /> : null}
                  <View style={styles.badges}>
                    {article.category ? <Badge tone="neutral">{article.category.title}</Badge> : null}
                    {article.videoUrl ? <Badge tone="brand">видео</Badge> : null}
                  </View>
                  <Text style={styles.title}>{article.title}</Text>
                  {article.excerpt ? <Text style={styles.body}>{article.excerpt}</Text> : null}
                  <Text style={styles.meta}>{new Date(article.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </MobileShell>
    </>
  );
}

const styles = StyleSheet.create({
  filters: { marginBottom: spacing.lg },
  searchBox: { height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: { flex: 1, color: colors.textPrimary, fontSize: fontSize.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  chip: { height: 32, paddingHorizontal: spacing.md, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.textSecondary, fontSize: fontSize.xs },
  chipTextActive: { color: colors.textInverse },
  stack: { gap: spacing.sm },
  cover: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg, backgroundColor: colors.brandPale, marginBottom: spacing.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  title: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  body: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.sm },
  meta: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
  empty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xxxl },
});
