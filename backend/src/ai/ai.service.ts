import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { GenerateObservationDto } from './ai.dto';

// Only server-owned text is allowed across the external provider boundary.
const TOPICS: Record<string, string> = {
  general: 'концентрация, самостоятельность и координация',
  practical: 'практическая жизнь и самостоятельность',
  sensory: 'сенсорное развитие и сравнение свойств предметов',
  math: 'математические представления и счет',
  language: 'развитие речи и подготовка к письму',
  world: 'знакомство с окружающим миром',
  social: 'общение и распознавание эмоций',
  movement: 'движение, равновесие и мелкая моторика',
};
const LEGACY_AREAS: Record<string, string> = {
  'Практическая жизнь': 'practical',
  Сенсорика: 'sensory',
  Математика: 'math',
  Язык: 'language',
  Космос: 'world',
};
type SafeInput = { topic: string; requestReference: string };

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  constructor(private config: ConfigService) {}

  async generateObservation(input: GenerateObservationDto) {
    const key =
      input.topic && Object.hasOwn(TOPICS, input.topic)
        ? input.topic
        : input.area?.title && Object.hasOwn(LEGACY_AREAS, input.area.title)
          ? LEGACY_AREAS[input.area.title]
          : 'general';
    const safe: SafeInput = {
      topic: TOPICS[key],
      requestReference: randomUUID(),
    };
    const provider = (
      this.config.get<string>('AI_PROVIDER') || 'stub'
    ).toLowerCase();
    if (
      !['gemma', 'openai-compat'].includes(provider) ||
      !this.config.get<string>('AI_API_URL')
    ) {
      return {
        text: this.template(safe),
        provider: 'stub',
        privacy: 'topic-only',
      };
    }
    try {
      return {
        text: await this.external(safe),
        provider: 'openai-compat',
        privacy: 'topic-only',
      };
    } catch {
      // Provider errors may echo prompt/headers. Never include their body or URL in logs.
      this.logger.warn('AI request failed; returning a local template.');
      return {
        text: this.template(safe),
        provider: 'stub-fallback',
        privacy: 'topic-only',
      };
    }
  }

  private template(input: SafeInput) {
    return `Направление занятия — ${input.topic}. Работа с материалами помогает тренировать внимание и постепенно осваивать новые действия. Добавьте собственное наблюдение о том, как проходило занятие.`;
  }

  private async external(input: SafeInput): Promise<string> {
    const url = this.config.get<string>('AI_API_URL')!.replace(/\/$/, '');
    const apiKey = this.config.get<string>('AI_API_KEY');
    const response = await fetch(`${url}/chat/completions`, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(20000),
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.config.get<string>('AI_MODEL') || 'gemma',
        messages: [
          {
            role: 'system',
            content:
              'Составь короткую заготовку описания занятия в детском саду для родителя. Объясни, какие навыки помогает развивать направление. Не выдумывай факты, успехи, поведение, имена или медицинские сведения о конкретном ребенке. Два предложения. Педагог дополнит заготовку своими наблюдениями.',
          },
          {
            role: 'user',
            content: `Код запроса: ${input.requestReference}. Направление: ${input.topic}.`,
          },
        ],
        max_tokens: 250,
        temperature: 0.5,
      }),
    });
    if (!response.ok) throw new Error('AI request rejected');
    const data = (await response.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim() || text.length > 8000)
      throw new Error('Invalid AI response');
    return text.trim();
  }
}
