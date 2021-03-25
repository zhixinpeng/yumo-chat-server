import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthService } from 'src/modules/auth/auth.service';

@Injectable()
export class WsGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let client: Socket;
    try {
      client = context.switchToWs().getClient<Socket>();
      const token = client.handshake.query.token;
      const user = this.authService.verifyToken(token);
      return Boolean(user);
    } catch (error) {
      client.emit('unauthorized', '用户信息校验失败，请重新登录！');
      client.disconnect();
      throw new WsException(error.message);
    }
  }
}
