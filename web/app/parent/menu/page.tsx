'use client';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button } from '@/components/ui';
import api from '@/lib/api';
import {
  MENU_DAY_NAMES,
  MENU_DAY_SHORT,
  parseMenuContent,
  type ParsedMenuMeal,
} from '@/lib/menu';

interface MenuItem {
  id: string;
  title: string;
  content: string;
  startDate: string;
  endDate: string;
}

/** Common meal name -> normalized label & display order. */
const MEAL_ORDER = ['Завтрак', 'Обед', 'Полдник', 'Ужин', 'Перекус'];

/** Build a map: meal name -> day name -> joined dishes. */
function pivotByMeal(parsed: Record<string, ParsedMenuMeal[]>): { mealNames: string[]; grid: Map<string, Map<string, string>> } {
  const grid = new Map<string, Map<string, string>>();
  const mealsSet = new Set<string>();
  for (const day of MENU_DAY_NAMES) {
    for (const meal of parsed[day] || []) {
      if (!grid.has(meal.name)) grid.set(meal.name, new Map());
      mealsSet.add(meal.name);
      const dishes = [meal.food, meal.alternative].filter(Boolean).join(' / ');
      grid.get(meal.name)!.set(day, dishes);
    }
  }
  const mealNames = Array.from(mealsSet).sort((a, b) => {
    const ai = MEAL_ORDER.indexOf(a);
    const bi = MEAL_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  return { mealNames, grid };
}

export default function MenuPage() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    api.get('/activities/menu').then(r => setMenus(r.data)).catch(() => {});
  }, []);

  const currentMenu = menus[0];
  const archive = menus.slice(1);

  const parsed = useMemo(() => parseMenuContent(currentMenu?.content || ''), [currentMenu]);
  const { mealNames, grid } = useMemo(() => pivotByMeal(parsed), [parsed]);
  const hasParsedData = mealNames.length > 0;

  return (
    <PageLayout
      eyebrow="Питание на неделю"
      title="Меню"
      actions={
        <Button variant="outline" size="sm" onClick={() => setShowArchive(v => !v)}>
          Архив {archive.length > 0 && <span className="text-slate-400">· {archive.length}</span>}
        </Button>
      }
    >
      {!currentMenu ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-12 text-center">
            Меню ещё не опубликовано
          </div>
        </Card>
      ) : !hasParsedData ? (
        <Card padding="md">
          <h3 className="font-serif text-xl mb-3">{currentMenu.title}</h3>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{currentMenu.content}</p>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-5 py-3 w-28">
                    Приём
                  </th>
                  {MENU_DAY_NAMES.map((d, i) => (
                    <th
                      key={d}
                      className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-5 py-3"
                    >
                      {MENU_DAY_SHORT[i]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mealNames.map(meal => (
                  <tr key={meal}>
                    <td className="px-5 py-4 font-serif text-base align-top">{meal}</td>
                    {MENU_DAY_NAMES.map(day => (
                      <td key={day} className="px-5 py-4 text-sm text-slate-700 align-top">
                        {grid.get(meal)?.get(day) || <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showArchive && archive.length > 0 && (
        <div className="mt-6 space-y-2">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500 px-1">
            Предыдущие меню
          </div>
          {archive.map(m => (
            <details key={m.id} className="group">
              <summary className="cursor-pointer list-none">
                <Card padding="sm" className="hover:border-brand transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{m.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {new Date(m.startDate).toLocaleDateString('ru-RU')} — {new Date(m.endDate).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    <ChevronDown size={16} className="text-slate-400 transition-transform group-open:rotate-180" />
                  </div>
                </Card>
              </summary>
              <div className="px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap">{m.content}</div>
            </details>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
