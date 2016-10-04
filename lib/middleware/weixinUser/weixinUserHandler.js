/**
 * Created by Aix on 2016/9/13 0013.
 * 处理微信消息中的微信用户，如果该用户信息在系统库中还不存在，
 * 则进行创建相应记录，保证后续的处理时对应的微信账号肯定是存在的
 */

'use strict';

var debug = require('debug')('service:middleware[weixinUserHandler]');

var weixinUserDb = require('models/weixin/weixinUser').WeixinUser;

module.exports = function(){
    return function(req, res, next){
        if(!req.shouldProcessMessage){
            next();
        }else{
            debug('start WeixinUserHandler...');

            var fromUserName = req.message.fromusername;
            weixinUserDb.findAll({where: {
                username: fromUserName
            }}).then(function(weixinUsers){
                if(weixinUsers && weixinUsers.length > 0){
                    debug('get exist weixin_user');
                    req.weixinUser = weixinUsers[0];
                    next();
                }else{
                    debug('create new weixin_user');
                    weixinUserDb.create({
                        username: fromUserName,
                        webappId: req.userProfile.webappId,
                        nickName: '',
                        weixinUserIcon: ''
                    }).then(function(weixinUser){
                        req.weixinUser = weixinUser;
                        next();
                    });
                }
            });
        }
    };
};