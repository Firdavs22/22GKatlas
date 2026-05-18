import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { ChildrenModule } from './children/children.module';
import { FeedModule } from './feed/feed.module';
import { ChatsModule } from './chats/chats.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GroupsModule } from './groups/groups.module';
import { ScheduleModule } from './schedule/schedule.module';
import { FilesModule } from './files/files.module';
import { ActivitiesModule } from './activities/activities.module';
import { MailModule } from './mail/mail.module';
import { AiModule } from './ai/ai.module';
import { KbModule } from './kb/kb.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { SiteContentModule } from './site-content/site-content.module';
import { MeModule } from './me/me.module';
import { HealthModule } from './health/health.module';
import { AuditModule } from './audit/audit.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './audit/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    CommonModule,
    MailModule,
    AuthModule,
    AdminModule,
    ChildrenModule,
    FeedModule,
    ChatsModule,
    NotificationsModule,
    GroupsModule,
    ScheduleModule,
    FilesModule,
    ActivitiesModule,
    AiModule,
    KbModule,
    AppointmentsModule,
    SiteContentModule,
    MeModule,
    HealthModule,
    AuditModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
