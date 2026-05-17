import { Module } from '@nestjs/common';
import { SiteContentController } from './site-content.controller';
import { SiteContentService } from './site-content.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [PrismaModule, FilesModule],
  controllers: [SiteContentController],
  providers: [SiteContentService],
})
export class SiteContentModule {}
