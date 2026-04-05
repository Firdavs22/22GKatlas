'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';

export default function TeacherHeatmap() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/children/group-heatmap').then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <PageLayout title="Тепловая карта группы"><p className="text-gray-400 p-4">Загрузка...</p></PageLayout>;

  return (
    <PageLayout title="Тепловая карта группы">
      <p className="text-sm text-gray-500 mb-4">Навыки, требующие внимания — отсортированы от слабых к сильным</p>
      {data.length === 0 ? (
        <div className="text-center py-10 text-gray-400">Нет данных по прогрессу</div>
      ) : (
        <div className="space-y-2">
          {data.map((item, i) => (
            <div key={i} className="bg-white rounded-xl border p-3">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-sm font-medium text-gray-800">{item.title}</span>
                  <span className="text-xs ml-2" style={{ color: item.color }}>{item.area}</span>
                </div>
                <span className="text-sm font-bold" style={{
                  color: item.pct < 30 ? '#DC2626' : item.pct < 60 ? '#D97706' : '#16A34A'
                }}>{item.pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full">
                <div className="h-1.5 rounded-full transition-all" style={{
                  width: `${item.pct}%`,
                  backgroundColor: item.pct < 30 ? '#DC2626' : item.pct < 60 ? '#D97706' : '#16A34A'
                }} />
              </div>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                <span>Усвоено: {item.mastered}/{item.total}</span>
                <span>В процессе: {item.practicing}/{item.total}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
