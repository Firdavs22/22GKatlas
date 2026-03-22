import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PortfolioService } from './portfolio.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('children/:childId/portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private portfolioService: PortfolioService) {}

  @Post()
  create(@Param('childId') childId: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.portfolioService.create(childId, dto, user.id);
  }
}
