/**
 * Created by Aix on 2016/9/11 0025.
 * 对公众平台发送给公众账号的消息加解密
 */

'use strict';

var crypto = require('crypto');

class WxMsgCrypt{
    constructor(token, key, appid){
        this.token = token;
        this.key = key;
        this.appid = appid;
    }

    //加密消息
    encrypt(text){
        var prp = new prpcrypt(this.key);
        var encrypted = prp.encrypt(text, this.appid);
        var nonce = Buffer(crypto.pseudoRandomBytes(16).toString('base64').substring(0, 16));
        var timestamp = new Date().getTime();

        var hash = sha1(this.token, timestamp, nonce, encrypted);

        return `<xml>
			<Encrypt><![CDATA[${encrypted}]]></Encrypt>
			<MsgSignature><![CDATA[${hash}]]></MsgSignature>
			<TimeStamp>${timestamp}</TimeStamp>
			<Nonce><![CDATA[${nonce}]]></Nonce>
			</xml>
		`;
    }

    //解密消息
    decrypt(hash, timestamp, nonce, xml){
        //var _hash = sha1(this.token, timestamp, nonce, xml);
        //if (hash != _hash) return {err: 'signature not match'};
        var prp = new prpcrypt(this.key);
        return prp.decrypt(xml, this.appid);
    }
}

class prpcrypt{
    constructor(k){
        this.key = new Buffer(k + '=', 'base64').toString('binary');
        this.mode = 'aes-256-cbc';
    }

    encrypt(text, appid){
        text = new Buffer(text);

        var pad = enclen(text.length),
            pack = new PKCS7().encode(20 + text.length + appid.length),
            random = getRandomStr(),
            content = random + pad + text.toString('binary') + appid + pack;
        var cipher = crypto.createCipheriv(this.mode, this.key, this.key.slice(0, 16));
        cipher.setAutoPadding(false);
        return cipher.update(content, 'binary', 'base64') + cipher.final('base64');
    }

    decrypt(encrypted, appid){
        var decipher = crypto.Decipheriv(this.mode, this.key, this.key.slice(0, 16));
        decipher.setAutoPadding(false);
        var plain_text = decipher.update(encrypted, 'base64', 'utf8') + decipher.final('utf8');
        var pad = plain_text.charCodeAt(plain_text.length - 1);
        var err = false;
        //检测公众号appid的一致性
        var innerAppid = plain_text.slice(plain_text.indexOf('</xml>') + 6, -pad);
        if(innerAppid !== appid){
            err = '不合法的消息来源';
        }
        return {
            err: err,
            result: plain_text.slice(20, -pad).replace(/<\/xml>.*/,'</xml>')
        };
    }
}

class PKCS7{
    constructor(){
        this.block_size = 32;
    }

    encode (text_length){
        // 计算需要填充的位数
        var amount_to_pad = this.block_size - (text_length % this.block_size);
        if(amount_to_pad === 0){
            amount_to_pad = this.block_size;
        }
        // 获得补位所用的字符
        var pad = String.fromCharCode(amount_to_pad), s = [];
        for (var i=0; i<amount_to_pad; i++) s.push(pad);
        return s.join('');
    }
}

//sha1摘要算法
function sha1(){
    var args = Array.prototype.slice.call(arguments);
    args.sort(function(a,b){
        a = a.toString();
        b = b.toString();
        return a>b?1:a<b?-1:0;
    });
    return crypto.createHash('sha1').update(args.join('')).digest("hex");
}

function getRandomStr(){
    var pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz";
    var re = '';
    for(let i=0;i<16;i++){
        re += pool.charAt(Math.random()*pool.length);
    }
    return re;
}

function enclen(len){
    var buf = new Buffer(4);
    buf.writeUInt32BE(len);
    return buf.toString('binary');
}

module.exports = WxMsgCrypt;