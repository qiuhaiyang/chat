import dgram, { Socket } from 'dgram';
import EventEmitter from 'events';
import path from 'path';
import fs from 'fs';

export default class Udp {
    // private maxTransport: number;
    // 允许的最大序号
    private maxSerialNumber: number;
    // 每个分包的大小
    private packageSize: number;
    private socket: Socket;
    private event: EventEmitter;
    // 接收的数据处理
    private acceptting: any;
    private serverAddress: string;
    private serverPort: number;
    // 文件默认保存位置
    private pathDir: string;
    // 等待确认
    private waittingACK: any;
    // 等待发送
    private waittingSend: any;
    constructor(serverAddress: string, serverPort: number, pathDir: string) {
        // this.maxTransport = 5;
        this.maxSerialNumber = Math.pow(2, 32) - 1;
        this.packageSize = 60 * 1024;
        this.socket = dgram.createSocket('udp4');
        this.event = new EventEmitter();
        this.acceptting = {};
        this.waittingACK = {};
        this.waittingSend = {};
        this.serverAddress = serverAddress;
        this.serverPort = serverPort;
        this.pathDir = pathDir;
        this.socket.on('message', this.udpSocket);
    }

    private udpSocket = (msg: Buffer, rinfo: dgram.RemoteInfo) => {
        console.log('udp--------', msg, rinfo)
        // 小于5字节表示不是该协议包，丢弃
        if(rinfo.size < 6) {
            return;
        }
        if(rinfo.address == this.serverAddress && rinfo.port == this.serverPort) {
            // 来自服务器的包
            console.log(rinfo);
            return;
        }
        const headBuf = msg.slice(0, 6);
        const type = headBuf.slice(4, 5);
        const serialNumber = this.hexBufferToNum(headBuf.slice(0, 4), 4);
        // 每个发送信息的唯一key，用于确认多条信息接收时出现错乱
        const random = this.hexBufferToNum(headBuf.slice(5, 6), 1);
        // 说明有值, 空包只发送6字节数据
        const key = random.toString() + rinfo.address + rinfo.port;
        if(rinfo.size > 6) {
            // 表示第一个包 描述包
            if(serialNumber === 1) {
                // 描述对象
                const description = msg.slice(6, rinfo.size).toString();
                const obj = JSON.parse(description);
                if(!this.acceptting[key]) {
                    if(type[0] === 0x01) {
                        // 消息   接收完成之后返还出去
                        const { length, hash, from } = obj;
                        this.acceptting[key] = {
                            current: serialNumber,
                            type: 'message',
                            hash,
                            length,
                            from,
                            // 用于判断中间差了哪些值
                            accept: {} as any,
                            data: Buffer.alloc(0)
                        }
                    } else if(type[0] === 0x02){
                        const { filename, fileExt, from, time, nick } = obj;
                        const writeStream = fs.createWriteStream(path.resolve(this.pathDir, filename + fileExt));
                        this.acceptting[key] = {
                            // 文件， 保存在默认保存的文件夹下
                            current: 1,
                            accept: {} as any,
                            type: 'file',
                            from,
                            fileWriter: writeStream,
                            data: path.resolve(this.pathDir, filename + fileExt),
                            // 发送时间
                            time,
                            // 发送方昵称
                            nick,
                        }
                    }
                    // 返回确认包
                    const ackNumBuf = this.bigNumberToFourBuffer(0, 4);
                    // 描述包确认
                    const typeBuf = Buffer.from([0x04]);
                    const randomBuf = this.bigNumberToFourBuffer(random, 1);
                    const sendBuf = Buffer.concat([ackNumBuf, typeBuf, randomBuf]);
                    this.socket.send(sendBuf, 0, sendBuf.length, rinfo.port, rinfo.address);
                }
                //另外一种情况属于错误重传 错误传输，重传的，直接丢包
            } else {
                if(!this.acceptting[key]) return;
                // 后序包
                // message包的后序包
                if(type[0] === 0x01) {
                    let { current, data } = this.acceptting[key];
                    if(current + 1 !== serialNumber) {
                        if(current + 1 !== serialNumber) {
                            // 差哪些包
                            this.acceptting[key].accept[serialNumber] = msg.slice(6, rinfo.size);
                        }
                    } else {
                        let buf = Buffer.concat([data, msg.slice(6, rinfo.size)]);
                        current = serialNumber;
                        // 整合包的序号
                        while(this.acceptting[key].accept[current + 1]) {
                            buf = Buffer.concat([buf, this.acceptting[key].accept[current + 1]]);
                            current ++;
                            delete this.acceptting[key].accept[current];
                        }
                        this.acceptting[key].data = buf;
                        this.acceptting[key].current = current;
                    }
                    if(this.acceptting[key].endNumber && this.acceptting[key].endNumber + 1 ===current) {
                        // 表明当结束包到来时，还有数据包没有到
                        // 发送ack包
                        // 将数据包暴露给上层
                        const { length, hash, from } = this.acceptting[key];
                        this.exportData(data.toString(), {type: 'message', length, hash, from});
                        delete this.acceptting[key];
                        const ackNumBuf = this.bigNumberToFourBuffer(0, 4);
                        // ack
                        const typeBuf = Buffer.from([0x03]);
                        const randomBuf = this.bigNumberToFourBuffer(random, 1);
                        const sendBuf = Buffer.concat([ackNumBuf, typeBuf, randomBuf]);
                        // 发送确认包
                        this.socket.send(sendBuf, 0, sendBuf.length, rinfo.port, rinfo.address);
                    }
                } else if(type[0] === 0x02) {
                    const { fileWriter } = this.acceptting[key];
                    let { current } = this.acceptting[key];
                    if(current + 1 !== serialNumber) {
                        this.acceptting[key].accept[serialNumber] = msg.slice(6, rinfo.size);
                    } else {
                        (fileWriter as fs.WriteStream).write(msg.slice(6, rinfo.size));
                        current = serialNumber;
                        while(this.acceptting[key].accept[current + 1]) {
                            (fileWriter as fs.WriteStream).write(this.acceptting[key].accept[current + 1]);
                            current ++;
                            delete this.acceptting[key].accept[current];
                        }
                        this.acceptting[key].current = current;
                    }

                    if(this.acceptting[key].endNumber && this.acceptting[key].endNumber + 1 ===current) {
                        const { data, from, nick, time } = this.acceptting[key];
                        this.exportData(data, {type: 'file',from, nick, time});
                        delete this.acceptting[key];
                        const ackNumBuf = this.bigNumberToFourBuffer(0, 4);
                        // ack
                        const typeBuf = Buffer.from([0x03]);
                        const randomBuf = this.bigNumberToFourBuffer(random, 1);
                        const sendBuf = Buffer.concat([ackNumBuf, typeBuf, randomBuf]);
                        // 发送确认包
                        this.socket.send(sendBuf, 0, sendBuf.length, rinfo.port, rinfo.address);
                    }
                }
            }
        } else {
            // 对方发送ack包
            if(type[0] === 0x03) {
                // 表明对方接收到了所有数据包
                // 删除我方内存数据
                delete this.waittingACK[random];
                delete this.waittingSend[random];
                return;
            } else if (type[0] === 0x04) {
                // 对方接收到了描述包
                // 发送waittingSend中的数据包
                this.sendPackage(random, rinfo);
                return;
            } else if(type[0] === 0x05) {
                // 重传
                if(!this.acceptting[key]) return;
                const {type} = this.acceptting[key];
                if(type === 'file') {
                    const { data } = this.acceptting[key];
                    fs.unlinkSync(data);
                    const writeStream = fs.createWriteStream(data);
                    this.acceptting[key].fileWriter = writeStream;
                    this.acceptting[key].accept = {};
                    this.acceptting[key].current = 1;
                } else {
                    this.acceptting[key].data = Buffer.alloc(0);
                    this.acceptting[key].current = 1;
                    this.acceptting[key].accept = {};
                }

                // 返回确认包
                const ackNumBuf = this.bigNumberToFourBuffer(0, 4);
                // 重传接收包确认
                const typeBuf = Buffer.from([0x04]);
                const randomBuf = this.bigNumberToFourBuffer(random, 1);
                const sendBuf = Buffer.concat([ackNumBuf, typeBuf, randomBuf]);
                this.socket.send(sendBuf, 0, sendBuf.length, rinfo.port, rinfo.address);
                return;
            }
            const {
                current,
                data,
                length,
                hash,
                from,
                nick,
                time
             } = this.acceptting[key];
            if(current + 1 === serialNumber) {
                if(type[0] === 0x01) {
                    // 消息
                    this.exportData(data.toString(), {type: 'message', length, hash, from});
                } else if (type[0] === 0x02){
                    this.exportData(data, {type: 'file', from, nick, time});
                }
                delete this.acceptting[key];
                const ackNumBuf = this.bigNumberToFourBuffer(0, 4);
                // ack
                const typeBuf = Buffer.from([0x03]);
                const randomBuf = this.bigNumberToFourBuffer(random, 1);
                const sendBuf = Buffer.concat([ackNumBuf, typeBuf, randomBuf]);
                // 发送确认包
                this.socket.send(sendBuf, 0, sendBuf.length, rinfo.port, rinfo.address);
            } else {
                if(type[0] === 0x01) {
                    // 消息
                    this.exportData(data.toString(), {type: 'message', length, hash, from});
                } else if (type[0] === 0x02){
                    this.exportData(data, {type: 'file', from, nick, time});
                }
                this.acceptting[key].endNumber = serialNumber;
            }
        }
    }

    private bigNumberToFourBuffer(bigNum: number, size: number):Buffer {
        let residue = bigNum;
        let arr: number[] = [];
        for(let i = 0;i < size;i ++) {
            let hex = residue % 256;
            residue = Math.floor(residue / 256);
            arr.unshift(hex);
        }
        return Buffer.from(arr);
    }

    private sendPackage(random: number, rinfo: dgram.RemoteInfo) {
        const { type, content } = this.waittingSend[random];
        if(type === 'message') {
            const contentBuf = Buffer.from(content);
            this.message(contentBuf, 2, random, rinfo);
        } else if(type === 'file') {
            this.file(content, 2, random, rinfo);
        }
    }

    private file(filePath: string, num: number, random: number, rinfo: dgram.RemoteInfo) {
        const send = (data: Buffer, order:number) => {
            const numberBuf = this.bigNumberToFourBuffer(order, 4);
            const typeBuf = Buffer.from([0x02]);
            const randomBuf = this.bigNumberToFourBuffer(random, 1);
            if(data.length > this.packageSize) {
                const buf = data.slice(0, this.packageSize);
                const sendBuf = Buffer.concat([numberBuf, typeBuf, randomBuf, buf]);
                this.socket.send(sendBuf, 0, sendBuf.length, rinfo.port, rinfo.address,()=>{
                    setTimeout(() => {
                        send(data.slice(this.packageSize, data.length), order + 1);
                    }, 40);
                });
            } else {
                if(data.length === 0) {
                    const sendBuf = Buffer.concat([numberBuf, typeBuf, randomBuf]);
                    this.socket.send(sendBuf, 0, sendBuf.length, rinfo.port, rinfo.address);
                } else {
                    const sendBuf = Buffer.concat([numberBuf, typeBuf, randomBuf, data]);
                    this.socket.send(sendBuf, 0, sendBuf.length, rinfo.port, rinfo.address, () => {
                        const endNumberBuf = this.bigNumberToFourBuffer(order + 1, 4);
                        const send = Buffer.concat([endNumberBuf, typeBuf, randomBuf]);
                        this.socket.send(send, 0, send.length, rinfo.port, rinfo.address);
                    });
                }
            }
        }
        fs.readFile(filePath, (err, data) => {
            send(data, num);
        });
    }

    private message(data: Buffer, num: number, random: number, rinfo: dgram.RemoteInfo) {
        if(num > this.maxSerialNumber) {
            // 超出最大分包数量
        }
        const numberBuf = this.bigNumberToFourBuffer(num, 4);
        const typeBuf = Buffer.from([0x01]);
        const randomBuf = this.bigNumberToFourBuffer(random, 1);
        if(data.length > this.packageSize) {
            const buf = data.slice(0, this.packageSize);
            const sendBuf = Buffer.concat([numberBuf, typeBuf, randomBuf, buf]);
            this.socket.send(sendBuf, 0, sendBuf.length, rinfo.port, rinfo.address,()=>{
                this.message(data.slice(this.packageSize, data.length), num + 1, random, rinfo);
            });
        } else {
            if(data.length === 0) {
                const sendBuf = Buffer.concat([numberBuf, typeBuf, randomBuf]);
                this.socket.send(sendBuf, 0, sendBuf.length, rinfo.port, rinfo.address);
            } else {
                const sendBuf = Buffer.concat([numberBuf, typeBuf, randomBuf, data]);
                this.socket.send(sendBuf, 0, sendBuf.length, rinfo.port, rinfo.address, () => {
                    const endNumberBuf = this.bigNumberToFourBuffer(num + 1, 4);
                    const send = Buffer.concat([endNumberBuf, typeBuf, randomBuf]);
                    this.socket.send(send, 0, send.length, rinfo.port, rinfo.address);
                });
            }
        }
    }

    private hexBufferToNum(buf: Buffer, size: number): number {
        let num = 0;
        for(let i = 0; i < size; i ++) {
            num = (buf[i] + num * 256);
        }
        return num;
    }
    // 发送消息
    private sendMessage(content: string, from: string, port: number, address: string, hash: string = '') {
        const numberBuf = this.bigNumberToFourBuffer(1, 4);
        const typeBuf = Buffer.from([0x01]);
        const sendObj = {
            length: content.length,
            hash,
            from,
        }
        const descriptionStr = JSON.stringify(sendObj);
        const contentBuf = Buffer.from(descriptionStr);
        // 随机数
        let random = Math.floor(Math.random() * 256);
        while(this.waittingACK[random]) {
            random = Math.floor(Math.random() * 256);
        }
        const randomBuf = this.bigNumberToFourBuffer(random, 1);
        const sendBuf = Buffer.concat([numberBuf, typeBuf, randomBuf, contentBuf]);
        this.waittingACK[random] = true;
        this.waittingSend[random] = {
            type: 'message',
            content
        };
        this.socket.send(sendBuf, 0, sendBuf.length, port, address);
    }

    private sendFile(filePath: string, from: string, nick: string, port: number, address: string) {
        const fileObj = path.parse(filePath);
        const numberBuf = this.bigNumberToFourBuffer(1, 4);
        const typeBuf = Buffer.from([0x02]);
        const sendObj = {
            filename: fileObj.name,
            fileExt: fileObj.ext,
            from,
            time: Date.now(),
            nick
        }
        const descriptionStr = JSON.stringify(sendObj);
        const contentBuf = Buffer.from(descriptionStr);
        let random = Math.floor(Math.random() * 256);
        while(this.waittingACK[random]) {
            random = Math.floor(Math.random() * 256);
        }
        const randomBuf = this.bigNumberToFourBuffer(random, 1);
        const sendBuf = Buffer.concat([numberBuf, typeBuf, randomBuf, contentBuf]);
        this.waittingACK[random] = true;
        this.waittingSend[random] = {
            type: 'file',
            content: filePath
        };
        this.socket.send(sendBuf, 0, sendBuf.length, port, address);
    }

    private exportData(data: any, description: any) {
        // type 为message时 data为发送消息
        // type 为file时 data为文件路径
        this.event.emit('data', data, description);
    }


    public uon(event: string, listener: any) {
        if(event === 'message') {
            this.event.on('data', (data: any, description: any) => {
                listener(data, description);
            })
        } else {
            this.socket.on(event, listener);
        }
    }

    public send(sendType: string, content: string, from: string, port: number, address: string, hash?: string, nick?:string) {
        if(sendType === 'message') {
            this.sendMessage(content, from, port, address, hash);
        } else if(sendType === 'file') {
            this.sendFile(content, from, nick as string,  port, address);
        }
    }

    public sendToServer(msg: string) {
        this.socket.send(msg, this.serverPort, this.serverAddress);
    }
}