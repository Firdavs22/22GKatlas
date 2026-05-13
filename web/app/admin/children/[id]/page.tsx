'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import ChildProfileCard from '@/components/ChildProfileCard';
import api from '@/lib/api';

export default function AdminChildDetail() {
  const { id } = useParams<{ id: string }>();
  const [child, setChild] = useState<any>(null);

  useEffect(() => {
    api.get(`/admin/children/${id}`).then(r => setChild(r.data));
  }, [id]);

  if (!child) return <PageLayout><p className="p-8 text-center text-gray-500">Загрузка...</p></PageLayout>;

  return (
    <PageLayout title={child.name} showBackButton>
      <ChildProfileCard child={child} showRelations />

      <div className="bg-white border rounded-xl p-6">
        <h3 className="text-lg font-medium mb-4">Посещаемость (последние дни)</h3>
        {child.attendance?.length ? (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {child.attendance.map((record: any) => (
              <div key={record.id} className="flex flex-col items-center min-w-[60px] p-2 border rounded-lg bg-gray-50">
                <div className="text-xs text-gray-500 mb-1">{new Date(record.date).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}</div>
                <div className={`text-sm font-medium ${record.status === 'present' ? 'text-green-600' : record.status === 'absent' ? 'text-red-500' : 'text-gray-400'}`}>
                  {record.status === 'present' ? 'Был(а)' : record.status === 'absent' ? 'Не был(а)' : '—'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Нет данных о посещаемости</p>
        )}
      </div>
    </PageLayout>
  );
}
