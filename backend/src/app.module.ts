import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { ChildrenModule } from './children/children.module';
import { FeedModule } from './feed/feed.module';
import { ChatsModule } from './chats/chats.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GroupsModule } from './groups/groups.module';
import { ScheduleModule } from './schedule/schedule.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { FilesModule } from './files/files.module';
import { ActivitiesModule } from './activities/activities.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AdminModule,
    ChildrenModule,
    FeedModule,
    ChatsModule,
    NotificationsModule,
    GroupsModule,
    ScheduleModule,
    PortfolioModule,
    FilesModule,
    ActivitiesModule,
  ],
})
export class AppModule {}
