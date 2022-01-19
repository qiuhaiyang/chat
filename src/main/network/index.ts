import Tcp from './tcp/tcp';
import Udp from './udp/udp';
interface option {
    tcp: {
        port: number,
        host: string,
        connectionListener?: () => void
    },
    udp: {
        serverAddress: string,
        serverPort: number,
        savePath: string
    }
}

export default class Network {
    private tcp: Tcp | null;
    private udp: Udp | null;
    private option: option;
    constructor(option: option) {
        this.option = option;
        this.tcp = null;
        this.udp = null;
    }

    public createTcpClient(DHkey:{ pbkey: any; p: any; q: any; } | null) {
        const { port, host, connectionListener } = this.option.tcp;
        this.tcp = new Tcp(port, host, connectionListener);
        this.tcp.send(JSON.stringify({type:'D-Htrans', data: DHkey}));
    }

    public createUdp() {
        const { serverAddress, serverPort, savePath } = this.option.udp;
        this.udp = new Udp(serverAddress, serverPort, savePath);
    }

    public udpSend(type: string, content: string, from: string, port: number, address: string, hash?: string, nick?:string) {
        this.udp?.send(type, content, from, port, address, hash, nick);
    }

    public tcpClose() {
        if(this.tcp) {
            this.tcp.close();
            this.tcp = null;
        }
    }

    public tcpSend(msg: string) {
        if(this.tcp) {
            return this.tcp.send(msg);
        } else {
            throw new Error('the tcp connect is break');
        }
    }
    // tcp on 监听事件
    public ton(event: string, listeners: any) {
        this.tcp?.on(event, listeners);
    }

    public uon(event: string, listeners: any) {
        this.udp?.uon(event, listeners);
    }

    public setSavePath(path: string) {
        this.option.udp.savePath = path;
    }

    public sendRandom(random: string) {
        this.udp?.sendToServer(random);
    }
}