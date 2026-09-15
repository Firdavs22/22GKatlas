import {
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Global,
  Injectable,
  Module,
  NotFoundException,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

export type FeatureName = 'team' | 'library' | 'crm';
export const Feature = (name: FeatureName) => SetMetadata('feature', name);
export const enabledFeatures = () =>
  Object.fromEntries(
    ['team', 'library', 'crm'].map((name) => [
      name,
      process.env[name.toUpperCase() + '_ENABLED'] !== 'false',
    ]),
  );
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const name = this.reflector.getAllAndOverride<FeatureName>('feature', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (name && !enabledFeatures()[name])
      throw new NotFoundException('Модуль отключён');
    return true;
  }
}
@Controller('modules')
@UseGuards(JwtAuthGuard)
class FeaturesController {
  @Get() get() {
    return enabledFeatures();
  }
}
@Global()
@Module({
  controllers: [FeaturesController],
  providers: [FeatureGuard],
  exports: [FeatureGuard],
})
export class FeaturesModule {}
