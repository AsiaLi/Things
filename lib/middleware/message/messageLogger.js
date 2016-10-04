/**
 * Created by Aix on 2016/8/25 0025.
 */

'use strict';

var debug = require('debug')('service:middleware[messageLogger]');
var EventEmitter = require('events');

var weixinUserDb = require('models/weixin/weixinUser').WeixinUser;
var weixinMpUserDb = require('models/weixin/weixinMpUser').WeixinMpUser;
var sessionDb = require('models/weixin/session').Session;
var messageDb = require('models/weixin/message').Message;
var memberDb = require('models/member/member').Member;


module.exports = function(){
    return function (req, res, next){
        if(!req.shouldProcessMessage){
            next();
            return;
        }
        //记录message
        var msgType = req.message.msgtype;
        if(['text', 'voice', 'image'].indexOf(msgType) >= 0){
            req.logEmitter = new EventEmitter();
            recordMessage(req);
        }else{
            debug('only handle text, voice, image message, current type: %s', msgType);
        }
        next();
    }
};

function recordMessage(req){
    getWeixinUser(req)
        .then(getWeixinMpUser)
            .then(saveSession)
                .then(saveMessage)
                    .then(updateMemberInfo);
}

function getWeixinUser(req){
    return weixinUserDb.findOne({where: {username: req.message.fromusername}}).then(function(winxinUser){
        return new Promise(function(resolve){
            resolve({req, winxinUser});
        });
    });
}

function getWeixinMpUser(params){
    var req = params.req,
        winxinUser = params.winxinUser;
    return weixinMpUserDb.findOne({where: {ownerId: req.userProfile.userId}}).then(function(weixinMpUser){
        return new Promise(function(resolve){
            resolve({req, winxinUser, weixinMpUser});
        });
    });
}

function saveSession(params){
    var req = params.req,
        winxinUser = params.winxinUser,
        weixinMpUser = params.weixinMpUser;

    return sessionDb.findOne({where: {
        weixinUserName: winxinUser.username,
        mpuserId: weixinMpUser.id
    }}).then(function(session){
        var content = req.message.content;
        var createTime = req.message.createtime;
        if(session){
            //更新会话内容
            session.weixinCreatedAt = createTime;
            session.latestContactContent = content;
            session.latestContactCreatedAt = new Date();
            session.unreadCount += 1;
            session.retryCount = 0;
            session.memberLatestContent = content;
            session.memberLatestCreatedAt = createTime;
            session.isReplied = false;
            session.isLatestContactByViper = false;
            return session.save().then(function(session){
                return new Promise(function(resolve){
                    resolve({req, winxinUser, weixinMpUser, session});
                });
            });
        }else{
            return sessionDb.create({
                mpuserId: weixinMpUser.id,
                weixinUserName: winxinUser.username,
                weixinCreatedAt: createTime,
                latestContactContent: content,
                unreadCount: 1,
                isShow: true,
                memberUserUsername: winxinUser.username,
                memberLatestContent: content,
                memberLatestCreatedAt: createTime,
                createdAt: new Date()
            }).then(function(session){
                return new Promise(function(resolve){
                    resolve({req, winxinUser, weixinMpUser, session})
                });
            });
        }
    });
}

function saveMessage(params){
    var picUrl = '',
        mediaId = '',
        req = params.req,
        winxinUser = params.winxinUser,
        weixinMpUser = params.weixinMpUser,
        session = params.session,
        content = req.message.content;
    if(req.message.msgtype === 'image'){
        picUrl = req.message.picurl;
        mediaId = req.message.mediaid;
    }
    return messageDb.create({
        mpuserId: weixinMpUser.id,
        sessionId: session.id,
        fromWeixinUserUsername: winxinUser.username,
        toWeixinUserUsername: weixinMpUser.username,
        content: content,
        msgId: req.message.msgid,
        picUrl: picUrl,
        mediaId: mediaId,
        messageType: req.message.msgtype,
        createdAt: new Date(),
        weixinCreatedAt: new Date()
    }).then(function(message){
        //更新session
        session.messageId = message.id;
        session.latestContactContent = content;
        session.memberMessageId = message.id;
        session.save();
        //记录系统回复的消息
        req.logEmitter.once('recordResp', function(rule){
            if(rule && session){
                let content = rule.isNews()? '': rule.answer;
                messageDb.create({
                    mpuserId: weixinMpUser.id,
                    sessionId: session.id,
                    fromWeixinUserUsername: weixinMpUser.username,
                    toWeixinUserUsername: winxinUser.username,
                    content: content,
                    materialId: rule.materialId,
                    isReply: true,
                    createdAt: new Date(),
                    weixinCreatedAt: new Date()
                });
            }
        });

        return new Promise(function(resolve){
            let sessionId = session.id;
            let messageId = message.id;
            resolve({req, sessionId, messageId});
        });
    });
}

function updateMemberInfo(params){
    memberDb.update({
        sessionId: params.sessionId,
        lastMessageId: params.messageId
    }, {where: {id: params.req.member.id}}).then(function(){
        debug('record message log done !');
    });
}