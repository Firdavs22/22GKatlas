type ChildProfileCardProps = {
  child: any;
  showRelations?: boolean;
};

function getAge(birthDate?: string) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function text(value: unknown, fallback = 'Не указано') {
  if (value === null || value === undefined) return fallback;
  const cleaned = String(value).trim();
  return cleaned || fallback;
}

function EmptyValue({ children = 'Не указано' }: { children?: string }) {
  return <div className="text-sm text-gray-400">{children}</div>;
}

function PersonCard({ person, fallbackRelation }: { person: any; fallbackRelation?: string }) {
  return (
    <div className="bg-gray-50 border rounded-lg p-3">
      <div className="font-medium text-gray-900">{text(person?.name, 'Имя не указано')}</div>
      <div className="text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
        {person?.phone && <span>{person.phone}</span>}
        {person?.email && <span>{person.email}</span>}
        <span>{text(person?.relation || fallbackRelation, 'Роль не указана')}</span>
      </div>
    </div>
  );
}

export default function ChildProfileCard({ child, showRelations = false }: ChildProfileCardProps) {
  if (!child) return null;

  const age = getAge(child.birthDate);
  const parents = (child.parents || []).map((link: any) => link.parent).filter(Boolean);

  return (
    <div className="bg-white border rounded-xl p-5 mb-5">
      <div className="flex flex-wrap justify-between gap-3 border-b pb-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Личное дело ребёнка</h2>
          <div className="text-sm text-gray-500 mt-1">
            {text(child.group?.name, 'Без группы')}
            {child.group?.teacher?.name ? ` · педагог: ${child.group.teacher.name}` : ''}
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {child.birthDate ? new Date(child.birthDate).toLocaleDateString('ru') : 'Дата рождения не указана'}
          {age !== null ? ` · ${age} лет` : ''}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 text-sm">
        <section className="xl:col-span-2">
          <div className="text-xs font-medium text-gray-500 uppercase mb-2">Родители</div>
          {parents.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {parents.map((parent: any) => (
                <PersonCard key={parent.id || parent.email} person={parent} fallbackRelation="Родитель" />
              ))}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-lg p-3">
              Родитель не привязан к ребёнку в системе. Добавьте родителя в карточке ребёнка.
            </div>
          )}
        </section>

        <section>
          <div className="text-xs font-medium text-gray-500 uppercase mb-2">Статус</div>
          <div className="text-gray-800">{child.status === 'active' ? 'Активен' : child.status === 'left' ? 'Выбыл' : text(child.status)}</div>
        </section>

        <section>
          <div className="text-xs font-medium text-gray-500 uppercase mb-2">Аллергии / питание</div>
          {child.allergies ? (
            <div className="bg-red-50 text-red-700 border border-red-100 rounded-lg p-3 whitespace-pre-wrap">{child.allergies}</div>
          ) : (
            <EmptyValue />
          )}
        </section>

        <section>
          <div className="text-xs font-medium text-gray-500 uppercase mb-2">Дополнительные услуги</div>
          {child.extraServices?.length ? (
            <div className="flex flex-wrap gap-2">
              {child.extraServices.map((service: string) => (
                <span key={service} className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-medium">{service}</span>
              ))}
            </div>
          ) : (
            <EmptyValue children="Нет" />
          )}
        </section>

        <section>
          <div className="text-xs font-medium text-gray-500 uppercase mb-2">Экстренные контакты</div>
          {child.contacts?.length ? (
            <div className="space-y-2">
              {child.contacts.map((contact: any, index: number) => (
                <PersonCard key={index} person={contact} />
              ))}
            </div>
          ) : (
            <EmptyValue />
          )}
        </section>

        <section>
          <div className="text-xs font-medium text-gray-500 uppercase mb-2">Кто может забирать</div>
          {child.representatives?.length ? (
            <div className="space-y-2">
              {child.representatives.map((rep: any, index: number) => (
                <PersonCard key={index} person={rep} />
              ))}
            </div>
          ) : (
            <EmptyValue />
          )}
        </section>

        {showRelations && (
          <section>
            <div className="text-xs font-medium text-gray-500 uppercase mb-2">Специалисты</div>
            {child.specialists?.length ? (
              <div className="space-y-2">
                {child.specialists.map((specialistLink: any) => (
                  <PersonCard key={specialistLink.specialist.id} person={specialistLink.specialist} fallbackRelation={specialistLink.specialist.role} />
                ))}
              </div>
            ) : (
              <EmptyValue children="Не назначены" />
            )}
          </section>
        )}
      </div>

      {child.notes && (
        <section className="mt-4">
          <div className="text-xs font-medium text-gray-500 uppercase mb-2">Заметки</div>
          <div className="bg-gray-50 border rounded-lg p-3 text-sm whitespace-pre-wrap">{child.notes}</div>
        </section>
      )}
    </div>
  );
}
