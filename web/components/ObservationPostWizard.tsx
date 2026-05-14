'use client';
import { useRef, useState } from 'react';
import {
  X, Camera, Image as ImageIcon, ChevronLeft, ChevronRight, Send,
  Sparkles, Loader2, Eye, EyeOff, Plus, Trash2,
} from 'lucide-react';
import api from '@/lib/api';
import { Card, Button, SectionLabel } from '@/components/ui';
import AuthMedia from '@/components/AuthMedia';

interface Area { id: string; title: string; }
interface ChildLite { id: string; name: string; }

interface ObservationPostWizardProps {
  children: ChildLite[];
  areas: Area[];
  /** Pre-select child id if started from a child card. */
  defaultChildId?: string;
  onClose: () => void;
  onPublished: (observation: PublishedObservation) => void;
}

interface PublishedObservation {
  id: string;
  text: string;
  photos: string[];
  visible: boolean;
  date: string;
  childId: string;
  childName: string;
  areaId?: string;
}

const inputCls =
  'w-full h-11 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export default function ObservationPostWizard({
  children,
  areas,
  defaultChildId,
  onClose,
  onPublished,
}: ObservationPostWizardProps) {
  const [step, setStep] = useState(1);

  // Step 1: media
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Step 2: context
  const [childId, setChildId] = useState(defaultChildId || children[0]?.id || '');
  const [areaId, setAreaId] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [generating, setGenerating] = useState(false);

  // Step 3: visibility & publish
  const [visible, setVisible] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError('');
    setUploading(true);
    try {
      const formData = new FormData();
      if (files.length === 1) {
        formData.append('file', files[0]);
        const { data } = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setPhotos(prev => [...prev, data.url]);
      } else {
        for (const f of Array.from(files)) formData.append('files', f);
        const { data } = await api.post('/upload/batch', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setPhotos(prev => [...prev, ...(data.files as { url: string }[]).map(f => f.url)]);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setUploadError(msg || 'Не удалось загрузить файл');
    } finally {
      setUploading(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
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
      console.warn('AI failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const publish = async () => {
    if (!childId) return;
    setPublishing(true);
    setPublishError('');
    try {
      const { data } = await api.post(`/children/${childId}/observations`, {
        title: title.trim() || undefined,
        text: text.trim() || title.trim() || 'Наблюдение',
        photos,
        visible,
        areaId: areaId || undefined,
      });
      const childName = children.find(c => c.id === childId)?.name || '';
      onPublished({ ...data, childName });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPublishError(msg || 'Не удалось опубликовать');
    } finally {
      setPublishing(false);
    }
  };

  const canStep2 = photos.length > 0 || text.trim().length > 0 || title.trim().length > 0;
  const canStep3 = !!childId && (text.trim() || title.trim());

  return (
    <div
      className="fixed inset-0 bg-foreground/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-3xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <SectionLabel>Новый пост</SectionLabel>
            <div className="text-sm text-slate-500 mt-0.5">
              Шаг {step} из 3 ·{' '}
              {step === 1 ? 'Фото' : step === 2 ? 'Описание' : 'Публикация'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={`h-1 w-6 rounded-full transition-colors ${
                    s <= step ? 'bg-brand' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-foreground p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <Step1Media
              photos={photos}
              uploading={uploading}
              uploadError={uploadError}
              cameraInputRef={cameraInputRef}
              galleryInputRef={galleryInputRef}
              onUpload={upload}
              onRemove={removePhoto}
            />
          )}
          {step === 2 && (
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
          {step === 3 && (
            <Step3Publish
              photos={photos}
              child={children.find(c => c.id === childId)}
              area={areas.find(a => a.id === areaId)}
              title={title}
              text={text}
              visible={visible}
              setVisible={setVisible}
              error={publishError}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ChevronLeft size={16} /> Назад
          </Button>
          {step < 3 ? (
            <Button
              variant="primary"
              onClick={() => setStep(s => s + 1)}
              disabled={(step === 1 && !canStep2) || (step === 2 && !canStep3)}
            >
              Далее <ChevronRight size={16} />
            </Button>
          ) : (
            <Button variant="primary" onClick={publish} disabled={publishing || !canStep3}>
              <Send size={16} />
              {publishing ? 'Публикую…' : 'Опубликовать'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Step 1: Media — camera / gallery
// ──────────────────────────────────────────────────────────

function Step1Media({
  photos,
  uploading,
  uploadError,
  cameraInputRef,
  galleryInputRef,
  onUpload,
  onRemove,
}: {
  photos: string[];
  uploading: boolean;
  uploadError: string;
  cameraInputRef: React.RefObject<HTMLInputElement>;
  galleryInputRef: React.RefObject<HTMLInputElement>;
  onUpload: (files: FileList | null) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => onUpload(e.target.files)}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={e => onUpload(e.target.files)}
      />

      {photos.length === 0 ? (
        <>
          <div>
            <h4 className="font-serif text-2xl mb-1">Добавьте фото</h4>
            <p className="text-sm text-slate-500">
              Снимите момент работы ребёнка или выберите из галереи.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-200 hover:border-brand hover:bg-brand-pale/20 transition-colors flex flex-col items-center justify-center gap-3 group"
            >
              <div className="w-14 h-14 rounded-full bg-brand-pale flex items-center justify-center text-brand group-hover:scale-110 transition-transform">
                <Camera size={26} />
              </div>
              <div className="text-sm font-medium">Камера</div>
              <div className="text-xs text-slate-500 px-4 text-center">
                Открыть камеру и снять фото
              </div>
            </button>

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={uploading}
              className="aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-200 hover:border-brand hover:bg-brand-pale/20 transition-colors flex flex-col items-center justify-center gap-3 group"
            >
              <div className="w-14 h-14 rounded-full bg-brand-pale flex items-center justify-center text-brand group-hover:scale-110 transition-transform">
                <ImageIcon size={26} />
              </div>
              <div className="text-sm font-medium">Галерея</div>
              <div className="text-xs text-slate-500 px-4 text-center">
                Выбрать одно или несколько фото
              </div>
            </button>
          </div>

          {uploading && (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 size={14} className="animate-spin" />
              Загрузка…
            </div>
          )}
          {uploadError && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 text-red-900 px-3 py-2 text-sm">
              {uploadError}
            </div>
          )}

          <div className="text-center text-xs text-slate-400">
            Можно пропустить этот шаг — текстовое наблюдение тоже подойдёт.
          </div>
        </>
      ) : (
        <>
          <div>
            <h4 className="font-serif text-2xl mb-1">{photos.length} фото</h4>
            <p className="text-sm text-slate-500">
              Можно добавить ещё или удалить лишние.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-brand-pale/40 group">
                <AuthMedia preview src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 hover:border-brand text-slate-400 hover:text-brand flex items-center justify-center transition-colors"
            >
              {uploading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={24} />}
            </button>
          </div>

          {uploadError && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 text-red-900 px-3 py-2 text-sm">
              {uploadError}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Step 2: Context — child, area, title, description (+ AI)
// ──────────────────────────────────────────────────────────

function Step2Context({
  children,
  areas,
  childId,
  setChildId,
  areaId,
  setAreaId,
  title,
  setTitle,
  text,
  setText,
  generating,
  onGenerate,
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
    <div className="space-y-5">
      <div>
        <h4 className="font-serif text-2xl mb-1">Контекст</h4>
        <p className="text-sm text-slate-500">
          Кого касается наблюдение и что произошло.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
            Ребёнок
          </label>
          <select
            value={childId}
            onChange={e => setChildId(e.target.value)}
            className={inputCls}
          >
            {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
            Область
          </label>
          <select
            value={areaId}
            onChange={e => setAreaId(e.target.value)}
            className={inputCls}
          >
            <option value="">—</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
          Упражнение / заголовок
        </label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Переливание воды, Розовая башня, Числовые штанги…"
          className={inputCls}
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Описание для родителей
          </label>
          <button
            type="button"
            onClick={onGenerate}
            disabled={!title.trim() || generating}
            className="inline-flex items-center gap-1 text-xs text-brand hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {generating ? 'Генерация…' : 'Сгенерировать'}
          </button>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Что развивает упражнение, как ребёнок с ним работал…"
          rows={6}
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
        />
        <p className="text-xs text-slate-400 mt-1">
          AI-генерация работает по заголовку и области. Текст всегда можно поправить.
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Step 3: Publish — preview + visibility
// ──────────────────────────────────────────────────────────

function Step3Publish({
  photos,
  child,
  area,
  title,
  text,
  visible,
  setVisible,
  error,
}: {
  photos: string[];
  child?: ChildLite;
  area?: Area;
  title: string;
  text: string;
  visible: boolean;
  setVisible: (v: boolean) => void;
  error: string;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h4 className="font-serif text-2xl mb-1">Проверьте перед публикацией</h4>
        <p className="text-sm text-slate-500">
          Так пост будет выглядеть в ленте {visible ? 'у родителя' : 'только у вас'}.
        </p>
      </div>

      {/* Post preview */}
      <Card padding="md" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              {area?.title || 'Наблюдение'}
            </div>
            {title && <h3 className="font-serif text-xl mt-0.5">{title}</h3>}
          </div>
          <div className="text-xs text-slate-500 shrink-0">{child?.name}</div>
        </div>
        {photos.length > 0 && (
          <div className={`grid gap-1.5 ${photos.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
            {photos.map((url, i) => (
              <div
                key={i}
                className={`${photos.length === 1 ? 'aspect-[4/3]' : 'aspect-square'} rounded-xl overflow-hidden bg-brand-pale/40`}
              >
                <AuthMedia preview src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
        {text && (
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{text}</p>
        )}
      </Card>

      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="w-full p-4 rounded-2xl border border-slate-200 hover:border-brand transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              visible ? 'bg-success/20 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {visible ? <Eye size={18} /> : <EyeOff size={18} />}
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm">
              {visible ? 'Видно родителям' : 'Только для педагога'}
            </div>
            <div className="text-xs text-slate-500">
              {visible
                ? 'Пост появится у родителя в ленте «Прогресс»'
                : 'Запись останется в дневнике, родителю не покажется'}
            </div>
          </div>
          <div
            className={`w-10 h-6 rounded-full transition-colors relative ${
              visible ? 'bg-brand' : 'bg-slate-200'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                visible ? 'left-4' : 'left-0.5'
              }`}
            />
          </div>
        </div>
      </button>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 text-red-900 px-3 py-2 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
