import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  // 注册
  @Post('/register')
  async register(@Body() body) {
    return this.userService.register(body);
  }

  // 登录
  @Post('/login')
  async login(@Body() body) {
    return this.userService.login(body);
  }

  // 更新用户名
  @UseGuards(AuthGuard('jwt'))
  @Post('/updateUserName')
  async updateUserName(@Body() body, @Req() req) {
    return this.userService.updateUserName(body, req.user.userId);
  }

  // 更新密码
  @UseGuards(AuthGuard('jwt'))
  @Post('/updatePassword')
  async updatePassword(@Body() body, @Req() req) {
    return this.userService.updatePassword(body, req.user.userId);
  }

  // 更新头像
  @UseGuards(AuthGuard('jwt'))
  @Post('/updateAvatar')
  @UseInterceptors(FileInterceptor('file'))
  async updateAvatar(@UploadedFile() file, @Req() req) {
    return this.userService.updateAvatar(file, req.user.userId);
  }
}
