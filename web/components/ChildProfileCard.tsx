import { Card, Badge, SectionLabel } from '@/components/ui';

interface PersonLike {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  relation?: string;
  role?: string;
}

interface ChildLike {
  id?: string;
  name?: string;
  birthDate?: string;
  status?: string;
  allergies?: string;
  notes?: string;
  extraServices?: string[];
  parents?: { parent: PersonLike }[];
  contacts?: PersonLike[];
  representatives?: PersonLike[];
  specialists?: { specialist: PersonLike }[];
  group?: { name?: string; teacher?: { name?: string } };
}

interface ChildProfileCardProps {
  child: ChildLike | null;
  showRelations?: boolean;
}

function calcAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const b = new Date(birthDate);
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}

function text(value: unknown, fallback = 'Не указано'): string {
  if (value === null || value === undefined) return fallback;
  const cleaned = String(value).trim();
  return cleaned || fallback;
}

function EmptyValue({ children = 'Не указано' }: { children?: string }) {
  return <div className="text-sm text-slate-400">{children}</div>;
}

function PersonCard({ person, fallbackRelation }: { person?: PersonLike; fallbackRelation?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-3 text-sm">
      <div className="font-medium">{text(person?.name, 'Имя не указано')}</div>
      <div className="text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        {person?.phone && <span>{person.phone}</span>}
        {person?.email && <span>{person.email}</span>}
        <span>{text(person?.relation || fallbackRelation, 'Роль не указана')}</span>
      </div>
    </div>
  );
}

export default function ChildProfileCard({ child, showRelations = false }: ChildProfileCardProps) {
  if (!child) return null;

  const age = calcAge(child.birthDate);
  const parents = (child.parents || []).map(link => link.parent).filter(Boolean);

  return (
    <Card padding="md" className="mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
        <div>
          <SectionLabel>Личное дело ребёнка</SectionLabel>
          <div className="text-sm text-slate-500 mt-1">
            {text(child.group?.name, 'Без группы')}
            {child.group?.teacher?.name ? ` · педагог: ${child.group.teacher.name}` : ''}
          </div>
        </div>
        <div className="text-sm text-slate-500">
          {child.birthDate
            ? new Date(child.birthDate).toLocaleDateString('ru-RU')
            : 'Дата рождения не указана'}
          {age !== null ? ` · ${age} лет` : ''}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 text-sm">
        <section className="xl:col-span-2">
          <SectionLabel>Родители</SectionLabel>
          <div className="mt-2">
            {parents.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {parents.map(parent => (
                  <PersonCard
                    key={parent?.id || parent?.email}
                    person={parent}
                    fallbackRelation="Родитель"
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-warn/30 bg-warn/15 text-orange-900 p-3 text-sm">
                Родитель не привязан к ребёнку в системе. Добавьте родителя в карточке ребёнка.
              </div>
            )}
          </div>
        </section>

        <section>
          <SectionLabel>Статус</SectionLabel>
          <div className="mt-2">
            {child.status === 'active' ? (
              <Badge tone="success" dot>активен</Badge>
            ) : child.status === 'left' ? (
              <Badge tone="neutral">выбыл</Badge>
            ) : (
              <Badge tone="neutral">{text(child.status)}</Badge>
            )}
          </div>
        </section>

        <section>
          <SectionLabel>Аллергии / питание</SectionLabel>
          <div className="mt-2">
            {child.allergies ? (
              <div className="rounded-xl border border-danger/20 bg-danger/10 text-red-900 p-3 text-sm whitespace-pre-wrap">
                {child.allergies}
              </div>
            ) : (
              <EmptyValue />
            )}
          </div>
        </section>

        <section>
          <SectionLabel>Доп. услуги</SectionLabel>
          <div className="mt-2">
            {child.extraServices?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {child.extraServices.map(service => (
                  <Badge key={service} tone="warn">{service}</Badge>
                ))}
              </div>
            ) : (
              <EmptyValue>Нет</EmptyValue>
            )}
          </div>
        </section>

        <section>
          <SectionLabel>Экстренные контакты</SectionLabel>
          <div className="mt-2">
            {child.contacts?.length ? (
              <div className="space-y-2">
                {child.contacts.map((c, i) => <PersonCard key={i} person={c} />)}
              </div>
            ) : (
              <EmptyValue />
            )}
          </div>
        </section>

        <section>
          <SectionLabel>Кто может забирать</SectionLabel>
          <div className="mt-2">
            {child.representatives?.length ? (
              <div className="space-y-2">
                {child.representatives.map((c, i) => <PersonCard key={i} person={c} />)}
              </div>
            ) : (
              <EmptyValue />
            )}
          </div>
        </section>

        {showRelations && (
          <section>
            <SectionLabel>Специалисты</SectionLabel>
            <div className="mt-2">
              {child.specialists?.length ? (
                <div className="space-y-2">
                  {child.specialists.map(link => (
                    <PersonCard
                      key={link.specialist.id}
                      person={link.specialist}
                      fallbackRelation={link.specialist.role}
                    />
                  ))}
                </div>
              ) : (
                <EmptyValue>Не назначены</EmptyValue>
              )}
            </div>
          </section>
        )}
      </div>

      {child.notes && (
        <section className="mt-5 pt-4 border-t border-slate-100">
          <SectionLabel>Заметки</SectionLabel>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm whitespace-pre-wrap mt-2">
            {child.notes}
          </div>
        </section>
      )}
    </Card>
  );
}
