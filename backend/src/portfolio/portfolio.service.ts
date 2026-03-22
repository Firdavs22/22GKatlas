import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortfolioService {
  constructor(private prisma: PrismaService) {}

  create(childId: string, dto: any, authorId: string) {
    return this.prisma.portfolioItem.create({ data: { ...dto, childId, authorId } });
  }
}
