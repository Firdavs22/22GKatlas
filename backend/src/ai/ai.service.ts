import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GenerateObservationInput {
  /** Краткий заголовок: "Переливание воды", "Розовая башня — повторение" */
  title: string;
  /** Опциональный навык: { id, title } */
  skill?: { id: string; title: string };
  /** Опциональная область (Практическая жизнь, Сенсорика, ...) */
  area?: { id: string; title: string };
  /** Возраст ребёнка в годах — для адаптации лексики */
  childAgeYears?: number;
  /** Любая свободная заметка от педагога */
  hint?: string;
}

export interface GenerateObservationOutput {
  /** Сгенерированный текст для подписи к посту/наблюдению */
  text: string;
  /** Имя провайдера, который ответил ('stub', 'gemma', 'claude', 'openai' …) */
  provider: string;
}

interface AiProvider {
  readonly name: string;
  generateObservation(input: GenerateObservationInput): Promise<string>;
}

/**
 * Сервис генерации описаний наблюдений.
 *
 * Плагинная архитектура: реальный AI подключается через переменную окружения AI_PROVIDER.
 * Поддерживаемые значения:
 *   - не задан / 'stub' — детерминированный шаблон без AI (работает всегда)
 *   - 'gemma'           — OpenAI-совместимый эндпоинт (vLLM/llama.cpp/Ollama локально)
 *                         Нужны: AI_API_URL, опционально AI_API_KEY, AI_MODEL
 *   - 'openai'          — OpenAI API (TODO: добавить когда понадобится)
 *   - 'claude'          — Anthropic API (TODO: добавить когда понадобится)
 *
 * Без AI_PROVIDER эндпоинт `/ai/observation` всё равно работает — возвращает stub-текст,
 * чтобы UI не блокировался.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly provider: AiProvider;

  constructor(private config: ConfigService) {
    const providerName = (config.get<string>('AI_PROVIDER') || 'stub').toLowerCase();

    switch (providerName) {
      case 'gemma':
      case 'openai-compat': {
        const url = config.get<string>('AI_API_URL');
        if (!url) {
          this.logger.warn('AI_PROVIDER=gemma, но AI_API_URL не задан. Откатываемся на stub.');
          this.provider = new StubProvider();
        } else {
          this.provider = new OpenAiCompatProvider({
            url,
            apiKey: config.get<string>('AI_API_KEY'),
            model: config.get<string>('AI_MODEL') || 'gemma',
          });
        }
        break;
      }
      case 'stub':
      default:
        this.provider = new StubProvider();
        break;
    }

    this.logger.log(`AI provider: ${this.provider.name}`);
  }

  async generateObservation(input: GenerateObservationInput): Promise<GenerateObservationOutput> {
    if (!input?.title?.trim()) {
      throw new BadRequestException('Укажите заголовок наблюдения');
    }
    try {
      const text = await this.provider.generateObservation(input);
      return { text, provider: this.provider.name };
    } catch (err) {
      this.logger.warn(`AI provider ${this.provider.name} failed: ${(err as Error).message}`);
      // Fallback to stub on provider error — UX gracefully degrades
      const text = await new StubProvider().generateObservation(input);
      return { text, provider: 'stub-fallback' };
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Provider: stub (без AI)
// ──────────────────────────────────────────────────────────────────────────

class StubProvider implements AiProvider {
  readonly name = 'stub';

  async generateObservation(input: GenerateObservationInput): Promise<string> {
    const skill = input.skill?.title || input.title;
    const area = input.area?.title;

    // Базовый шаблон. Это не AI — это безопасный fallback.
    const lines: string[] = [
      `Упражнение «${skill}» помогает развивать концентрацию, координацию и самостоятельность.`,
    ];

    if (area) {
      const areaHints: Record<string, string> = {
        'Практическая жизнь': 'Работа с реальными материалами развивает мелкую моторику и порядок действий.',
        'Сенсорика': 'Через тактильное взаимодействие ребёнок учится различать качества предметов: размер, форма, текстура.',
        'Математика': 'Конкретные материалы помогают понять абстрактные математические идеи.',
        'Язык': 'Упражнение обогащает словарь и подготавливает руку к письму.',
        'Космос': 'Расширяет представление о мире и своём месте в нём.',
      };
      const hint = areaHints[area];
      if (hint) lines.push(hint);
    }

    if (input.hint?.trim()) {
      lines.push(input.hint.trim());
    }

    return lines.join(' ');
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Provider: OpenAI-compatible HTTP endpoint (Gemma via vLLM/Ollama/etc.)
// ──────────────────────────────────────────────────────────────────────────

class OpenAiCompatProvider implements AiProvider {
  readonly name: string;
  private readonly url: string;
  private readonly apiKey?: string;
  private readonly model: string;

  constructor(opts: { url: string; apiKey?: string; model: string }) {
    this.url = opts.url.replace(/\/$/, '');
    this.apiKey = opts.apiKey;
    this.model = opts.model;
    this.name = `openai-compat:${opts.model}`;
  }

  async generateObservation(input: GenerateObservationInput): Promise<string> {
    const system =
      'Ты — педагог детского сада. Пиши коротко и по делу: 1–2 предложения о том, ' +
      'на что направлено упражнение и какие навыки развивает. Без воды и канцеляризмов. ' +
      'Тон спокойный, человеческий, для родителя.';

    const userParts: string[] = [`Наблюдение: ${input.title}.`];
    if (input.skill?.title) userParts.push(`Навык: ${input.skill.title}.`);
    if (input.area?.title) userParts.push(`Область: ${input.area.title}.`);
    if (input.childAgeYears) userParts.push(`Возраст ребёнка: ${input.childAgeYears} лет.`);
    if (input.hint?.trim()) userParts.push(`Контекст от педагога: ${input.hint.trim()}.`);
    userParts.push('Напиши краткое описание для родителя.');

    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userParts.join(' ') },
      ],
      max_tokens: 200,
      temperature: 0.7,
    };

    const res = await fetch(`${this.url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`AI HTTP ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('AI: empty response');
    return text;
  }
}
