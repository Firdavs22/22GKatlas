import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { GenerateObservationDto } from './ai.dto';
import { AccessControlService } from '../common/access-control.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private ai: AiService,
    private access: AccessControlService,
  ) {}

  /** Генерация описания наблюдения. Только для педагогов/специалистов. */
  @Post('observation')
  @Throttle({ default: { limit: 20, ttl: 60_000 } }) // 20 запросов в минуту на пользователя
  async generateObservation(
    @Body() body: GenerateObservationDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    // Защита от спама: только сотрудники могут генерировать
    if (
      ![
        'teacher',
        'psychologist',
        'pediatrician',
        'admin',
        'superadmin',
        'director',
      ].includes(user.role)
    ) {
      throw new ForbiddenException();
    }
    if (body.childId) await this.access.checkChildAccess(body.childId, user);
    return this.ai.generateObservation(body);
  }
}
