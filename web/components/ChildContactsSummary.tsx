export const FAMILY_RELATIONS = ['Мама', 'Папа', 'Родственник', 'Няня', 'Водитель'];
type Contact = { name?: string; phone?: string; email?: string; relation?: string };

const aliases: Record<string, string> = { мать: 'Мама', мама: 'Мама', отец: 'Папа', папа: 'Папа', родственник: 'Родственник', няня: 'Няня', водитель: 'Водитель' };

export default function ChildContactsSummary({ contacts, representatives }: { contacts?: Contact[] | null; representatives?: Contact[] | null }) {
  const combined = [...(Array.isArray(contacts) ? contacts : []), ...(Array.isArray(representatives) ? representatives : [])];
  const rows = [...new Map(combined.filter(c => c && typeof c === 'object').map(c => [JSON.stringify([c.relation, c.name, c.phone, c.email]), c])).values()];
  const relation = (c: Contact) => aliases[c.relation?.trim().toLowerCase() || ''] || c.relation || 'Другой контакт';
  const groups = [...FAMILY_RELATIONS, ...new Set(rows.map(relation).filter(r => !FAMILY_RELATIONS.includes(r)))];
  return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
    {groups.map(group => <section key={group} className="rounded-xl border border-slate-100 p-3 text-sm min-w-0">
      <h3 className="font-medium mb-2">{group}</h3>
      {rows.filter(c => relation(c) === group).length ? rows.filter(c => relation(c) === group).map((c, i) => <div key={i} className="mb-2 last:mb-0 break-words">
        <p>{c.name || 'Имя не указано'}</p>
        <p className="text-slate-500 text-xs mt-1">{[c.phone, c.email].filter(Boolean).join(' · ') || 'Контактные данные не указаны'}</p>
      </div>) : <p className="text-slate-400">Не указано</p>}
    </section>)}
  </div>;
}
