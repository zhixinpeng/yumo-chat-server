import { Module } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Group, GroupMap, GroupMessage } from '../group/group.entity';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from '../auth/auth.module';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import {
  DEFAULT_GROUP,
  DEFAULT_GROUP_ID,
  DEFAULT_ROBOT,
  DEFAULT_ROBOT_ID,
} from 'src/common/constant/chat';
import { GroupModule } from '../group/group.module';
import { User } from '../user/user.entity';
import { encryptPassword, makeSalt } from 'src/utils/cryptogram';

@Module({
  imports: [
    AuthModule,
    GroupModule,
    TypeOrmModule.forFeature([User, Group, GroupMap, GroupMessage]),
  ],
  controllers: [],
  providers: [ChatGateway],
})
export class ChatModule {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupMap)
    private readonly groupMapRepository: Repository<GroupMap>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    // 注册默认群组
    const defaultGroup = await this.groupRepository.findOne({
      groupId: DEFAULT_GROUP_ID,
    });
    if (!defaultGroup) {
      // 创建默认群组
      await this.groupRepository.save({
        groupId: DEFAULT_GROUP_ID,
        groupName: DEFAULT_GROUP,
        userId: DEFAULT_ROBOT_ID,
      });
      // 机器人加入默认群组
      await this.groupMapRepository.save({
        userId: DEFAULT_ROBOT_ID,
        groupId: DEFAULT_GROUP_ID,
      });
    }

    // 注册机器人用户
    const defaultRobot = await this.userRepository.findOne({
      userId: DEFAULT_ROBOT_ID,
    });
    if (!defaultRobot) {
      const salt = makeSalt();
      const password = encryptPassword(DEFAULT_ROBOT, salt);
      await this.userRepository.save({
        userId: DEFAULT_ROBOT_ID,
        userName: DEFAULT_ROBOT,
        avatar: '/avatar/robot.png',
        role: 'robot',
        salt,
        password,
      });
    }
  }
}
