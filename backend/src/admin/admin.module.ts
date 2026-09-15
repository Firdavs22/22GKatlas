import { Module } from '@nestjs/common';
import { AdmissionsModule } from '../admissions/admissions.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, AdmissionsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
