const crypto = require('crypto');

export default class Cipher {
    private MAX_ENCRYPT_BLOCK: number;
    private MAX_DECRYPT_BLOCK: number;
    private RSAServerPublicKey: string;
    private DH: any;
    private shareServerAESKeyConf: {
        key: string,
        iv: string
    };
    constructor(prime: number) {
        this.MAX_DECRYPT_BLOCK = 128;
        this.MAX_ENCRYPT_BLOCK = 128;
        this.RSAServerPublicKey = '';
        this.shareServerAESKeyConf = {
            key:'',
            iv: ''
        };
        this.DH = crypto.createDiffieHellman(1024, prime);
    }
    
    public setServerPublicKey(publicKey: string) {
        this.RSAServerPublicKey = publicKey;
    }

    public getServerPublicKey(): string {
        return this.RSAServerPublicKey;
    }

    
    /**
     * 公钥加密
     */
    publicEncrypt(data: string, publicKey: string): string {
        const encryptOptions = {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_PADDING
        }
        return crypto.publicEncrypt(encryptOptions, Buffer.from(data)).toString('base64');
    }

    /**
     * 公钥解密
     */
    publicDecrypt(data: string, publicKey: string): string {
        const encryptOptions = {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_PADDING
        }
        return crypto.publicDecrypt(encryptOptions, Buffer.from(data, 'base64')).toString();
    }
    /**
     * 私钥加密
     */
    privateEncrypt(data: string, privateKey: string): string {
        //经过base64编码的密文转成buf
        var buf = Buffer.from(data, "utf-8");
        //buf转byte数组
        var inputLen = buf.byteLength;
        //密文
        var bufs = [];
        //开始长度
        var offSet = 0;
        //结束长度
        var endOffSet = this.MAX_ENCRYPT_BLOCK;
        //分段加密
        while (inputLen - offSet > 0) {
            if (inputLen - offSet > this.MAX_ENCRYPT_BLOCK) {
                var bufTmp = buf.slice(offSet, endOffSet);
                bufs.push(crypto.privateEncrypt({key: privateKey, padding: crypto.RSA_PKCS1_PADDING}, bufTmp));
            } else {
                var bufTmp = buf.slice(offSet, inputLen);
                bufs.push(crypto.privateEncrypt({key: privateKey, padding: crypto.RSA_PKCS1_PADDING}, bufTmp));
            }
            offSet += this.MAX_ENCRYPT_BLOCK;
            endOffSet += this.MAX_ENCRYPT_BLOCK;
        }
        var result = Buffer.concat(bufs);
        //密文BASE64编码
        var base64Str = result.toString("base64");
        return base64Str;
    }


    /**
     * 私钥解密
     */
    privateDecrypt(data: string, privateKey: string): string {
        //经过base64编码的密文转成buf
        var buf = Buffer.from(data, "base64");
        var inputLen = buf.byteLength;
        //密文
        var bufs = [];
        //开始长度
        var offSet = 0;
        //结束长度
        var endOffSet = this.MAX_DECRYPT_BLOCK;
        //分段加密
        while (inputLen - offSet > 0) {
            if (inputLen - offSet > this.MAX_DECRYPT_BLOCK) {
                var bufTmp = buf.slice(offSet, endOffSet);
                bufs.push(crypto.privateDecrypt({key: privateKey, padding: crypto.RSA_PKCS1_PADDING}, bufTmp));
            } else {
                var bufTmp = buf.slice(offSet, inputLen);
                bufs.push(crypto.privateDecrypt({key: privateKey, padding: crypto.RSA_PKCS1_PADDING}, bufTmp));
            }
            offSet += this.MAX_DECRYPT_BLOCK;
            endOffSet += this.MAX_DECRYPT_BLOCK;
        }
        var result = Buffer.concat(bufs).toString();
        //解密
        return result;
    }

    /**
     * hash函数,可以实现md5，sha256，默认为md5
     */
    hash(msg: string,type="md5") {
        var hash = crypto.createHash(type);
        hash.update(msg);
        var res = hash.digest('hex');
        return res;
    }

    /**
     * AES加解密
     */
    encryption(data: string, aesConf?:{key:string,iv:string}): string {
        let conf = this.shareServerAESKeyConf;
        if(aesConf) {
            conf = aesConf;
        }
        if(conf.key.length !==32 && conf.iv.length !==  16) {
            throw new Error('the key is unvriabble');
        }
        let type='aes-256-cbc';
        if(!conf.key && !conf.iv) throw new Error('the key is not set');
        let key = conf.key;
        let iv = conf.iv;
        // let padding = AES_conf.padding;
        var cipherChunks = [];
        var encrypt = crypto.createCipheriv(type, key, iv);
        encrypt.setAutoPadding(true);
        cipherChunks.push(encrypt.update(data, 'utf8', 'base64'));
        cipherChunks.push(encrypt.final('base64'));
        return cipherChunks.join('');
    }

    decryption(data: string, aesConf?:{key:string,iv:string}): string {
        let conf = this.shareServerAESKeyConf;
        if(aesConf) {
            conf = aesConf;
        }
        if(conf.key.length !==32 && conf.iv.length !==  16) {
            throw new Error('the key is unvriabble');
        }
        let type='aes-256-cbc';
        if(!conf.key && !conf.iv) throw new Error('the key is not set');
        let key = conf.key;
        let iv = conf.iv;
        // let padding = AES_conf.padding;

        var cipherChunks = [];
        var decipher = crypto.createDecipheriv(type, key, iv);
        decipher.setAutoPadding(true);
        cipherChunks.push(decipher.update(data, 'base64', 'utf8'));
        cipherChunks.push(decipher.final('utf8'));
        return cipherChunks.join('');
    }


    getDHKey() {
        const DHKey = this.DH.generateKeys();
        return {
            pbkey : DHKey.toString('hex'),
            p : this.DH.getPrime().toString('hex'),
            q : this.DH.getGenerator().toString('hex')
        }
    }

    getOwnPublicKey() {
        return this.DH.generateKeys().toString('hex');
    }


    setShareServerKey(key: string) {
        const share = this.DH.computeSecret(Buffer.from(key, 'hex')).toString('hex');
        this.shareServerAESKeyConf.key = share.slice(0, 32);
        this.shareServerAESKeyConf.iv = share.slice(share.length - 16, share.length);
        console.log(this.shareServerAESKeyConf);
    }

    createAesConf(key: string) {
        const share = this.DH.computeSecret(Buffer.from(key, 'hex')).toString('hex');
        return {
            key: share.slice(0, 32),
            iv: share.slice(share.length - 16, share.length)
        }
    }

    getShareServerKey() {
        return this.shareServerAESKeyConf;
    }

    getUserShareKey(key: string) {
        return {
            key: key.slice(0, 32),
            iv: key.slice(key.length - 16, key.length)
        };
    }

    close() {
        this.MAX_DECRYPT_BLOCK = 127;
        this.MAX_ENCRYPT_BLOCK = 127;
        this.RSAServerPublicKey = '';
        this.shareServerAESKeyConf = {
            key: '',
            iv: ''
        };
        this.DH = null;
    }
}