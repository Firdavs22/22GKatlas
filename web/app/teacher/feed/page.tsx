'use client';
import { useEffect, useState } from 'react';
import { Plus, Image as ImageIcon, Paperclip, Send } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, Badge } from '@/components/ui';
import api from '@/lib/api';
import { FeedItem, Child } from '@/lib/types';
import FileUpload from '@/components/FileUpload';
import AuthMedia from '@/components/AuthMedia';

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
    } finally {
      setPosting(false);
    }
  };

  return (
    <PageLayout
      eyebrow="Публикации для родителей"
      title="Лента группы"
      wide
      actions={
        <Button variant="primary" size="sm">
          <Plus size={16} />
          Новая публикация
        </Button>
      }
    >
      {/* Composer */}
      <Card padding="md" className="mb-6">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-pale flex items-center justify-center font-serif text-sm text-brand shrink-0">
            G
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500 mb-2">
              Опубликовать в группе {groupName}
            </div>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Заголовок (опционально)"
              className="w-full mb-2 px-3 py-2 text-sm font-serif text-base rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Что хотите рассказать родителям?"
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
            />
            {photos.length > 0 && (
              <div className="flex gap-2 mt-3">
                {photos.map((url, i) => (
                  <div key={i} className="w-16 h-16 rounded-lg overflow-hidden bg-brand-pale/40">
                    <AuthMedia src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <FileUpload
                onUpload={urls => setPhotos(p => [...p, ...urls])}
                label={
                  <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand">
                    <ImageIcon size={16} /> Фото
                  </span>
                }
              />
              <FileUpload
                onUpload={urls => setPhotos(p => [...p, ...urls])}
                label={
                  <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand">
                    <Paperclip size={16} /> Файл
                  </span>
                }
              />
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
              <div className="ml-auto inline-flex rounded-full bg-slate-100 p-0.5">
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
              <Button
                variant="primary"
                size="sm"
                onClick={publish}
                disabled={posting}
              >
                <Send size={14} />
                {posting ? 'Публикую…' : 'Опубликовать'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

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
              {item.mediaUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {item.mediaUrls.slice(0, 3).map((url, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden bg-brand-pale/40">
                      <AuthMedia src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </PageLayout>
  );
}
