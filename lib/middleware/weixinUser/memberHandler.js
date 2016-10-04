/**
 * Created by Aix on 2016/9/13 0013.
 * 根据消息创建会员
 * 如果用户对应的会员不存在则进行创建，该Handler必须置于WeixinUserHandler之后
 */

'use strict';

var crypto = require('crypto');
var moment = require('moment');
var debug = require('debug')('service:middleware[MemberHandler]');

var settings = require('settings');

var socialAccountDb = require('models/member/socialAccount');
var memberHasSocialAccountDb = require('models/member/memberHasSocialAccount').MemberHasSocialAccount;
var memberDb = require('models/member/member').Member;
var MemberGradeDb = require('models/member/memberGrade').MemberGrade;
var WebAppUserDb = require('models/member/memberWebappUser').WebAppUser;

module.exports = function(){
    return function(req, res, next){
        if(!req.shouldProcessMessage){
            next();
        }else{
            debug('start MemberHandler...');
            var weixinUserName = req.weixinUser.username;
            var weappId = req.userProfile.webappId;
            var token = crypto.createHash('md5').update(`${weappId}_${weixinUserName}`).digest('hex');
            var isForTest = settings.MODE === 'develop' || weixinUserName.indexOf('pc-weixin-user') === 0 || weixinUserName.length < 16;
            socialAccountDb.SocialAccount.findAll({where: {
                openid: weixinUserName,
                webappId: weappId
            }}).then(function(socialAccounts){
                var callback = function(memberId, socialAccount){
                    if(memberId){
                        getMemberByMemberId(memberId).then(function(member){
                            req.member = member;
                            next();
                        });
                    }else{
                        createMember(socialAccount).then(function(member){
                            WebAppUserDb.create({
                                token: member.id,
                                webappId: socialAccount.webappId,
                                memberId: member.id,
                                createdAt: new Date()
                            });

                            memberHasSocialAccountDb.create({
                                accountId: socialAccount.id,
                                memberId: member.id,
                                webappId: socialAccount.webappId,
                                createdAt: new Date()
                            });

                            member.isNew = true;
                            req.member = member;
                            next();
                        });
                    }
                };
                if(socialAccounts && socialAccounts.length > 0){
                    getMemberBySocialAccount(socialAccounts[0]).then(callback);
                }else{
                    socialAccountDb.SocialAccount.create({
                        webappId: weappId,
                        openid: weixinUserName,
                        token: token,
                        platform:socialAccountDb.SOCIAL_PLATFORM_WEIXIN,
                        isForTest: isForTest,
                        createdAt: new Date()
                    }).then(function(socialAccount){
                        callback(null, socialAccount);
                    });
                }
            });
        }
    };
};

function getMemberBySocialAccount(socialAccount){
    return memberHasSocialAccountDb.findOne({where: {
        accountId: socialAccount.id
    }}).then(function(result){
       return new Promise(function(resolve){
           resolve(result.memberId, socialAccount)
       });
    });
}

function getMemberByMemberId(memberId){
    return memberDb.findOne({where: {
        id: parseInt(memberId)
    }}).then(function(member){
        var oldStatus = member.status;
        member.isSubscribed = true;
        member.status = 1;
        if(oldStatus === 2){
            member.createdAt = new Date();
        }
        return member.save().then(function(member){
            member.isNew = oldStatus === 2;
            return new Promise(function(resolve){
                resolve(member);
            });
        });
    });
}

function createMember(socialAccount){
    return MemberGradeDb.findOne({
        where: {
            webappId: socialAccount.webappId,
            isDefaultGrade: true
        }
    }).then(function(memberGrade) {
        var token = generateMemberToken(socialAccount.webappId, socialAccount);
        return memberDb.create({
            webappId: socialAccount.webappId,
            token: token,
            gradeId: memberGrade.id,
            integral: 0,
            isSubscribed: true,
            status: 1,
            updateTime: new Date("2016-01-01")
        }).then(function(member) {
            return new Promise(function(resolve) {
                resolve(member);
            });
        });
    });
}

function generateMemberToken(webappId, socialAccount) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var maxPos = chars.length;
    var noceStr = "";
    for (var i = 0; i < 5; i++) {
        noceStr += chars.charAt(Math.floor(Math.random() * maxPos));
    }
    noceStr = noceStr + socialAccount.id;
    var dataStr = moment().format('YYYYMMDD');
    return `${webappId}${socialAccount.platform}${dataStr}${noceStr}`;

}