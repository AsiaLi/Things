/**
 * Created by Aix on 2016/8/25 0025.
 */

'use strict';

var debug = require('debug')('service:middleware[FollowEvent]');

const FOLLOW_EVENT_SUBSCRIBE = 'subscribe';
const FOLLOW_EVENT_UNSUBSCRIBE = 'unsubscribe';
const MSGTYPE = 'event';

class FollowEvent extends BaseEvent{
    constructor(req){
        super(req);
    }

    handle(callback){
        var that = this;
        if(FOLLOW_EVENT_SUBSCRIBE === this.eventType){
            this.getResponseRule({
                ownerId: this.ownerId,
                type: ruleDb.FOLLOW_TYPE
            }, function(rule){
                var respXmlStr = '';
                if(rule){
                    respXmlStr = that.buildResponseToWeixinUser(rule);
                }
                callback.call(that, respXmlStr);
            });
        }else{
            debug('用户取消关注');
            memberDb.update({
                updateTime: new Date(),
                isSubscribed: false,
                status: 0
            }, {id: this.req.member.id });
            callback('');
        }
    }

    getResponseRule(where, callback){
        var that = this;
        ruleDb.Rule.findOne({
            where: where
        }).then(function(rule){
            if(rule){
                that.formatReplyRule(rule, callback);
            }else{
                callback('');
            }
        });
    }
}


module.exports = function (req, res, next){
    if(!req.shouldProcessMessage){
        next();
        return;
    }
    if(MSGTYPE === req.message.msgtype && [FOLLOW_EVENT_SUBSCRIBE, FOLLOW_EVENT_UNSUBSCRIBE].indexOf(req.message.event) >= 0){
        debug('handle FollowEvent');
        new FollowEvent(req).handle(function(respStr){
            res.end(respStr);
        });
    }else{
        next();
    }
};