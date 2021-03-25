import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RCODE } from 'src/common/constant/rcode';
import { encryptPassword } from 'src/utils/cryptogram';
import { Repository, getRepository } from 'typeorm';
import { User } from '../user/user.entity';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from './constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  // 用户验证
  async validateUser(userName: string, password: string): Promise<any> {
    const user = await getRepository(User)
      .createQueryBuilder('user')
      .select('user.userName')
      .addSelect('user.password')
      .addSelect('user.salt')
      .where('user.userName = :userName', { userName })
      .getOne();

    if (user) {
      const hashedPassword = user.password;
      const salt = user.salt;
      const hashPassword = encryptPassword(password, salt);
      if (hashPassword === hashedPassword) {
        return {
          code: RCODE.OK,
          user: await this.userRepository.findOne({ userName }),
        };
      } else {
        return {
          codde: RCODE.FAIL,
        };
      }
    }

    return {
      code: RCODE.FAIL,
    };
  }

  // jwt 验证
  async certificate(user: User) {
    const payload = {
      userName: user.userName,
      userId: user.userId,
      createTime: user.createTime,
      role: user.role,
    };

    try {
      const token = this.jwtService.sign(payload);
      return {
        code: RCODE.OK,
        msg: '登录成功',
        data: {
          token,
          user,
        },
      };
    } catch (error) {
      return {
        code: RCODE.FAIL,
        msg: '账号或者密码不正确',
      };
    }
  }

  // jwt 解析
  async verifyToken(token: string) {
    if (!token) return null;
    const user = this.jwtService.verify(token, {
      secret: jwtConstants.secret,
    }) as User;
    return user;
  }
}
