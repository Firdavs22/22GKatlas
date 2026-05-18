'use client';
import { useEffect, useState } from 'react';
import { Image as ImageIcon, Paperclip, Send, Plus, X } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, Badge } from '@/components/ui';
import api from '@/lib/api';
import { FeedItem, Child } from '@/lib/types';
import FileUpload from '@/components/FileUpload';
import AuthMedia from '@/components/AuthMedia';
import PostMedia from '@/components/PostMedia';

type PostType = 'group_news' | 'child_photo' | 'child_achievement';

const TYPE_OPTIONS: { id: PostType; label: string }[] = [
  { id: 'child_photo', label: 'Фото' },
  { id: 'child_achievement', label: 'Достижение' },
  { id: 'group_news', label: 'Новость' },
];

const TYPE_LABEL: Record<string, string> = {
  child_photo: 'фото',
  child_achievement: 'достижение',
  group_news: 'новость',
  school_news: 'новость',
  menu: 'меню',
  event: 'событие',
};

const TYPE_TONE: Record<string, 'brand' | 'success' | 'neutral' | 'warn'> = {
  child_photo: 'brand',
  child_achievement: 'success',
  group_news: 'brand',
  school_news: 'neutral',
  menu: 'neutral',
  event: 'warn',
};

function nameInitial(name?: string): string {
  return (name?.trim()?.charAt(0) || '?').toUpperCase();
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} в ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function TeacherFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [groupName, setGroupName] = useState('группе');

  // Composer
  const [composerOpen, setComposerOpen] = useState(false);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [postType, setPostType] = useState<PostType>('group_news');
  const [childId, setChildId] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    api.get('/feed').then(r => setFeed(r.data));
    api.get('/children').then(r => {
      setChildren(r.data);
      const gName = r.data[0]?.group?.name;
      if (gName) setGroupName(`«${gName}»`);
      if (r.data[0]) setChildId(r.data[0].id);
    });
  }, []);

  const publish = async () => {
    if (!text.trim() && !title.trim() && photos.length === 0) return;
    setPosting(true);
    try {
      const scope = postType === 'group_news' ? 'group' : 'child';
      const payload: Record<string, unknown> = {
        type: postType,
        scope,
        text: text || undefined,
        title: title || undefined,
        mediaUrls: photos,
      };
      if (postType !== 'group_news') payload.childId = childId;
      const { data } = await api.post('/feed', payload);
      setFeed(prev => [data, ...prev]);
      setText('');
      setTitle('');
      setPhotos([]);
      setComposerOpen(false);
    } finally {
      setPosting(false);
    }
  };

  const closeComposer = () => {
    if (posting) return;
    setComposerOpen(false);
  };

  return (
    <PageLayout
      eyebrow="Публикации для родителей"
      title="Лента группы"
      wide
      actions={
        <Button variant="primary" size="sm" onClick={() => setComposerOpen(true)}>
          <Plus size={16} />
          Новая публикация
        </Button>
      }
    >
      {composerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          onClick={closeComposer}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl shadow-xl my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  Опубликовать в группе {groupName}
                </div>
                <h3 className="font-serif text-xl mt-0.5">Новая публикация</h3>
              </div>
              <button
                type="button"
                onClick={closeComposer}
                className="text-slate-400 hover:text-slate-700 p-1"
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Заголовок (опционально)"
                className="w-full px-3 py-2 text-sm font-serif text-base rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Что хотите рассказать родителям?"
                rows={5}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
              />

              {photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {photos.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-brand-pale/40 group">
                      <AuthMedia src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Убрать"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <FileUpload
                  multiple
                  accept="image/*"
                  onUpload={urls => setPhotos(p => [...p, ...urls])}
                  label={
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand cursor-pointer">
                      <ImageIcon size={16} /> Фото
                    </span>
                  }
                />
                <FileUpload
                  multiple
                  onUpload={urls => setPhotos(p => [...p, ...urls])}
                  label={
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand cursor-pointer">
                      <Paperclip size={16} /> Файл
                    </span>
                  }
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <div className="inline-flex rounded-full bg-slate-100 p-0.5">
                  {TYPE_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setPostType(opt.id)}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        postType === opt.id ? 'bg-white shadow-sm font-medium' : 'text-slate-500'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {postType !== 'group_news' && children.length > 0 && (
                  <select
                    value={childId}
                    onChange={e => setChildId(e.target.value)}
                    className="h-8 px-2 text-xs rounded-full border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  >
                    {children.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={closeComposer} disabled={posting}>
                Отмена
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={publish}
                disabled={posting || (!text.trim() && !title.trim() && photos.length === 0)}
              >
                <Send size={14} />
                {posting ? 'Публикую…' : 'Опубликовать'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="space-y-4">
        {feed.length === 0 ? (
          <Card padding="md">
            <div className="text-sm text-slate-400 py-12 text-center">
              Публикаций пока нет
            </div>
          </Card>
        ) : (
          feed.map(item => (
            <Card key={item.id} padding="md">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-brand-pale flex items-center justify-center font-serif text-sm text-brand shrink-0">
                  {nameInitial(item.author?.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium text-sm truncate">{item.author?.name || 'Вы'}</span>
                    <Badge tone={TYPE_TONE[item.type] || 'neutral'}>{TYPE_LABEL[item.type] || item.type}</Badge>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{formatDateTime(item.createdAt)}</div>
                </div>
              </div>
              {item.title && <h3 className="font-serif text-2xl mb-2">{item.title}</h3>}
              {item.text && (
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap mb-3">
                  {item.text}
                </p>
              )}
              <PostMedia urls={item.mediaUrls} />
            </Card>
          ))
        )}
      </div>
    </PageLayout>
  );
}
