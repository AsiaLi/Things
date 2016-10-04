/**
 * Created by Aix on 2016/8/25 0025.
 */

'use strict';

var debug = require('debug')('service:middleware[KeywordEvent]');

var ruleDb = require('models/weixin/rule');
var BaseEvent = require('./BaseEvent');

const MSGTYPE = 'text';

/**
 * 暂时不考虑文本消息中的链接token问题
 */
class KeywordEvent extends BaseEvent{
    constructor(req){
        super(req);
        this.keyword = this.message.content.toLowerCase();
        debug("keyword: %s", this.keyword);
    }

    handle(callback){
        var that = this;
        this.getResponseRule(function(rule){
            var respXmlStr = '';
            if(rule){
                that.formatReplyRule(rule, function(rule){
                    respXmlStr = that.buildResponseToWeixinUser(rule);
                    callback(respXmlStr);
                });
            }else{
                callback(respXmlStr);
            }
        });
    }

    getResponseRule(callback){
        var that = this;
        ruleDb.Rule.findAll({
            where: {
                ownerId: that.ownerId,
                type: ruleDb.TEXT_TYPE
            },
            order: 'createdAt DESC'
        }).then(function(rules){
            //允许部分匹配的列表
            var pattern2ruleSubMatch = {};
            var pattern2ruleSubMatchKey = [];
            //完全匹配的规则列表
            var pattern2ruleNotSubMatch = {};
            var pattern2ruleNotSubMatchKey = [];
            for(var rule of rules){
                try{
                    var patterns, pattern;
                    if(!rule.patterns) continue;

                    for(patterns of JSON.parse(rule.patterns)){
                        pattern = patterns.keyword;
                        var isSubMatch = parseInt(patterns.type);
                        if(!pattern || '' === patterns){
                            continue;
                        }
                        if(1 === isSubMatch){
                            pattern2ruleSubMatch[pattern.trim().toLowerCase()] = rule;
                            pattern2ruleSubMatchKey.push(pattern.trim().toLowerCase());
                        }else{
                            pattern2ruleNotSubMatch[pattern.trim().toLowerCase()] = rule;
                            pattern2ruleNotSubMatchKey.push(pattern.trim().toLowerCase());
                        }
                    }
                }catch(e){
                    debug(e);
                    patterns = rule.patterns.split('|');
                    for(pattern of patterns){
                        if('' === pattern){
                            continue;
                        }
                        pattern2ruleNotSubMatch[pattern.trim().toLowerCase()] = rule;
                        pattern2ruleNotSubMatchKey.push(pattern.trim().toLowerCase());
                    }
                }
            }
            //先处理完全匹配
            var tmpRule, tmpPattern, isDone = false;
            for(tmpPattern of pattern2ruleNotSubMatchKey){
                if(tmpPattern == that.keyword){
                    tmpRule = pattern2ruleNotSubMatch[tmpPattern];
                    tmpRule.patterns = tmpPattern; //记录此次命中的关键词
                    callback(tmpRule);
                    return;
                }
            }
            //处理部分匹配
            for(tmpPattern of pattern2ruleSubMatchKey){
                if(that.keyword.includes(tmpPattern)){
                    tmpRule = pattern2ruleSubMatch[tmpPattern];
                    tmpRule.patterns = tmpPattern;  //记录此次命中的关键词
                    callback(tmpRule);
                    return;
                }
            }
            callback('');
        });
    }
}


module.exports = function(){
    return function (req, res, next){
        if(!req.shouldProcessMessage){
            next();
        } else {
            if(MSGTYPE === req.message.msgtype){
                debug('handle KeywordEvent');
                new KeywordEvent(req).handle(function(respStr){
                    if(respStr){
                        res.send(respStr);
                    }else{
                        req.unmatchedMessage = true;
                        next();
                    }
                });
            }else{
                next();
            }
        }
    };
};