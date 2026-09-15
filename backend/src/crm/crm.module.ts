import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Module,
  Param,
  Post,
  Put,
  Query,
  UnauthorizedException,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Feature, FeatureGuard } from '../features/features.module';
import { AdmissionsModule } from '../admissions/admissions.module';
import type { Actor } from '../team/team.service';
import { CrmService } from './crm.service';
import {
  ActivityDto,
  EnrollDto,
  LeadDto,
  LeadQuery,
  MoveDto,
  StageDto,
  StageOrderDto,
} from './crm.dto';
@Controller('crm')
@Feature('crm')
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
@Roles('admin', 'superadmin')
class CrmController {
  constructor(private crm: CrmService) {}
  @Get('stages') stages() {
    return this.crm.stages();
  }
  @Post('stages') @Roles('superadmin') createStage(@Body() dto: StageDto) {
    return this.crm.createStage(dto);
  }
  @Put('stages/order') @Roles('superadmin') order(@Body() dto: StageOrderDto) {
    return this.crm.orderStages(dto.ids);
  }
  @Put('stages/:id') @Roles('superadmin') rename(
    @Param('id') id: string,
    @Body() dto: StageDto,
  ) {
    return this.crm.renameStage(id, dto);
  }
  @Delete('stages/:id') @Roles('superadmin') removeStage(
    @Param('id') id: string,
  ) {
    return this.crm.removeStage(id);
  }
  @Get('lookups') lookups() {
    return this.crm.lookups();
  }
  @Get('leads') list(@Query() query: LeadQuery) {
    return this.crm.list(query);
  }
  @Get('leads/:id') detail(@Param('id') id: string) {
    return this.crm.detail(id);
  }
  @Post('leads') create(@Body() dto: LeadDto, @CurrentUser() user: Actor) {
    return this.crm.create(dto, user);
  }
  @Put('leads/:id') update(
    @Param('id') id: string,
    @Body() dto: LeadDto,
    @CurrentUser() user: Actor,
  ) {
    return this.crm.update(id, dto, user);
  }
  @Post('leads/:id/move') move(
    @Param('id') id: string,
    @Body() dto: MoveDto,
    @CurrentUser() user: Actor,
  ) {
    return this.crm.move(id, dto.stageId, dto.revision, user);
  }
  @Post('leads/:id/activity') activity(
    @Param('id') id: string,
    @Body() dto: ActivityDto,
    @CurrentUser() user: Actor,
  ) {
    return this.crm.activity(id, dto, user);
  }
  @Post('leads/:id/enroll') enroll(
    @Param('id') id: string,
    @Body() dto: EnrollDto,
    @CurrentUser() user: Actor,
  ) {
    return this.crm.enroll(id, dto, user);
  }
}
@Controller('crm/intake')
@Feature('crm')
@UseGuards(FeatureGuard)
class IntakeController {
  constructor(private crm: CrmService) {}
  @Post()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  intake(
    @Headers('authorization') authorization: string,
    @Headers('x-request-id') requestId: string,
    @Body() dto: LeadDto,
  ) {
    const expected = process.env.CRM_WEBHOOK_TOKEN;
    const supplied = /^Bearer (\S+)$/i.exec(authorization || '')?.[1] || '';
    const digest = (s: string) => createHash('sha256').update(s).digest();
    if (
      !expected ||
      expected.length < 32 ||
      !timingSafeEqual(digest(expected), digest(supplied))
    )
      throw new UnauthorizedException();
    if (!/^[a-zA-Z0-9_-]{1,120}$/.test(requestId || ''))
      throw new BadRequestException('Нужен уникальный X-Request-Id');
    return this.crm.create({ ...dto, ownerId: undefined }, null, requestId);
  }
}
@Module({
  imports: [AdmissionsModule],
  controllers: [CrmController, IntakeController],
  providers: [CrmService],
})
export class CrmModule {}
