import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RCODE } from 'src/common/constant/rcode';
import { encryptPassword, makeSalt } from 'src/utils/cryptogram';
import { Repository, getRepository } from 'typeorm';
import { User, UserMap } from './user.entity';
import { AuthService } from '../auth/auth.service';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { GroupMap } from '../group/group.entity';
import { DEFAULT_GROUP_ID, DEFAULT_ROBOT_ID } from 'src/common/constant/chat';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserMap)
    private readonly userMapRepository: Repository<UserMap>,
    @InjectRepository(GroupMap)
    private readonly groupMapRepository: Repository<GroupMap>,
    private readonly authService: AuthService,
  ) {}

  async register(user: User): Promise<any> {
    const isHave = await this.userRepository.find({ userName: user.userName });
    if (isHave.length) {
      return { code: RCODE.FAIL, msg: '用户已存在' };
    }
    user.avatar = `/avatar/avatar${Math.round(Math.random() * 19 + 1)}.png`;
    user.role = 'user';
    user.userId = user.userId;

    const salt = makeSalt();
    user.salt = salt;
    user.password = encryptPassword(user.password, salt);

    // 注册用户信息
    const newUser = await this.userRepository.save(user);

    // 加入默认群组
    await this.groupMapRepository.save({
      userId: newUser.userId,
      groupId: DEFAULT_GROUP_ID,
    });

    // 加机器人为好友
    await this.userMapRepository.save({
      userId: newUser.userId,
      friendId: DEFAULT_ROBOT_ID,
    });

    return {
      code: RCODE.OK,
      msg: '注册成功',
    };
  }

  async login(user: User): Promise<any> {
    const authResult = await this.authService.validateUser(
      user.userName,
      user.password,
    );
    switch (authResult.code) {
      case RCODE.OK:
        return this.authService.certificate(authResult.user);

      case RCODE.FAIL:
        return {
          code: RCODE.FAIL,
          msg: '账号或者密码不正确',
        };

      default:
        return {
          code: RCODE.FAIL,
          msg: '查无此人',
        };
    }
  }

  async updateUserName(body: any, userId: string): Promise<any> {
    const { userName } = body;
    try {
      const user = await this.userRepository.findOne({ userId });
      if (user.userName === userName) {
        return { code: RCODE.FAIL, msg: '用户名已存在' };
      }
      user.userName = userName;
      await this.userRepository.update(userId, user);
      return { code: RCODE.OK, msg: '更新用户名成功', data: user };
    } catch (error) {
      return { code: RCODE.FAIL, msg: '更新用户名失败' };
    }
  }

  async updatePassword(body: any, userId: string): Promise<any> {
    const { oldPassword, newPassword } = body;
    try {
      const user = await getRepository(User)
        .createQueryBuilder('user')
        .addSelect('user.password')
        .addSelect('user.salt')
        .where('user.userId = :userId', { userId })
        .getOne();
      const hashedPassword = user.password;
      const salt = user.salt;
      const hashPassword = encryptPassword(oldPassword, salt);
      if (hashPassword === hashedPassword) {
        user.password = encryptPassword(newPassword, salt);
        await this.userRepository.save(user);
        return {
          code: RCODE.OK,
          msg: '密码更新成功',
        };
      } else {
        return {
          code: RCODE.FAIL,
          msg: '原密码错误',
        };
      }
    } catch (error) {
      return {
        code: RCODE.FAIL,
        msg: '更新用户密码失败',
      };
    }
  }

  async updateAvatar(file: any, userId: string): Promise<any> {
    try {
      const user = await this.userRepository.findOne({ userId });
      const random = Date.now() + '&';
      const stream = createWriteStream(
        join('public/avatar', random + file.originalname),
      );
      stream.write(file.buffer);
      user.avatar = `/avatar/${random}${file.originalname}`;
      await this.userRepository.save(user);
      return {
        code: RCODE.OK,
        msg: '修改头像成功',
        data: user,
      };
    } catch (error) {
      return {
        code: RCODE.FAIL,
        msg: '修改头像失败',
      };
    }
  }
}
