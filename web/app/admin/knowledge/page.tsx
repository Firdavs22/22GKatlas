'use client';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, FolderPlus, FileText, Video } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, Badge, SectionLabel } from '@/components/ui';
import api from '@/lib/api';

interface KbCategory {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  order: number;
  _count?: { articles: number };
}

interface KbArticle {
  id: string;
  categoryId: string;
  title: string;
  excerpt?: string | null;
  body: string;
  videoUrl?: string | null;
  coverUrl?: string | null;
  published: boolean;
  createdAt: string;
  category?: { id: string; title: string };
}

const inputCls =
  'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export default function AdminKnowledge() {
  const [categories, setCategories] = useState<KbCategory[]>([]);
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [activeCat, setActiveCat] = useState<string>('');

  const [catFormOpen, setCatFormOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({ title: '', description: '' });

  const [articleFormOpen, setArticleFormOpen] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [articleForm, setArticleForm] = useState({
    categoryId: '',
    title: '',
    excerpt: '',
    body: '',
    videoUrl: '',
    coverUrl: '',
    published: true,
  });

  const load = () => {
    api.get('/kb/categories').then(r => {
      setCategories(r.data);
      if (!activeCat && r.data[0]) setActiveCat(r.data[0].id);
    });
    api.get('/kb/articles').then(r => setArticles(r.data));
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const visibleArticles = useMemo(
    () => (activeCat ? articles.filter(a => a.categoryId === activeCat) : articles),
    [articles, activeCat],
  );

  const submitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCatId) {
      await api.put(`/kb/categories/${editingCatId}`, catForm);
    } else {
      await api.post('/kb/categories', catForm);
    }
    setCatFormOpen(false);
    setEditingCatId(null);
    setCatForm({ title: '', description: '' });
    load();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Удалить раздел? Внутри не должно быть статей.')) return;
    try {
      await api.delete(`/kb/categories/${id}`);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Не удалось удалить');
    }
  };

  const submitArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...articleForm, categoryId: articleForm.categoryId || activeCat };
    if (editingArticleId) {
      await api.put(`/kb/articles/${editingArticleId}`, payload);
    } else {
      await api.post('/kb/articles', payload);
    }
    setArticleFormOpen(false);
    setEditingArticleId(null);
    setArticleForm({
      categoryId: activeCat,
      title: '',
      excerpt: '',
      body: '',
      videoUrl: '',
      coverUrl: '',
      published: true,
    });
    load();
  };

  const deleteArticle = async (id: string) => {
    if (!confirm('Удалить статью?')) return;
    await api.delete(`/kb/articles/${id}`);
    setArticles(prev => prev.filter(a => a.id !== id));
  };

  const editArticle = (a: KbArticle) => {
    setEditingArticleId(a.id);
    setArticleForm({
      categoryId: a.categoryId,
      title: a.title,
      excerpt: a.excerpt || '',
      body: a.body,
      videoUrl: a.videoUrl || '',
      coverUrl: a.coverUrl || '',
      published: a.published,
    });
    setArticleFormOpen(true);
  };

  return (
    <PageLayout
      eyebrow="Полезные материалы для родителей"
      title="База знаний"
      wide
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => {
            setEditingCatId(null);
            setCatForm({ title: '', description: '' });
            setCatFormOpen(v => !v);
          }}>
            <FolderPlus size={16} />
            Раздел
          </Button>
          <Button variant="primary" size="sm" onClick={() => {
            setEditingArticleId(null);
            setArticleForm({
              categoryId: activeCat,
              title: '',
              excerpt: '',
              body: '',
              videoUrl: '',
              coverUrl: '',
              published: true,
            });
            setArticleFormOpen(v => !v);
          }}>
            <Plus size={16} />
            Статья
          </Button>
        </>
      }
    >
      {catFormOpen && (
        <Card padding="md" className="mb-6">
          <h3 className="font-serif text-xl mb-4">
            {editingCatId ? 'Изменить раздел' : 'Новый раздел'}
          </h3>
          <form onSubmit={submitCategory} className="space-y-3">
            <input
              value={catForm.title}
              onChange={e => setCatForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Название раздела"
              required
              className={inputCls}
            />
            <textarea
              value={catForm.description}
              onChange={e => setCatForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Описание (опц.)"
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
            />
            <div className="flex gap-2">
              <Button type="submit" variant="primary">Сохранить</Button>
              <Button type="button" variant="outline" onClick={() => setCatFormOpen(false)}>
                Отмена
              </Button>
            </div>
          </form>
        </Card>
      )}

      {articleFormOpen && (
        <Card padding="md" className="mb-6">
          <h3 className="font-serif text-xl mb-4">
            {editingArticleId ? 'Изменить статью' : 'Новая статья'}
          </h3>
          <form onSubmit={submitArticle} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                value={articleForm.categoryId || activeCat}
                onChange={e => setArticleForm(p => ({ ...p, categoryId: e.target.value }))}
                required
                className={inputCls}
              >
                <option value="">Раздел…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm h-10 px-3 rounded-xl border border-slate-200 bg-white">
                <input
                  type="checkbox"
                  checked={articleForm.published}
                  onChange={e => setArticleForm(p => ({ ...p, published: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand"
                />
                Опубликовать сразу
              </label>
            </div>
            <input
              value={articleForm.title}
              onChange={e => setArticleForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Заголовок"
              required
              className={inputCls}
            />
            <input
              value={articleForm.excerpt}
              onChange={e => setArticleForm(p => ({ ...p, excerpt: e.target.value }))}
              placeholder="Краткое описание (для списка)"
              className={inputCls}
            />
            <textarea
              value={articleForm.body}
              onChange={e => setArticleForm(p => ({ ...p, body: e.target.value }))}
              placeholder="Текст статьи (markdown / простой текст)"
              rows={8}
              required
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-y"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={articleForm.videoUrl}
                onChange={e => setArticleForm(p => ({ ...p, videoUrl: e.target.value }))}
                placeholder="Ссылка на видео / подкаст (YouTube, VK, Дзен)"
                className={inputCls}
              />
              <input
                value={articleForm.coverUrl}
                onChange={e => setArticleForm(p => ({ ...p, coverUrl: e.target.value }))}
                placeholder="URL обложки (опц.)"
                className={inputCls}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="primary">Сохранить</Button>
              <Button type="button" variant="outline" onClick={() => {
                setArticleFormOpen(false);
                setEditingArticleId(null);
              }}>
                Отмена
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        <aside>
          <SectionLabel>Разделы</SectionLabel>
          <div className="mt-3 space-y-1">
            <button
              onClick={() => setActiveCat('')}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                !activeCat ? 'bg-brand-pale text-brand font-medium' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Все статьи <span className="text-xs text-slate-400">{articles.length}</span>
            </button>
            {categories.map(c => {
              const active = c.id === activeCat;
              return (
                <div key={c.id} className="group flex items-center">
                  <button
                    onClick={() => setActiveCat(c.id)}
                    className={`flex-1 text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                      active ? 'bg-brand-pale text-brand font-medium' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {c.title}{' '}
                    <span className="text-xs text-slate-400">{c._count?.articles ?? 0}</span>
                  </button>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                    <button
                      onClick={() => {
                        setEditingCatId(c.id);
                        setCatForm({ title: c.title, description: c.description || '' });
                        setCatFormOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-brand"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => deleteCategory(c.id)}
                      className="p-1.5 text-slate-400 hover:text-danger"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
            {categories.length === 0 && (
              <div className="text-xs text-slate-400 px-3 py-2">
                Разделов пока нет. Создайте первый.
              </div>
            )}
          </div>
        </aside>

        <div className="space-y-3">
          {visibleArticles.length === 0 ? (
            <Card padding="md">
              <div className="text-sm text-slate-400 py-12 text-center">
                В этом разделе статей пока нет
              </div>
            </Card>
          ) : (
            visibleArticles.map(a => (
              <Card key={a.id} padding="md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {a.category && <Badge tone="neutral">{a.category.title}</Badge>}
                      {!a.published && <Badge tone="warn">черновик</Badge>}
                      {a.videoUrl && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <Video size={12} /> видео
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif text-xl mb-1">{a.title}</h3>
                    {a.excerpt && (
                      <p className="text-sm text-slate-600 line-clamp-2">{a.excerpt}</p>
                    )}
                    <div className="text-xs text-slate-400 mt-2">
                      {new Date(a.createdAt).toLocaleDateString('ru-RU', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => editArticle(a)}
                      className="p-1.5 text-slate-400 hover:text-brand"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deleteArticle(a.id)}
                      className="p-1.5 text-slate-400 hover:text-danger"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
          {visibleArticles.length > 0 && (
            <div className="text-xs text-slate-400 text-center pt-2 inline-flex items-center gap-1">
              <FileText size={12} /> Всего статей в разделе: {visibleArticles.length}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
