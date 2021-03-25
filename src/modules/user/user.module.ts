import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User, UserMap } from './user.entity';
import { AuthModule } from '../auth/auth.module';
import { GroupMap } from '../group/group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserMap, GroupMap]), AuthModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
