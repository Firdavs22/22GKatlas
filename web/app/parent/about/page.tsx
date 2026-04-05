'use client';
import PageLayout from '@/components/PageLayout';

const ZONES = [
  { icon: '🏠', title: 'Практическая жизнь', color: '#F59E0B', desc: 'Навыки самостоятельности: одевание, уборка, уход за собой и пространством. Развивает концентрацию и порядок.' },
  { icon: '👁️', title: 'Сенсорика', color: '#8B5CF6', desc: 'Развитие органов чувств через специальные материалы. Ребёнок учится различать форму, цвет, вес, звук, запах.' },
  { icon: '🔢', title: 'Математика', color: '#3B82F6', desc: 'Математические понятия через физические предметы. От счёта до операций — всё через руки и ощущения.' },
  { icon: '📖', title: 'Язык', color: '#10B981', desc: 'Чтение, письмо, речь. Работа с буквами, звуками, словарным запасом в игровой форме.' },
  { icon: '🌍', title: 'Космос', color: '#EF4444', desc: 'Природа, география, история, биология. Ребёнок учится понимать мир и своё место в нём.' },
];

export default function AboutPage() {
  return (
    <PageLayout title="О методе">
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-sm text-blue-800 leading-relaxed">
            ГлобоАтлас использует методологию Монтессори. Вместо оценок — наблюдение за тем, что ребёнок уже умеет и к чему движется.
          </p>
        </div>
        {ZONES.map(zone => (
          <div key={zone.title} className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{zone.icon}</span>
              <h3 className="font-semibold text-gray-900" style={{ color: zone.color }}>{zone.title}</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{zone.desc}</p>
          </div>
        ))}

        {/* Stages explanation */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Стадии освоения навыка</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 min-w-[32px] text-center">—</span>
              <span className="text-sm text-gray-600"><strong>Не начат</strong> — презентация ещё не проводилась</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 min-w-[32px] text-center">ЗН</span>
              <span className="text-sm text-gray-600"><strong>Знакомство</strong> — педагог провёл презентацию</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 min-w-[32px] text-center">ПВ</span>
              <span className="text-sm text-gray-600"><strong>Повторение</strong> — ребёнок практикуется самостоятельно</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 min-w-[32px] text-center">УС</span>
              <span className="text-sm text-gray-600"><strong>Усвоено</strong> — уверенно проявляет навык</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400 text-center">
            Каждый ребёнок двигается в своём темпе. Мы наблюдаем, а не торопим.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
