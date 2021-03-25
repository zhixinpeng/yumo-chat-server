import { AuthService } from './auth.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../user/user.entity';
import { jwtConstants } from './constants';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '3d' },
    }),
    PassportModule,
  ],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
