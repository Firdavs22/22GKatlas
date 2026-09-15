import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FileAccessService } from './file-access.service';

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [FilesService, FileAccessService],
  controllers: [FilesController],
  exports: [FilesService, FileAccessService],
})
export class FilesModule {}
