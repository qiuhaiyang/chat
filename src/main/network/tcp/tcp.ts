import net, { Socket } from 'net';

export default class Tcp {
    private socket: Socket | null;
    constructor(port: number, host: string, connectionListener?: () => void) {
        this.socket = new net.Socket();
        this.socket.connect(port, host, connectionListener);
    }

    public close() {
        this.socket?.destroy();
        this.socket = null;
    }

    public send(msg: string) {
        this.socket?.write(msg);
    }

    public on(event: string, listeners: any) {
        this.socket?.on(event, listeners);
    }
}