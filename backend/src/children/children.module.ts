import { Module } from '@nestjs/common';
import { ChildrenController } from './children.controller';
import { ChildrenService } from './children.service';
import { ReportService } from './report.service';

@Module({
  controllers: [ChildrenController],
  providers: [ChildrenService, ReportService],
  exports: [ChildrenService],
})
export class ChildrenModule {}
