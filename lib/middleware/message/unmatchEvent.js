/**
 * Created by Aix on 2016/8/25 0025.
 */

'use strict';

var debug = require('debug')('service:middleware[UnmatchEvent]');

var ruleDb = require('models/weixin/rule');
var BaseEvent = require('./BaseEvent');

/**
 * 处理托管消息
 */
class UnmatchEvent extends BaseEvent{
    constructor(req){
        super(req);
    }

    handle(callback){
        var that = this;
        this.getResponseRule({
            ownerId: this.ownerId,
            type: ruleDb.UNMATCH_TYPE
        }, function(rule){
            if (rule) {
                callback(that.buildResponseToWeixinUser(rule));
            } else {
                callback(null);
            }
        });
    }
}


module.exports = function(){
    return function (req, res, next){
        if(!req.unmatchedMessage){
            res.end();
            return;
        }
        debug('handle UnmatchEvent');
        new UnmatchEvent(req).handle(function(respStr){
            if(respStr){
                res.send(respStr);
            }else{
                res.end();
            }
            debug('========end message middleware=================');
        });
    }
};