import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { ExportService } from './export.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [PrismaModule, AuthModule, FilesModule],
  controllers: [MeController],
  providers: [MeService, ExportService],
})
export class MeModule {}
