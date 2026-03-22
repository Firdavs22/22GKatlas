'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Child } from '@/lib/types';

interface Group { id: string; name: string; }

const STATUS_OPTS = [
  { value: 'present', label: '✅ Присутствует', color: 'bg-green-100 text-green-700' },
  { value: 'absent', label: '❌ Отсутствует', color: 'bg-red-100 text-red-700' },
  { value: 'sick', label: '🤒 Болеет', color: 'bg-orange-100 text-orange-700' },
  { value: 'vacation', label: '🏖️ Отпуск', color: 'bg-blue-100 text-blue-700' },
];

export default function AdminAttendance() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  
  // Default to today
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // State for the table
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load groups and all children
    Promise.all([
      api.get('/admin/groups'),
      api.get('/admin/children')
    ]).then(([grpRes, chRes]) => {
      setGroups(grpRes.data);
      setChildren(chRes.data);
      if (grpRes.data.length > 0) {
        setSelectedGroup(grpRes.data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedGroup || !date) return;
    
    setLoading(true);
    // Fetch existing attendance for this group and date
    api.get(`/admin/attendance`, { params: { groupId: selectedGroup, date } })
      .then(res => {
        const map: Record<string, string> = {};
        res.data.forEach((a: { childId: string; status: string }) => { map[a.childId] = a.status; });
        setAttendance(map);
      })
      .finally(() => setLoading(false));
  }, [selectedGroup, date]);

  const groupChildren = children.filter(c => c.groupId === selectedGroup && c.status === 'active');

  const setStatus = (childId: string, status: string) => {
    setAttendance(prev => ({ ...prev, [childId]: status }));
  };

  const markAll = (status: string) => {
    const map: Record<string, string> = {};
    groupChildren.forEach(c => { map[c.id] = status; });
    setAttendance(map);
  };

  const saveAttendance = async () => {
    if (!selectedGroup || !date) return;
    setSaving(true);
    
    // Prepare records for the API
    const records = Object.entries(attendance).map(([childId, status]) => ({ childId, status }));
    
    try {
      await api.post('/admin/attendance', { groupId: selectedGroup, date, records });
      alert('Посещаемость успешно сохранена!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка сохранения';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout title="Учёт посещаемости">
      <div className="bg-white border rounded-xl p-4 mb-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Группа</label>
            <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className="w-full border rounded-lg px-3 py-2">
              <option value="" disabled>Выберите группу</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <button 
            onClick={saveAttendance} 
            disabled={saving || groupChildren.length === 0}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : '💾 Сохранить'}
          </button>
        </div>
      </div>

      {selectedGroup && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
            <h3 className="font-medium text-gray-700">Список детей ({groupChildren.length})</h3>
            <div className="flex gap-2 text-sm">
              <span className="text-gray-500 mr-2">Отметить всех:</span>
              <button onClick={() => markAll('present')} className="text-green-600 hover:underline">Присутствуют</button>
              <button onClick={() => markAll('absent')} className="text-red-500 hover:underline">Отсутствуют</button>
            </div>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-gray-500">Загрузка...</div>
          ) : groupChildren.length === 0 ? (
            <div className="p-8 text-center text-gray-500">В этой группе нет активных детей</div>
          ) : (
            <div className="divide-y">
              {groupChildren.map(child => {
                const currentStatus = attendance[child.id];
                return (
                  <div key={child.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <span className="font-medium">{child.name}</span>
                    <div className="flex gap-2">
                      {STATUS_OPTS.map(opt => {
                        const isSelected = currentStatus === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setStatus(child.id, opt.value)}
                            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                              isSelected ? opt.color + ' ring-2 ring-offset-1 ring-indigo-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}
