/**
 * Created by Asia on 2016/10/03.
 */

'use strict';

//connect中间件
exports.MIDDLEWARES = [
	'lib.middleware.bodyPaser',

	//处理微信消息事件中间件 ---start
	'lib.middleware.message.messageEventPreProcessor',
	// 'lib.middleware.weixinUser.weixinUserHandler',
	// 'lib.middleware.weixinUser.memberHandler',
	// 'lib.middleware.message.messageLogger',
	// 'lib.middleware.message.followEvent',
	// 'lib.middleware.message.keywordEvent',
	// 'lib.middleware.message.unmatchEvent'
	//处理微信消息事件中间件 ---end
];

//mongodb连接信息
exports.MONGO = 'mongodb://127.0.0.1/things';

//公众号信息
exports.appid = 'wxdf4a88bef48372d8';
exports.token = 'J1U2S34T_';
exports.aesKey = 'A26nKnBB4qAhkNpEwBptpqyauicpC6KdgiojyOv4WhT';