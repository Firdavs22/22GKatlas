export type MenuMeal = {
  id?: string;
  dayIndex: number;
  time: string;
  name: string;
  food: string;
  alternative?: string;
};

export type ParsedMenuMeal = {
  time: string;
  name: string;
  food: string;
  alternative?: string;
};

export const MENU_DAY_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];
export const MENU_DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];

export function sortMenuMeals<T extends { time: string }>(items: T[]) {
  return [...items].sort((a, b) => a.time.localeCompare(b.time));
}

export function emptyParsedMenu(): Record<string, ParsedMenuMeal[]> {
  return MENU_DAY_NAMES.reduce<Record<string, ParsedMenuMeal[]>>((acc, day) => {
    acc[day] = [];
    return acc;
  }, {});
}

export function parseMenuContent(content: string): Record<string, ParsedMenuMeal[]> {
  const result = emptyParsedMenu();
  let currentDay = '';
  let currentMeal: ParsedMenuMeal | null = null;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    const dayMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (dayMatch) {
      const dayName = dayMatch[1].trim();
      currentDay = MENU_DAY_NAMES.includes(dayName) ? dayName : '';
      currentMeal = null;
      continue;
    }

    const mealMatch = trimmed.match(/^[•\-]\s*(\d{1,2}:\d{2})\s*[—–-]\s*(.+?):\s*(.+)$/);
    if (mealMatch && currentDay) {
      currentMeal = {
        time: mealMatch[1],
        name: mealMatch[2].trim(),
        food: mealMatch[3].trim(),
      };
      result[currentDay].push(currentMeal);
      continue;
    }

    const alternativeMatch = trimmed.match(/^(?:↳\s*)?Альтернатива:\s*(.+)$/i);
    if (alternativeMatch && currentMeal) {
      currentMeal.alternative = alternativeMatch[1].trim();
    }
  }

  return result;
}

export function formatMenuContent(meals: MenuMeal[]) {
  let content = '';

  MENU_DAY_NAMES.forEach((day, index) => {
    const dayMeals = sortMenuMeals(meals.filter(meal => meal.dayIndex === index));
    if (dayMeals.length === 0) return;

    content += `**${day}**\n`;
    dayMeals.forEach(meal => {
      content += `• ${meal.time} — ${meal.name}: ${meal.food}\n`;
      if (meal.alternative?.trim()) {
        content += `  ↳ Альтернатива: ${meal.alternative.trim()}\n`;
      }
    });
    content += '\n';
  });

  return content.trim();
}
