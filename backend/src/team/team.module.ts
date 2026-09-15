import { Module } from '@nestjs/common';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { ClockService } from './clock.service';
@Module({ controllers: [TeamController], providers: [TeamService, ClockService] })
export class TeamModule {}
