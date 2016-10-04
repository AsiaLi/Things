/**
 * Created by Aix on 2016/8/25 0025.
 * 只处理微信消息推送事件
 */

'use strict';

var debug = require('debug')('service:middleware[messageEventPreProcessor]');
var crypto = require('crypto');

var WxMsgCrypt = require('lib/WxMsgCrypt');
var util = require('utils/commonUtil');
var settings = require('settings');

function sha1(){
	var args = Array.prototype.slice.call(arguments);
	args.sort(function(a,b){
		a = a.toString();
		b = b.toString();
		return a>b?1:a<b?-1:0;
	});
	return crypto.createHash('sha1').update(args.join('')).digest("hex");
}

function validateRequest(signature, timestamp, nonce){
	if(!signature || !timestamp || ! nonce){
		return false;
	}
	var sha = sha1(settings.token, timestamp, nonce);
	debug('===========validateRequest==============');
	debug(sha);
	debug(signature);
	debug('===========validateRequest==============');
	return signature === sha
}

module.exports = function (req, res, next){
	if(!req.path.includes('/weixin')){
		next();
		return;
	}
	debug('==================request==========================');
	debug(req.path);
	debug(req.GET);
	debug(req.POST);
	debug('==================request==========================');

	var signature = req.GET.signature,
		timestamp = req.GET.timestamp,
		nonce = req.GET.nonce,
		echostr = req.GET.echostr;

	if(validateRequest(signature, timestamp, nonce)){
		if(util.isEmptyObject(req.POST)){
			res.end(echostr);
		}else{
			req.shouldProcessMessage = true;
			req.isFromClient = !!req.GET.client; //用于本地测试的REST client
			var xmlMessage = req.body.toString(); //将buffer转为可读的字符串

			var xmlObj = util.stringToXml(xmlMessage);
			if(util.isEmptyObject(xmlObj)){
				res.end();
				return;
			}
			if(!req.isFromClient){
				//非本地测试来得消息需要解密
				var encript = new WxMsgCrypt(settings.CONPONENT_INFO.token, settings.CONPONENT_INFO.encodingAESKey, settings.CONPONENT_INFO.appid);
				var data = encript.decrypt(signature, timestamp, nonce, xmlObj.encrypt);
				debug('start==================decode message=============================');
				debug(data);
				debug('end==================decode message=============================');
				if(data.err){
					debug(data.err);
					res.end();
					return;
				}
				var decodedMsg = data.result;
				req.message = util.stringToXml(decodedMsg);
				if(util.isEmptyObject(req.message)){
					res.end();
					return;
				}
				next();
			}else{
				req.message = xmlObj;
				next();
			}
		}
	}else{
		res.end();
	}
};