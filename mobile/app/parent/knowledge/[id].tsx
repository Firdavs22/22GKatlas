import { useEffect, useState } from 'react';
import { Image, Linking, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MobileShell from '../../../components/MobileShell';
import { Badge, Button, Card } from '../../../components/ui';
import api, { API_URL } from '../../../lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '../../../lib/theme';

interface KbArticle {
  id: string;
  title: string;
  excerpt?: string | null;
  body: string;
  videoUrl?: string | null;
  coverUrl?: string | null;
  createdAt: string;
  category?: { id: string; title: string };
}

function mediaUrl(url?: string | null) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_URL}${url}`;
}

export default function KbArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [article, setArticle] = useState<KbArticle | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/kb/articles/${id}`).then(r => setArticle(r.data));
  }, [id]);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: article?.title || 'Статья', headerTintColor: colors.brand }} />
      <MobileShell eyebrow={article?.category?.title || 'База знаний'} title={article?.title || 'Загрузка'}>
        {!article ? (
          <Card><Text style={styles.empty}>Загрузка...</Text></Card>
        ) : (
          <Card padding="md">
            {article.coverUrl ? <Image source={{ uri: mediaUrl(article.coverUrl) }} style={styles.cover} /> : null}
            <View style={styles.metaRow}>
              <Ionicons name="book-outline" size={14} color={colors.textMuted} />
              <Text style={styles.meta}>
                {new Date(article.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              {article.category ? <Badge tone="neutral">{article.category.title}</Badge> : null}
            </View>
            {article.videoUrl ? (
              <Button onPress={() => Linking.openURL(article.videoUrl!)} variant="outline" style={styles.videoButton}>
                <Ionicons name="play-circle-outline" size={18} color={colors.brand} />
                <Text style={styles.videoText}>Открыть видео</Text>
              </Button>
            ) : null}
            {article.excerpt ? <Text style={styles.excerpt}>{article.excerpt}</Text> : null}
            {article.body.split('\n\n').map((paragraph, index) => (
              <Text key={`${index}-${paragraph.slice(0, 8)}`} style={styles.paragraph}>{paragraph}</Text>
            ))}
          </Card>
        )}
      </MobileShell>
    </>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg, backgroundColor: colors.brandPale, marginBottom: spacing.md },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  meta: { color: colors.textMuted, fontSize: fontSize.xs },
  videoButton: { marginBottom: spacing.md },
  videoText: { color: colors.brand, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  excerpt: { color: colors.textPrimary, fontSize: fontSize.md, fontStyle: 'italic', lineHeight: 22, marginBottom: spacing.md },
  paragraph: { color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 23, marginBottom: spacing.md },
  empty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xxxl },
});
