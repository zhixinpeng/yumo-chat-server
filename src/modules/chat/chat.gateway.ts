import { UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DEFAULT_GROUP_ID } from 'src/common/constant/chat';
import { RCODE } from 'src/common/constant/rcode';
import { WsGuard } from 'src/guard/ws.guard';
import { getRepository, Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { Group, GroupMap, GroupMessage } from '../group/group.entity';
import { User } from '../user/user.entity';

@WebSocketGateway()
export class ChatGateway {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupMap)
    private readonly groupMapRepository: Repository<GroupMap>,
    @InjectRepository(GroupMessage)
    private readonly groupMessageRepository: Repository<GroupMessage>,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket): Promise<any> {
    const token = client.handshake.query.token;
    const user = await this.authService.verifyToken(token);

    console.log('用户上线');
    // 连接加入到默认聊天室
    client.join(DEFAULT_GROUP_ID);
    // 上线广播
    client.broadcast.emit('userOnline', {
      code: RCODE.OK,
      msg: 'userOnline',
      data: user,
    });
    // 用户单独消息房间
    if (user.userId) {
      client.join(user.userId);
    }
    return '连接成功';
  }

  async handleDisconnect(client: Socket): Promise<any> {
    const token = client.handshake.query.token;
    const user = await this.authService.verifyToken(token);

    console.log('用户下线');
    // 下线广播
    client.broadcast.emit('userOffline', {
      code: RCODE.OK,
      msg: 'userOffline',
      data: user,
    });
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('chatData')
  async getChatData(client: Socket): Promise<any> {
    const token = client.handshake.query.token;
    const user = await this.authService.verifyToken(token);

    const groups = await getRepository(Group)
      .createQueryBuilder('group')
      .innerJoin('group_map', 'group_map', 'group_map.groupId = group.groupId')
      .select('group.groupName', 'groupName')
      .addSelect('group.groupId', 'groupId')
      .addSelect('group.notice', 'notice')
      .addSelect('group.userId', 'userId')
      .addSelect('group_map.createTime', 'createTime')
      .where('group_map.userId = :id', { id: user.userId })
      .getRawMany();

    const friends = await getRepository(User)
      .createQueryBuilder('user')
      .select('user.userId', 'userId')
      .addSelect('user.userName', 'userName')
      .addSelect('user.avatar', 'avatar')
      .addSelect('user.role', 'role')
      .where((qb) => {
        const subQuery = qb
          .subQuery()
          .select('s.userId')
          .innerJoin('user_map', 'p', 'p.friendId = s.userId')
          .from('user', 's')
          .where('p.userId = :userId', { userId: user.userId })
          .getQuery();
        return 'user.userId IN ' + subQuery;
      })
      .getRawMany();

    this.server.to(user.userId).emit('chatData', {
      code: RCODE.OK,
      msg: '获取聊天数据成功',
      data: {
        groups,
        friends,
      },
    });
  }

  // 发送群消息
  @UseGuards(WsGuard)
  @SubscribeMessage('groupMessage')
  async sendGroupMessage(@MessageBody() data: GroupMessageDTO): Promise<any> {
    const user = await this.userRepository.findOne({ userId: data.userId });
    if (user) {
      const groupMap = await this.groupMapRepository.findOne({
        userId: data.userId,
        groupId: data.groupId,
      });
      if (!groupMap || !data.groupId) {
        return this.server.to(data.userId).emit('groupMessage', {
          code: RCODE.FAIL,
          msg: '群消息发送错误',
        });
      }
      data.time = new Date().valueOf();
      await this.groupMessageRepository.save(data);
      this.server.to(data.groupId).emit('groupMessage', {
        code: RCODE.OK,
        msg: '群消息发送成功',
        data: {
          ...data,
          userName: user.userName,
        },
      });
    } else {
      this.server
        .to(data.userId)
        .emit('groupMessage', { code: RCODE.FAIL, msg: '你没资格发消息' });
    }
  }

  // 创建群组
  @UseGuards(WsGuard)
  @SubscribeMessage('addGroup')
  async addGroup(
    @MessageBody() data: GroupDTO,
    @ConnectedSocket() client: Socket,
  ) {
    const user = await this.userRepository.findOne({ userId: data.userId });
    if (user) {
      const userGroup = await this.groupRepository.findOne({
        groupName: data.groupName,
      });
      if (userGroup) {
        return this.server.to(data.userId).emit('addGroup', {
          code: RCODE.FAIL,
          msg: '该群名字已存在',
        });
      }
      data = await this.groupRepository.save(data);
      client.join(data.groupId);
      const group = await this.groupMapRepository.save(data);
      this.server.to(group.groupId).emit('addGroup', {
        code: RCODE.OK,
        msg: '成功创建群组',
        data: group,
      });
    } else {
      this.server
        .to(data.userId)
        .emit('addGroup', { code: RCODE.FAIL, msg: '你没资格创建群' });
    }
  }
}
