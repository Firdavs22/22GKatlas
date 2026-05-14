import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import type { GenerateObservationInput } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private ai: AiService) {}

  /** Генерация описания наблюдения. Только для педагогов/специалистов. */
  @Post('observation')
  @Throttle({ default: { limit: 20, ttl: 60_000 } }) // 20 запросов в минуту на пользователя
  generateObservation(
    @Body() body: GenerateObservationInput,
    @CurrentUser() user: { role: string },
  ) {
    // Защита от спама: только сотрудники могут генерировать
    if (!['teacher', 'psychologist', 'pediatrician', 'admin'].includes(user.role)) {
      return { text: '', provider: 'forbidden' };
    }
    return this.ai.generateObservation(body);
  }
}
