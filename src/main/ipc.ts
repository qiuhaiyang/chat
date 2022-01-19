import { ipcMain, app, BrowserWindow, shell, dialog } from "electron";
import path from 'path';
import fs from 'fs';
import { resolvePath } from './util';
import Network from './network/index';
import Cipher from './cipher/index';
import createWindow from './createWindow';
import DB from './handleDataBase';


export const getAssetPath = (...paths: string[]): string => {
    const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');
    return path.join(RESOURCES_PATH, ...paths);
};

const getInstallPath = (): string => {
    return app.isPackaged
    ? process.resourcesPath
    : path.join(__dirname, '../../');
}

export default class Ipc {
    private cipher: Cipher;
    private network: Network;
    private mainWindow: BrowserWindow | null;
    // 判断是否取消登录
    private cancelLogin: boolean;
    private waittingSend: any[];
    private sendCallBack: any;
    // 存储login的登录后返回的信息
    private loginData: any;
    private openChatWindow: any;
    // 只有在登录和退出登录时才能改值，否则系统的存储系统会错误
    private account: string;
    private db: DB | null;
    private friendsNet: any;
    // 等待获取friend的udpNet然后发送的信息
    private waittingUdpSend: any;
    // 等待解密
    private waittingDecript: any;
    constructor(mainWindow: BrowserWindow | null) {
        this.cipher = new Cipher(11);
        this.network = new Network({
            tcp: {
                port: 8888,
                host: '192.168.1.105'
            },
            udp: {
                serverAddress: '192.168.1.105',
                serverPort: 4444,
                savePath: 'C:'
            }
        });
        this.friendsNet = {};
        this.mainWindow = mainWindow;
        this.cancelLogin = true;
        this.waittingSend = [];
        this.waittingUdpSend = {};
        this.waittingDecript = {};
        this.sendCallBack = null;
        this.loginData = null;
        this.openChatWindow = {};
        this.account = '';
        
        this.db = null;
        this.init();
    }

    init() {

        ipcMain.handle('getAssertPath', (event, ...paths) => {
            event.preventDefault()
            return getAssetPath(...paths);
        });
        // login
        ipcMain.on('login', (event, account, pwd) => {
            this.cancelLogin = false;
            this.account = account;
            this.initDB(account);
            this.checkRepetLogin().then(() => {
            this.network.createTcpClient(this.cipher.getDHKey());
            this.networkEvent(event);
            this.waittingSend.push({
                msg:JSON.stringify({
                    type:'login',
                    data:{
                        account,
                        pwd
                    }
                }),
                callback: (data: any) => {
                    if(data) {
                        // this.loginData = data;
                        const { state, friendList, myInfo } = data;
                        if(state !== true) {
                            this.network.tcpClose();
                        } else {
                            if(!myInfo) {
                                event.reply('login-failure', 'the account info is error');
                                return;
                            }
                            this.network.setSavePath(path.resolve(getInstallPath(), this.account, 'files'));
                            this.network.createUdp();
                            this.network.sendRandom(this.cipher.getOwnPublicKey());
                            this.udpEvent(event);
                            friendList.unshift(myInfo);
                            const dealData = friendList.map((item: any) => {
                                const { ip, port, shareKey, account } = item;
                                this.friendsNet[account] = {
                                    ip,
                                    port,
                                    shareKey
                                }
                                const filename = this.cipher.hash(this.account+account) + '.db';
                                const db = new DB(path.resolve(getInstallPath(), this.account, 'users', filename));
                                if(item.unReadMsg) {
                                    (item as any).unReadCount = item.unReadMsg.length;
                                    if(item.unReadMsg.length !== 0) {
                                        // 写信息
                                        (item.unReadMsg as Array<any>).forEach((value) => {
                                            const { type } = value;
                                            if(type === 'message') {
                                                db.insertData(value);
                                            } else {
                                                const filePath = path.resolve(getInstallPath(), this.account, 'files');
                                                const { time, nick, type, filename } = value;
                                                db.insertData({
                                                    type,
                                                    time,
                                                    nick,
                                                    content: {
                                                        folder: filePath,
                                                        filename: filename
                                                    }
                                                })
                                            }
                                        });
                                    }
                                    delete (item as any).unReadMsg;
                                }
                                return item;
                            });
                            this.loginData = dealData;
                            this.mainWindow?.hide();
                            this.mainWindow?.setSize(300, 700);
                            this.mainWindow?.loadURL(resolvePath(''));
                        }
                    }
                }
            });

            },(err) => {
                event.reply('login-failure', err);
            });
            
        });
        ipcMain.on('cancelLogin', (event) => {
            event.preventDefault();
            this.cancelLogin = true;
            this.network.tcpClose();
        });
        ipcMain.on('register', (event, nick, pwd) => {
            this.network.createTcpClient(this.cipher.getDHKey());
            this.networkEvent(event);
            this.waittingSend.push({
                msg:JSON.stringify({
                    type:'register',
                    data:{
                        nick,
                        pwd
                    }
                }),
                callback: (data: any) => {
                    console.log(data);
                    const { state, account } = data;
                    if(state) {
                        event.reply('server-register-return', account);
                    } else {
                        event.reply('server-register-return', 'error');
                    }
                    this.network.tcpClose();
                }
            });
        });
        
        ipcMain.on('winClose', () => {
            BrowserWindow.getFocusedWindow()?.close();
        });
    
        ipcMain.on('minimizeToTray', () => {
            BrowserWindow.getFocusedWindow()?.hide();
        });

        ipcMain.on('minimizeToBar', () => {
            BrowserWindow.getFocusedWindow()?.minimize();
        });
    
        ipcMain.on('go-to-register-page', () => {
            if(this.mainWindow) {
                this.mainWindow.loadURL(resolvePath('register'));
            }
        });
    
        ipcMain.on('go-to-login-page', () => {
            if(this.mainWindow) {
                this.mainWindow.loadURL(resolvePath('login'));
            }
        });


        ipcMain.on('open-new-chat-window', (event, account, nick, selfnick) => {
            event.preventDefault()
            if(this.openChatWindow[account]) {
                if(!(this.openChatWindow[account] as BrowserWindow).isVisible()) {
                    (this.openChatWindow[account]).show();
                } else {
                    (this.openChatWindow[account]).focus();
                }
            } else {
                // 创建聊天窗口
                this.openChatWindow[account] = createWindow(resolvePath(`chat/${account}/${nick}/${selfnick}`));
                (this.openChatWindow[account] as BrowserWindow).on('closed', () => {
                    this.openChatWindow[account] = null;
                });
            }
        });


        ipcMain.handle('openFileDialogAndSend',async (event, account, selfnick) => {
            event.preventDefault();
            let files = dialog.showOpenDialogSync(this.openChatWindow[account], {
                title: '选择文件',
                properties: ['openFile', 'multiSelections'],
                filters: [
                    { name: 'Images', extensions: ['jpg', 'png', 'gif'] },
                    { name: 'Movies', extensions: ['mkv', 'avi', 'mp4'] },
                    { name: 'Custom File Type', extensions: ['as'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            const { ip, port } = this.friendsNet[account];
            if(!ip || !port) {
                // 转服务器获取数据
                this.network.tcpSend(this.cipher.encryption(JSON.stringify({
                    type: 'getNet',
                    data: {
                        account
                    }
                })));
                if(this.waittingUdpSend[account]) {
                    this.waittingUdpSend[account].push({type:'file', content: files, nick: selfnick});
                } else {
                    this.waittingUdpSend[account] = [{type:'file', content: files, nick: selfnick}];
                }
            } else {
                files?.map((values) => {
                    this.network.udpSend('file', values, this.account, port, ip, '', selfnick);
                });
            }
            let storeArr = files?.map((values) => {
                const fileObj = path.parse(values);
                let obj = {
                    time: Date.now(),
                    nick: selfnick,
                    type: 'file',
                    content: {
                        folder: fileObj.dir,
                        filename: fileObj.name + fileObj.ext
                    }
                };
                // 延迟， 防止传输过于拥堵
                const time = Date.now();
                while(true) {
                    if(Date.now() - time > 1) {
                        break;
                    }
                }
                return obj;
            });
            // 有可能为undefined
            if(storeArr !== undefined) {
                // 消息发送
                const filename = this.cipher.hash(this.account+account) + '.db';
                const db = new DB(path.resolve(getInstallPath(), this.account, 'users', filename));
                let res  = await db.insertData(storeArr);
                if(res === true) {
                    return storeArr;
                }
                return false;
            }
            return false;
        });

        ipcMain.handle('messageSend', async (event, account, msg) => {
            event.preventDefault();
            // 消息发送
            const { ip, port, shareKey} = this.friendsNet[account];
            if(ip && port && shareKey) {
                const key = this.cipher.getUserShareKey(shareKey);
                let encrypText = this.cipher.encryption(JSON.stringify(msg), key);
                this.network.udpSend('message', encrypText, this.account, port, ip);
            } else {
                // 发送给服务器
                const data = {
                    type: 'getNet',
                    data: {
                        account
                    }
                }
                this.network.tcpSend(this.cipher.encryption(JSON.stringify(data)));
                if(this.waittingUdpSend[account]) {
                    this.waittingUdpSend[account].push({type:'message', content: msg});
                } else {
                    this.waittingUdpSend[account] = [{type:'message', content: msg}];
                }
            }
            const filename = this.cipher.hash(this.account+account) + '.db';
            const db = new DB(path.resolve(getInstallPath(), this.account, 'users', filename));
            let res  = await db.insertData(msg);
            return res;
        });

        ipcMain.handle('chat-open-file', (event, folder, filename) => {
            event.preventDefault();
            const filepath = path.resolve(folder, filename);
            const isExist = fs.existsSync(filepath);
            if(!isExist) {
                return false;
            } else {
                shell.openPath(filepath);
                return true;
            }
        });

        ipcMain.handle('chat-open-folder', (event, folder, filename) => {
            event.preventDefault();
            const filepath = path.resolve(folder, filename);
            const isExist = fs.existsSync(filepath);
            if(!isExist) {
                // 文件不存在
                return false;
            } else {
                shell.showItemInFolder(filepath);
                return true;
            }
        });

        ipcMain.handle('get-login-data', () => {
            if(!this.mainWindow) throw new Error('the mainwindow is collapsed')
            if(!this.mainWindow?.isVisible()) {
                this.mainWindow?.setSize(300, 750);
                this.mainWindow?.setPosition(1000, 0);
                this.mainWindow?.show();
            }
            return this.loginData;
        });

        ipcMain.handle('getChatInfo',async (event, account, offset) => {
            event.preventDefault();
            const fileName = this.cipher.hash(this.account+account) + '.db';
            this.db?.changeDataBase(path.resolve(getInstallPath(), this.account, 'users', fileName));
            let res = await this.db?.sort({time: -1}).limitFnc(offset).queryData();
            if(!res) {
                return false;
            } else {
                return res;
            }
        });
    }

    private handleTCPData = (res: Buffer) => {
        const datastr = res.toString('utf-8');
        let dataObj = null;
        try {
            dataObj = JSON.parse(datastr);
        } catch {
            dataObj = JSON.parse(this.cipher.decryption(datastr));
        }
        const { type, data } = dataObj;
        switch (type) {
            case 'D-Htrans-return': {
                // DH 秘钥交换
                this.cipher.setShareServerKey(data.key);
                if(this.waittingSend.length === 1) {
                    const readySend = this.waittingSend.shift();
                    this.network.tcpSend(this.cipher.encryption(readySend.msg));
                    this.sendCallBack = readySend.callback;
                } else {
                    this.network.tcpClose();
                }
                break;
            }
            case 'login': {
                if(this.cancelLogin) {
                    this.sendCallBack = null;
                    break;
                }
                this.sendCallBack(data);
                break;
            }
            case 'register': {
                this.sendCallBack(data);
                break;
            }
            case 'sendToServer': {
                // data ===> account
                console.log('sendToServer', data);
                while(this.waittingUdpSend[data] && this.waittingUdpSend[data].length) {
                    // 循环发送
                    const obj = this.waittingUdpSend[data].shift();
                    const { type, content } = obj;
                    if(type === 'file') {
                        // 发送文件
                        const { nick } = obj;
                        console.log(nick);
                    } else {
                        this.network.tcpSend(this.cipher.encryption(JSON.stringify({
                            type: 'userNotConnect',
                            data: content,
                            account: data
                        })));
                    }
                }
                break;
            }
            case 'udpInfo': {
                const { account, info } = data;
                const { ip, port, shareKey } = info;
                this.friendsNet[account] = info;
                while(this.waittingUdpSend[account] && this.waittingUdpSend[account].length) {
                    // 循环发送
                    const obj = this.waittingUdpSend[account].shift();
                    const { type, content } = obj;
                    if(type === 'file') {
                        // 发送文件
                        const { nick } = obj;
                        (content as Array<string>).forEach((value) => {
                            this.network.udpSend('file', value, this.account, port, ip, '', nick);
                        });
                    } else {
                        const key = this.cipher.getUserShareKey(shareKey);
                        let encrypText = this.cipher.encryption(JSON.stringify(content), key);
                        this.network.udpSend('message', encrypText, this.account, port, ip);
                    }
                }
                break;
            }
            case 'decriptUserInfo': {
                const { account, info } = data;
                const { shareKey } = info;
                console.log('shareKey---------------',shareKey)
                this.friendsNet[account] = info;
                while(this.waittingDecript[account] && this.waittingDecript[account].length) {
                    const msg = this.waittingDecript[account].shift();
                    const key = this.cipher.getOwnPublicKey();
                    const keyConf = {
                        key: key.slice(0, 32),
                        iv: key.slice(key.length - 16, key.length)
                    }
                    const plaintText = this.cipher.decryption(msg, keyConf);
                    // 收进数据库
                    const filename = this.cipher.hash(this.account+account) + '.db';
                    const db = new DB(path.resolve(getInstallPath(), this.account, 'users', filename));
                    db.insertData(JSON.parse(plaintText));
                    if(this.openChatWindow[account]) {
                        // 接收消息
                        (this.openChatWindow[account] as BrowserWindow).webContents.send(account, plaintText);
                        if(!(this.openChatWindow[account] as BrowserWindow).isFocused()) {
                            // 窗体闪烁
                            (this.openChatWindow[account] as BrowserWindow).flashFrame(true);
                        }
                    } else {
                        this.mainWindow?.webContents.send('resaveMsg', account);
                    }
                    
                }
                break;
            }
            case 'userOffline': {
                const { account } = data;
                console.log('userOffline', account)
                this.friendsNet[account] = {
                    ip: '',
                    port: '',
                    shareKey: ''
                }
                break;
            }
            // 处理后序消息通信
            default: {
                break;
            }
        }
    }

    private networkEvent(event: Electron.IpcMainEvent) {
        this.network.ton('close', (hadError: boolean) => {
            // if(hadError)
            // event.reply('tcp-network-close', 'anomaly close');
            this.reinit();
            if(!hadError) {
                this.mainWindow?.webContents.send('login-failure', 'login failed. Please log in again');
            }
        });
        this.network.ton('error', (err:Error) => {
            console.log('error', err);
            event.reply('tcp-network-error', err.message);
        });

        this.network.ton('timeout', () => {
            console.log('timeout');
        });

        // tcp 接收数据
        this.network.ton('data', this.handleTCPData);
    }

    private udpEvent(event: Electron.IpcMainEvent) {
        this.network.uon('message', async (data: any, description: any) => {
            // 数据解密，hash对比
            const { from, type } = description;
            if(type === 'message') {
                // data需要解密
                const { hash, length } = description;
                const { shareKey, ip, port } = this.friendsNet[from];
                if(!ip || !port || !shareKey) {
                    const sendObj = {
                        type: 'getNetDecript',
                        data: {
                            account: from
                        }
                    }
                    this.network.tcpSend(this.cipher.encryption(JSON.stringify(sendObj)));
                    if(this.waittingDecript[from]) {
                        this.waittingDecript[from].push(data);
                    } else {
                        this.waittingDecript[from] = [data];
                    }
                } else {
                    const key = this.cipher.getOwnPublicKey();
                    const keyConf = {
                        key: key.slice(0, 32),
                        iv: key.slice(key.length - 16, key.length)
                    }
                    const plaintText = this.cipher.decryption(data, keyConf);
                    // 待验证
                    if(hash && length){}
                    // 收进数据库
                    const filename = this.cipher.hash(this.account+from) + '.db';
                    console.log(filename)
                    const db = new DB(path.resolve(getInstallPath(), this.account, 'users', filename));
                    await db.insertData(JSON.parse(plaintText));
                    if(this.openChatWindow[from]) {
                        // 接收消息
                        (this.openChatWindow[from] as BrowserWindow).webContents.send(from, plaintText);
                        if(!(this.openChatWindow[from] as BrowserWindow).isFocused()) {
                            // 窗体闪烁
                            (this.openChatWindow[from] as BrowserWindow).flashFrame(true);
                        }
                    } else {
                        event.reply('resaveMsg', from);
                    }
                }
                
            } else {
                // file
                // 构造web接收结构
                const fileObj = path.parse(data);
                const { nick, from, time } = description;
                let obj = {
                    time,
                    nick,
                    type,
                    content: {
                        folder: fileObj.dir,
                        filename: fileObj.name + fileObj.ext
                    }
                }
                // 存储
                const filename = this.cipher.hash(this.account+from) + '.db';
                const db = new DB(path.resolve(getInstallPath(), this.account, 'users', filename));
                db.insertData(obj);
                if(this.openChatWindow[from]) {
                    (this.openChatWindow[from] as BrowserWindow).webContents.send(from, JSON.stringify(obj));
                    if(!(this.openChatWindow[from] as BrowserWindow).isFocused()) {
                        // 窗体闪烁
                        (this.openChatWindow[from] as BrowserWindow).flashFrame(true);
                    }
                } else {
                    event.reply('resaveMsg', from);
                }
            }
            
        });
    }
    // 检查用户文件夹是否完整
    private checkUserCatalog(account: string) {
        if(!fs.existsSync(path.resolve(getInstallPath(), account))) {
            fs.mkdirSync(path.resolve(getInstallPath(), account));
            fs.mkdirSync(path.resolve(getInstallPath(), account, 'files'));
            fs.mkdirSync(path.resolve(getInstallPath(), account, 'users'));
        } else if(!fs.existsSync(path.resolve(getInstallPath(), account, 'files'))) {
            fs.mkdirSync(path.resolve(getInstallPath(), account, 'files'));
        } else if(!fs.existsSync(path.resolve(getInstallPath(), account, 'users'))) {
            fs.mkdirSync(path.resolve(getInstallPath(), account, 'users'));
        }
    }
    // 登录时调用
    private initDB(account: string) {
        this.checkUserCatalog(account);
        this.db = new DB(path.resolve(getInstallPath(), account, 'state.db'));
    }

    // 登录之前(网络请求之前)再调用
    private async checkRepetLogin() {
        return new Promise((resolve, reject) => {
            if(this.db) {
                this.db.findOne({}).then((objects) => {
                    if(!objects) {
                        // objects 为null
                        this.db?.insertData({login: 1}).then(() => {
                            resolve(true);
                        });
                    } else if((objects as any).login === 1) {
                        // 重复登录了
                        reject('该账户已经登录，请勿重复登录!');
                        this.reLogin();
                    } else {
                        this.db?.updateData({login: 0}, {login: 1}).then((res) => {
                            resolve(res);
                        }).catch((err) => {
                            reject(err);
                        });
                    }
                });
            }
        });
    }
    //重新初始化，回到登录状态
    private reLogin() {
        this.account = '';
        this.cancelLogin = true;
        this.network.tcpClose();
        this.waittingSend = [];
        this.sendCallBack = null;
        this.loginData = null;
        this.openChatWindow = {};
    }
    // 重新init
    private reinit() {
        if(this.account) {
            this.db?.changeDataBase(path.resolve(getInstallPath(), this.account, 'state.db'));
            this.db?.updateData({login: 1}, {login: 0}).catch(err => {
                console.log(err);
            });
        }
        this.cipher = new Cipher(11);
        this.cancelLogin = true;
        this.waittingSend = [];
        this.sendCallBack = null;
        this.loginData = null;
        this.openChatWindow = {};
        this.account = '';
        this.db = null;
        this.waittingSend = [];
        this.waittingUdpSend = {};
        this.waittingDecript = {};
    }

    public async close() {
        if(this.account) {
            this.db?.changeDataBase(path.resolve(getInstallPath(), this.account, 'state.db'));
            await this.db?.updateData({login: 1}, {login: 0}).catch(err => {
                console.log(err);
            });
        }
        this.account = '';
        this.cancelLogin = true;
        this.network.tcpClose();
        this.waittingSend = [];
        this.sendCallBack = null;
        this.loginData = null;
        this.openChatWindow = {};
    }


}
