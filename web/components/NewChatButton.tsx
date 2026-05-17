'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import type { PickerContact } from '@/components/StaffPicker';

interface NewChatButtonProps {
  staff: PickerContact[];
  /** Human label per role, used as section header in the dropdown. */
  roleLabels: Record<string, string>;
  /** Section order. */
  roleOrder: string[];
  loading?: boolean;
  emptyHint?: string;
  onPick: (s: PickerContact) => void;
}

export default function NewChatButton({
  staff,
  roleLabels,
  roleOrder,
  loading,
  emptyHint = 'Контактов нет',
  onPick,
}: NewChatButtonProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return staff;
    const q = query.toLowerCase();
    return staff.filter(s => {
      const roleLbl = roleLabels[s.role] || s.role;
      return (
        s.name.toLowerCase().includes(q) ||
        roleLbl.toLowerCase().includes(q) ||
        (s.child || '').toLowerCase().includes(q)
      );
    });
  }, [staff, query, roleLabels]);

  const visibleRoles = useMemo(
    () => roleOrder.filter(r => filtered.some(s => s.role === r)),
    [roleOrder, filtered],
  );

  return (
    <div ref={rootRef} className="relative">
      <Button variant="primary" size="sm" onClick={() => setOpen(v => !v)}>
        <Plus size={16} />
        Новый чат
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 z-30 rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Поиск контакта"
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="py-6 flex items-center justify-center text-slate-400">
                <Loader2 size={16} className="animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-6 text-xs text-slate-400 text-center px-4">
                {query ? 'Ничего не найдено' : emptyHint}
              </div>
            ) : (
              visibleRoles.map(role => {
                const items = filtered.filter(s => s.role === role);
                return (
                  <div key={role} className="py-1">
                    <div className="px-4 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      {roleLabels[role] || role}
                    </div>
                    {items.map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          onPick(s);
                          setOpen(false);
                        }}
                        disabled={loading}
                        className="w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left disabled:opacity-50"
                      >
                        <div className="w-8 h-8 rounded-full bg-brand-pale flex items-center justify-center font-serif text-xs text-brand shrink-0">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{s.name}</div>
                          {s.child && (
                            <div className="text-[11px] text-slate-500 truncate">по {s.child}</div>
                          )}
                        </div>
                        <MessageCircle size={14} className="text-slate-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
