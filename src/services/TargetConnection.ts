import net from 'net';

export type TargetConnection = {
  isReady: boolean;
  socket: net.Socket;
  id: number;
};
