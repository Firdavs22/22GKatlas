/**
 * Idempotent dimension flag mapper.
 *
 * Scans every Skill.title + description (case-insensitive substring match)
 * and sets develops_emotion / develops_cognition / develops_body based on
 * the keyword dictionary from tz-karta-razvitiya.md §4.
 *
 * Run after every dictionary tweak — flags are reset before applying.
 *
 *   podman compose exec -T backend node prisma/map-skill-dimensions.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// All keyword arrays use Russian lower-case substrings.
// One match → flag = true. Add words conservatively (false positives hurt).
const KEYWORDS = {
  body: [
    'моторик', 'координаци', 'пинцетн', 'захват',
    'контроль движен', 'сила кисти', 'сила пальц', 'ловкость пальц',
    'вращательн', 'крупн', 'мелк',
    'подготовка руки к письму', 'подготовка к письму',
    'пространственн', 'тактильн', 'физическ', 'движени',
    // Practical actions (motor work)
    'мыть', 'мытьё', 'мытье', 'переливани', 'пересыпани', 'подметани',
    'застёгиван', 'застегиван', 'завязыван', 'шнуровк', 'кнопк',
    'полив', 'уборк', 'чист', 'стирк', 'глажени',
    'нарезани', 'резк', 'наливани', 'насыпани',
    'переноск', 'ношени', 'складывани', 'сворачивани',
    'втыкани', 'нанизыван',
    'разделени', 'отжимани',
    'штриховк', 'рисовани',
    'руки', 'пальц', 'кист',
  ],
  cognition: [
    'концентраци', 'мышлени', 'последовательн', 'сериаци',
    'абстракци', 'словарн', 'словарь', 'ассоциатив',
    'память', 'решение задач', 'различени', 'восприяти',
    'счёт', 'счет', 'числ', 'количеств', 'цифр',
    'фонетик', 'чтени', 'звук', 'буквы', 'букв ',
    'сопоставлени', 'классификаци', 'сортировк',
    'причинно-следствен', 'точност', 'логик',
    'математик', 'язык',
    'наблюдательн', 'наблюден',
    'геометр', 'форм', 'разряд', 'десят', 'сложени', 'вычитани',
    'умножени', 'делени',
    'цвет', 'размер', 'высот', 'вес ', 'температур',
    'симметри', 'узор', 'паттерн',
    'карт',                     // карты, картинки, карточки
    'словарь', 'словарн',
    'осмысли', 'распознав',
    'имя', 'назван',
  ],
  emotion: [
    'самостоятельн', 'чувство порядка',
    'забота о среде', 'уважение к среде',
    'забот', 'ухажив', 'уход за',
    'сотрудничеств', 'терпени', 'вежливост', 'граци',
    'эмоциональн', 'саморегуляц', 'социальн', 'взаимодействи',
    'самообслуживани', 'творчеств', 'общени', 'этикет',
    'ответствен', 'эмпати', 'уважени',
    'помощ', 'делиться', 'просьб',
    'тишин', 'спокойств',
    'самовыражени',
  ],
};

// §4.4 edge-case overrides — applied after keyword scan.
// If title/description starts with one of these patterns, force the exact
// flag-set (overriding what keywords inferred).
const OVERRIDES = [
  // 'concentration in pouring water' → cognition + body
  { match: /перелива|пересыпа/i, flags: { developsCognition: true, developsBody: true, developsEmotion: false } },
  // 'preparation for writing' → body only
  { match: /подготовка (руки )?к письму/i, flags: { developsBody: true, developsCognition: false, developsEmotion: false } },
  // 'order/sense of order' → emotion only (not cognition)
  { match: /чувство порядка/i, flags: { developsEmotion: true, developsCognition: false, developsBody: false } },
  // 'creativity' → emotion only
  { match: /творчеств/i, flags: { developsEmotion: true, developsCognition: false, developsBody: false } },
  // 'problem solving' → cognition only
  { match: /решение задач/i, flags: { developsCognition: true, developsEmotion: false, developsBody: false } },
];

function findFlags(text) {
  const lc = text.toLowerCase();
  const flags = { developsEmotion: false, developsCognition: false, developsBody: false };
  for (const kw of KEYWORDS.body)      if (lc.includes(kw)) { flags.developsBody = true; break; }
  for (const kw of KEYWORDS.cognition) if (lc.includes(kw)) { flags.developsCognition = true; break; }
  for (const kw of KEYWORDS.emotion)   if (lc.includes(kw)) { flags.developsEmotion = true; break; }

  for (const o of OVERRIDES) {
    if (o.match.test(text)) {
      return { ...o.flags };
    }
  }
  return flags;
}

async function main() {
  console.log('🧠 Mapping skill dimensions (idempotent)…\n');

  const skills = await prisma.skill.findMany({
    select: { id: true, title: true, description: true },
  });
  console.log(`Loaded ${skills.length} skills.`);

  const counts = { developsEmotion: 0, developsCognition: 0, developsBody: 0, none: 0 };
  const samples = { developsEmotion: [], developsCognition: [], developsBody: [], none: [] };

  for (const s of skills) {
    const text = `${s.title} ${s.description || ''}`.trim();
    const flags = findFlags(text);

    await prisma.skill.update({ where: { id: s.id }, data: flags });

    let bucketed = false;
    if (flags.developsEmotion)   { counts.developsEmotion++;   if (samples.developsEmotion.length   < 3) samples.developsEmotion.push(s.title);   bucketed = true; }
    if (flags.developsCognition) { counts.developsCognition++; if (samples.developsCognition.length < 3) samples.developsCognition.push(s.title); bucketed = true; }
    if (flags.developsBody)      { counts.developsBody++;      if (samples.developsBody.length      < 3) samples.developsBody.push(s.title);      bucketed = true; }
    if (!bucketed)               { counts.none++;              if (samples.none.length              < 5) samples.none.push(s.title); }
  }

  console.log('\n── Distribution ─────────────────────────');
  console.log(`Эмоции и общение:  ${counts.developsEmotion}`);
  console.log(`Мышление и память: ${counts.developsCognition}`);
  console.log(`Тело и движение:   ${counts.developsBody}`);
  console.log(`Без флага:         ${counts.none}`);
  console.log('────────────────────────────────────────\n');

  console.log('Samples → emotion:',   samples.developsEmotion);
  console.log('Samples → cognition:', samples.developsCognition);
  console.log('Samples → body:',      samples.developsBody);
  console.log('Samples → none:',      samples.none);

  // §4.5 sanity check (loose — adjusted from 40..180 because we have 1073 skills, not 232).
  const total = skills.length;
  const pctEmotion   = (counts.developsEmotion   / total) * 100;
  const pctCognition = (counts.developsCognition / total) * 100;
  const pctBody      = (counts.developsBody      / total) * 100;

  console.log(`\nCoverage %: emotion=${pctEmotion.toFixed(1)} cognition=${pctCognition.toFixed(1)} body=${pctBody.toFixed(1)}`);
  if (pctEmotion   < 5 || pctEmotion   > 80) console.warn('⚠️  emotion coverage off — tune dictionary');
  if (pctCognition < 30 || pctCognition > 95) console.warn('⚠️  cognition coverage off — tune dictionary');
  if (pctBody      < 5 || pctBody      > 80) console.warn('⚠️  body coverage off — tune dictionary');

  console.log('\n✅ Done.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
