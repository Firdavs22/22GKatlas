'use client';
import { useEffect, useState } from 'react';
import { Plus, Image as ImageIcon } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, Badge } from '@/components/ui';
import api from '@/lib/api';
import { Child, Observation } from '@/lib/types';
import AuthMedia from '@/components/AuthMedia';
import ObservationPostWizard from '@/components/ObservationPostWizard';

interface Area { id: string; title: string; }

function nameInitial(name?: string): string {
  return (name?.trim()?.charAt(0) || '?').toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export default function TeacherDiary() {
  const [children, setChildren] = useState<Child[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [childFilter, setChildFilter] = useState<string>('all');

  // Wizard state (Instagram-style 3-step flow)
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    api.get('/children').then(r => setChildren(r.data));
    api.get('/admin/areas').then(r => setAreas(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    // Load observations across all teacher's children
    if (children.length === 0) return;
    Promise.all(
      children.map(c =>
        api.get(`/children/${c.id}/observations`).then(r =>
          (r.data as Observation[]).map(o => ({ ...o, childId: c.id, childName: (c.name as string) })),
        ).catch(() => []),
      ),
    ).then(lists => {
      const merged = (lists.flat() as (Observation & { childName?: string })[]).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      setObservations(merged);
    });
  }, [children]);

  const visibleObservations = observations.filter(o =>
    childFilter === 'all' ? true : o.childId === childFilter,
  );

  return (
    <PageLayout
      eyebrow="Наблюдения за детьми"
      title="Дневник"
      wide
      actions={
        <>
          <div className="relative">
            <select
              value={childFilter}
              onChange={e => setChildFilter(e.target.value)}
              className="h-9 px-3 text-sm rounded-full border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 appearance-none cursor-pointer pr-8"
            >
              <option value="all">Все дети</option>
              {children.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Button variant="primary" size="sm" onClick={() => setWizardOpen(true)}>
            <Plus size={16} />
            Новый пост
          </Button>
        </>
      }
    >
      <div className="max-w-2xl mx-auto">
        {/* Observations list */}
        <div className="space-y-3">
          {visibleObservations.length === 0 ? (
            <Card padding="md">
              <div className="text-sm text-slate-400 py-8 text-center">
                Записей пока нет
              </div>
            </Card>
          ) : (
            visibleObservations.map(o => {
              const item = o as Observation & { childName?: string };
              const area = areas.find(a => a.id === item.areaId);
              return (
                <Card key={item.id} padding="md">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-pale flex items-center justify-center font-serif text-sm text-brand shrink-0">
                      {nameInitial(item.childName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3 mb-1">
                        <span className="font-medium text-sm">{item.childName}</span>
                        <span className="text-xs text-slate-500 shrink-0">
                          {formatDate(item.date)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap mb-3">
                        {item.text}
                      </p>
                      {item.photos.length > 0 && (
                        <div className="flex gap-2 mb-3">
                          {item.photos.slice(0, 4).map((url, i) => (
                            <div key={i} className="w-16 h-16 rounded-lg overflow-hidden bg-brand-pale/40">
                              <AuthMedia preview src={url} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs">
                        {area && <Badge tone="brand">{area.title}</Badge>}
                        {item.photos.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <ImageIcon size={12} /> {item.photos.length} фото
                          </span>
                        )}
                        <span className="ml-auto">
                          <Badge tone={item.visible ? 'success' : 'neutral'} dot>
                            {item.visible ? 'видно родителям' : 'только педагог'}
                          </Badge>
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

      </div>

      {wizardOpen && (
        <ObservationPostWizard
          children={children}
          areas={areas}
          onClose={() => setWizardOpen(false)}
          onPublished={obs => {
            setObservations(prev => [obs as unknown as Observation, ...prev]);
            setWizardOpen(false);
          }}
        />
      )}
    </PageLayout>
  );
}
