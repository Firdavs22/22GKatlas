import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  ActivityIndicator, Image, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import api, { API_URL, getAuthMediaUrl } from '../lib/api';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../lib/theme';
import { Card, Button, SectionLabel } from '../components/ui';

interface Area { id: string; title: string; }
interface ChildLite { id: string; name: string; }

const STEPS = ['Фото', 'Описание', 'Публикация'] as const;

export default function NewPostScreen() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);

  // Data sources
  const [children, setChildren] = useState<ChildLite[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);

  // Step 1: photos (local URIs + uploaded URLs)
  const [photos, setPhotos] = useState<string[]>([]); // server URLs after upload
  const [uploading, setUploading] = useState(false);

  // Step 2: context
  const [childId, setChildId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [generating, setGenerating] = useState(false);

  // Step 3
  const [visible, setVisible] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    api.get('/children').then(r => {
      setChildren(r.data);
      if (r.data[0]) setChildId(r.data[0].id);
    }).catch(() => {});
    api.get('/admin/areas').then(r => setAreas(r.data)).catch(() => {});
  }, []);

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Нет доступа к камере', 'Разрешите доступ в настройках, чтобы снять фото.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.[0]) {
      await uploadAsset(res.assets[0]);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Нет доступа к галерее', 'Разрешите доступ в настройках.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.length) {
      for (const a of res.assets) await uploadAsset(a);
    }
  };

  const uploadAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    setUploading(true);
    try {
      const formData = new FormData();
      const filename = asset.fileName || `photo-${Date.now()}.jpg`;
      const mime = asset.mimeType || 'image/jpeg';
      // React Native form-data quirk: object {uri, name, type}
      formData.append('file', { uri: asset.uri, name: filename, type: mime } as any);
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPhotos(prev => [...prev, data.url]);
    } catch (err: any) {
      Alert.alert('Ошибка загрузки', err?.response?.data?.message || err?.message || 'Попробуйте ещё раз');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (i: number) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== i));
  };

  const generate = async () => {
    if (!title.trim()) return;
    setGenerating(true);
    try {
      const area = areas.find(a => a.id === areaId);
      const { data } = await api.post('/ai/observation', {
        title: title.trim(),
        area: area ? { id: area.id, title: area.title } : undefined,
      });
      if (data?.text) setText(data.text);
    } catch (err) {
      console.warn('AI failed', err);
    } finally {
      setGenerating(false);
    }
  };

  const publish = async () => {
    if (!childId) {
      Alert.alert('Не выбран ребёнок');
      return;
    }
    setPublishing(true);
    try {
      await api.post(`/children/${childId}/observations`, {
        title: title.trim() || undefined,
        text: text.trim() || title.trim() || 'Наблюдение',
        photos,
        visible,
        areaId: areaId || undefined,
      });
      router.back();
    } catch (err: any) {
      Alert.alert('Не удалось опубликовать', err?.response?.data?.message || err?.message || 'Попробуйте ещё раз');
    } finally {
      setPublishing(false);
    }
  };

  const canStep2 = photos.length > 0 || title.trim().length > 0 || text.trim().length > 0;
  const canStep3 = !!childId && (text.trim() || title.trim());

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={26} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <SectionLabel>Новый пост</SectionLabel>
          <Text style={styles.headerTitle}>Шаг {step + 1} из {STEPS.length} · {STEPS[step]}</Text>
        </View>
        <View style={styles.headerRight}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.progressSeg, { backgroundColor: i <= step ? colors.brand : colors.border }]}
            />
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl + 80 }}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 && (
          <Step1Media
            photos={photos}
            uploading={uploading}
            onCamera={pickFromCamera}
            onGallery={pickFromGallery}
            onRemove={removePhoto}
          />
        )}
        {step === 1 && (
          <Step2Context
            children={children}
            areas={areas}
            childId={childId}
            setChildId={setChildId}
            areaId={areaId}
            setAreaId={setAreaId}
            title={title}
            setTitle={setTitle}
            text={text}
            setText={setText}
            generating={generating}
            onGenerate={generate}
          />
        )}
        {step === 2 && (
          <Step3Publish
            photos={photos}
            child={children.find(c => c.id === childId)}
            area={areas.find(a => a.id === areaId)}
            title={title}
            text={text}
            visible={visible}
            setVisible={setVisible}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          variant="outline"
          onPress={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          Назад
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            variant="primary"
            onPress={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
            disabled={(step === 0 && !canStep2) || (step === 1 && !canStep3)}
          >
            Далее
          </Button>
        ) : (
          <Button variant="primary" onPress={publish} loading={publishing} disabled={!canStep3}>
            Опубликовать
          </Button>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ──────────────────────────────────────────────────────────
// Step 1: photos
// ──────────────────────────────────────────────────────────

function Step1Media({
  photos, uploading, onCamera, onGallery, onRemove,
}: {
  photos: string[];
  uploading: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onRemove: (i: number) => void;
}) {
  if (photos.length === 0) {
    return (
      <View style={{ gap: spacing.lg }}>
        <View>
          <Text style={styles.h1}>Добавьте фото</Text>
          <Text style={styles.muted}>Снимите момент работы или выберите из галереи.</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Pressable onPress={onCamera} style={({ pressed }) => [styles.bigChoice, pressed && { opacity: 0.7 }]}>
            <View style={styles.bigChoiceIcon}>
              <Ionicons name="camera" size={28} color={colors.brand} />
            </View>
            <Text style={styles.bigChoiceTitle}>Камера</Text>
            <Text style={styles.bigChoiceHint}>Снять фото</Text>
          </Pressable>

          <Pressable onPress={onGallery} style={({ pressed }) => [styles.bigChoice, pressed && { opacity: 0.7 }]}>
            <View style={styles.bigChoiceIcon}>
              <Ionicons name="images" size={28} color={colors.brand} />
            </View>
            <Text style={styles.bigChoiceTitle}>Галерея</Text>
            <Text style={styles.bigChoiceHint}>Выбрать фото</Text>
          </Pressable>
        </View>

        {uploading && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.brand} />
            <Text style={styles.muted}>Загрузка…</Text>
          </View>
        )}
        <Text style={[styles.muted, { textAlign: 'center', fontSize: 12 }]}>
          Можно пропустить — текстовое наблюдение тоже подойдёт.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <View>
        <Text style={styles.h1}>{photos.length} фото</Text>
        <Text style={styles.muted}>Можно добавить ещё или удалить лишние.</Text>
      </View>
      <View style={styles.photoGrid}>
        {photos.map((url, i) => (
          <PhotoTile key={url + i} url={url} onRemove={() => onRemove(i)} />
        ))}
        <Pressable
          onPress={onGallery}
          style={({ pressed }) => [styles.addTile, { opacity: pressed ? 0.6 : 1 }]}
        >
          {uploading ? <ActivityIndicator color={colors.brand} /> : <Ionicons name="add" size={28} color={colors.textSecondary} />}
        </Pressable>
      </View>
    </View>
  );
}

function PhotoTile({ url, onRemove }: { url: string; onRemove: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    getAuthMediaUrl(url).then(setSrc);
  }, [url]);
  return (
    <View style={styles.photoTile}>
      {src ? <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} /> : null}
      <Pressable onPress={onRemove} style={styles.removeBtn} hitSlop={8}>
        <Ionicons name="trash" size={14} color="#fff" />
      </Pressable>
    </View>
  );
}

// ──────────────────────────────────────────────────────────
// Step 2: context (child, area, title, text, AI)
// ──────────────────────────────────────────────────────────

function Step2Context({
  children, areas, childId, setChildId, areaId, setAreaId,
  title, setTitle, text, setText, generating, onGenerate,
}: {
  children: ChildLite[];
  areas: Area[];
  childId: string;
  setChildId: (v: string) => void;
  areaId: string;
  setAreaId: (v: string) => void;
  title: string;
  setTitle: (v: string) => void;
  text: string;
  setText: (v: string) => void;
  generating: boolean;
  onGenerate: () => void;
}) {
  return (
    <View style={{ gap: spacing.lg }}>
      <View>
        <Text style={styles.h1}>Контекст</Text>
        <Text style={styles.muted}>Кого касается наблюдение и что произошло.</Text>
      </View>

      <View>
        <SectionLabel>Ребёнок</SectionLabel>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.sm }}
        >
          {children.map(c => {
            const active = childId === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setChildId(c.id)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {areas.length > 0 && (
        <View>
          <SectionLabel>Область</SectionLabel>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.sm }}
          >
            <Pressable
              onPress={() => setAreaId('')}
              style={[styles.chip, !areaId && styles.chipActive]}
            >
              <Text style={[styles.chipText, !areaId && styles.chipTextActive]}>—</Text>
            </Pressable>
            {areas.map(a => {
              const active = areaId === a.id;
              return (
                <Pressable
                  key={a.id}
                  onPress={() => setAreaId(a.id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{a.title}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View>
        <SectionLabel>Упражнение / заголовок</SectionLabel>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Переливание воды, Розовая башня…"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
      </View>

      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <SectionLabel>Описание для родителей</SectionLabel>
          <Pressable onPress={onGenerate} disabled={!title.trim() || generating} hitSlop={6}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {generating ? (
                <ActivityIndicator size="small" color={colors.brand} />
              ) : (
                <Ionicons name="sparkles" size={12} color={title.trim() ? colors.brand : colors.textMuted} />
              )}
              <Text style={{ fontSize: 12, color: title.trim() ? colors.brand : colors.textMuted, fontWeight: fontWeight.medium }}>
                {generating ? 'Генерация…' : 'Сгенерировать'}
              </Text>
            </View>
          </Pressable>
        </View>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Что развивает упражнение, как ребёнок с ним работал…"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={6}
          style={[styles.input, { height: 140, textAlignVertical: 'top', paddingTop: spacing.md }]}
        />
        <Text style={[styles.muted, { fontSize: 11, marginTop: 4 }]}>
          AI-генерация работает по заголовку и области. Текст всегда можно поправить.
        </Text>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────
// Step 3: publish (preview + visibility toggle)
// ──────────────────────────────────────────────────────────

function Step3Publish({
  photos, child, area, title, text, visible, setVisible,
}: {
  photos: string[];
  child?: ChildLite;
  area?: Area;
  title: string;
  text: string;
  visible: boolean;
  setVisible: (v: boolean) => void;
}) {
  return (
    <View style={{ gap: spacing.lg }}>
      <View>
        <Text style={styles.h1}>Проверьте перед публикацией</Text>
        <Text style={styles.muted}>
          Так пост будет выглядеть {visible ? 'у родителя' : 'только у вас'}.
        </Text>
      </View>

      <Card padding="md">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <View>
            <SectionLabel>{area?.title || 'Наблюдение'}</SectionLabel>
            {!!title && <Text style={styles.previewTitle}>{title}</Text>}
          </View>
          {!!child?.name && <Text style={styles.muted}>{child.name}</Text>}
        </View>
        {photos.length > 0 && (
          <View style={styles.previewPhotos}>
            {photos.slice(0, 6).map((url, i) => (
              <PreviewPhoto key={url + i} url={url} single={photos.length === 1} />
            ))}
          </View>
        )}
        {!!text && (
          <Text style={{ marginTop: spacing.sm, color: colors.textPrimary, fontSize: fontSize.md, lineHeight: 22 }}>
            {text}
          </Text>
        )}
      </Card>

      <Pressable onPress={() => setVisible(!visible)} style={styles.toggleRow}>
        <View style={[styles.toggleIcon, { backgroundColor: visible ? colors.successBg : colors.borderLight }]}>
          <Ionicons
            name={visible ? 'eye' : 'eye-off'}
            size={18}
            color={visible ? '#1E5731' : colors.textSecondary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleTitle}>
            {visible ? 'Видно родителям' : 'Только для педагога'}
          </Text>
          <Text style={styles.muted}>
            {visible ? 'Пост появится у родителя в ленте «Прогресс»' : 'Запись останется в дневнике'}
          </Text>
        </View>
        <View style={[styles.switch, { backgroundColor: visible ? colors.brand : colors.border }]}>
          <View style={[styles.switchThumb, { left: visible ? 18 : 2 }]} />
        </View>
      </Pressable>
    </View>
  );
}

function PreviewPhoto({ url, single }: { url: string; single: boolean }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    getAuthMediaUrl(url).then(setSrc);
  }, [url]);
  return (
    <View style={[styles.previewPhoto, { width: single ? '100%' : '32%', aspectRatio: single ? 4 / 3 : 1 }]}>
      {src ? <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} /> : null}
    </View>
  );
}

// ──────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 14, color: colors.textPrimary, fontWeight: fontWeight.medium },
  headerRight: { flexDirection: 'row', gap: 3 },
  progressSeg: { width: 18, height: 3, borderRadius: 2 },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  h1: { fontFamily: 'serif', fontSize: fontSize.xxl, color: colors.textPrimary, marginBottom: 4 },
  muted: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  previewTitle: { fontFamily: 'serif', fontSize: fontSize.xl, color: colors.textPrimary, marginTop: 2 },

  bigChoice: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  bigChoiceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigChoiceTitle: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary },
  bigChoiceHint: { fontSize: 12, color: colors.textSecondary },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.brandPale,
    position: 'relative',
  },
  addTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    marginTop: 6,
  },

  chip: {
    paddingHorizontal: spacing.lg,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.brand },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: fontWeight.medium },
  chipTextActive: { color: colors.textInverse },

  previewPhotos: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  previewPhoto: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.brandPale },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTitle: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary },
  switch: {
    width: 40,
    height: 24,
    borderRadius: 12,
    position: 'relative',
  },
  switchThumb: {
    position: 'absolute',
    top: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    ...shadows.sm,
  },
});
