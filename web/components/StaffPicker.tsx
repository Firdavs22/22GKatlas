'use client';
import { MessageCircle } from 'lucide-react';
import { Card, SectionLabel } from '@/components/ui';

export interface PickerContact {
  id: string;
  name: string;
  role: string;
  avatar?: string | null;
  child?: string;
}

interface StaffPickerProps {
  staff: PickerContact[];
  roleLabels: Record<string, string>;
  /** Roles in display order. */
  roleOrder: string[];
  onPick: (s: PickerContact) => void;
  onClose: () => void;
  loading?: boolean;
  emptyHint?: string;
}

export default function StaffPicker({
  staff,
  roleLabels,
  roleOrder,
  onPick,
  onClose,
  loading,
  emptyHint = 'Контактов не назначено',
}: StaffPickerProps) {
  const visibleRoles = roleOrder.filter(r => staff.some(s => s.role === r));

  return (
    <Card padding="md" className="mb-6">
      <div className="flex items-baseline justify-between mb-3">
        <SectionLabel>Кому написать</SectionLabel>
        <button
          onClick={onClose}
          className="text-xs text-slate-500 hover:text-foreground"
        >
          Закрыть
        </button>
      </div>
      {staff.length === 0 ? (
        <div className="text-sm text-slate-400 py-4 text-center">{emptyHint}</div>
      ) : (
        <div className="space-y-4">
          {visibleRoles.map(role => {
            const group = staff.filter(s => s.role === role);
            return (
              <div key={role}>
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-2">
                  {roleLabels[role] || role}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {group.map(s => (
                    <button
                      key={s.id}
                      onClick={() => onPick(s)}
                      disabled={loading}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-brand transition-colors disabled:opacity-50 text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-brand-pale flex items-center justify-center font-serif text-sm text-brand shrink-0">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{s.name}</div>
                        <div className="text-xs text-slate-500 truncate">
                          {s.child ? `по ${s.child}` : roleLabels[s.role] || s.role}
                        </div>
                      </div>
                      <MessageCircle size={16} className="text-slate-300 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
