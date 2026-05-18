import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AuthImage from './AuthImage';
import { colors, fontSize, fontWeight, radius, spacing } from '../lib/theme';

interface PostMediaProps {
  urls: string[];
  compact?: boolean;
}

export default function PostMedia({ urls, compact = false }: PostMediaProps) {
  const [openedIndex, setOpenedIndex] = useState<number | null>(null);
  if (!urls?.length) return null;

  const shown = urls.length > 4 ? urls.slice(0, 4) : urls;
  const openedUrl = openedIndex !== null ? urls[openedIndex] : null;

  return (
    <>
      <View style={[styles.grid, compact && styles.compactGrid]}>
        {shown.map((url, index) => {
          const extra = index === 3 ? urls.length - 4 : 0;
          return (
            <Pressable
              key={`${url}-${index}`}
              onPress={() => setOpenedIndex(index)}
              style={[styles.tile, urls.length === 1 && styles.singleTile]}
            >
              <AuthImage sourcePath={url} style={styles.image} />
              {extra > 0 ? (
                <View style={styles.moreOverlay}>
                  <Text style={styles.moreText}>+{extra}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Modal visible={Boolean(openedUrl)} transparent animationType="fade" onRequestClose={() => setOpenedIndex(null)}>
        <View style={styles.lightbox}>
          <Pressable style={styles.close} onPress={() => setOpenedIndex(null)}>
            <Ionicons name="close" size={24} color={colors.textInverse} />
          </Pressable>
          {openedUrl ? <AuthImage sourcePath={openedUrl} style={styles.lightboxImage} resizeMode="contain" /> : null}
          {urls.length > 1 ? (
            <View style={styles.counter}>
              <Text style={styles.counterText}>{(openedIndex ?? 0) + 1} / {urls.length}</Text>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  compactGrid: { marginTop: spacing.sm },
  tile: { flexBasis: '48%', flexGrow: 1, aspectRatio: 1, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.brandPale },
  singleTile: { flexBasis: '100%', aspectRatio: 4 / 3 },
  image: { width: '100%', height: '100%' },
  moreOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(27,31,42,0.48)', alignItems: 'center', justifyContent: 'center' },
  moreText: { color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  lightboxImage: { width: '100%', height: '78%' },
  close: { position: 'absolute', top: 52, right: spacing.lg, zIndex: 2, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  counter: { position: 'absolute', bottom: 48, alignSelf: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.14)' },
  counterText: { color: colors.textInverse, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
});
