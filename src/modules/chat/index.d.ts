interface GroupMessageDTO {
  _id: number;
  userId: string;
  groupId: string;
  content: string;
  messageType: string;
  time: number;
  width?: number;
  height?: number;
  fileName?: string;
  size?: number;
}

interface GroupDTO {
  groupId: string;
  userId: string;
  groupName: string;
  notice: string;
  messages?: GroupMessageDTO[];
  createTime: number;
}
