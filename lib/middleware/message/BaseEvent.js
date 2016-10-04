/**
 * Created by Aix on 2016/8/25 0025.
 */

'use strict';

var debug = require('debug')('service: middleware[BaseEvent]');

var settings = require('settings');

var WxMsgCrypt = require('lib/WxMsgCrypt');

/**
 * 作为消息事件处理的基类，提供数据初始化、格式化、统一查询数据...
 */
class BaseEvent{
    constructor(req){
        this.req = req;
        this.isFromClient = req.isFromClient;
        this.userProfile = req.userProfile;
        this.ownerId = req.webappOwnerId;
        this.message = req.message;
        this.fromUserName = this.message.fromusername;
        this.toUserName = this.message.tousername;
        this.msgType = this.message.msgtype;
        this.eventType = this.message.event;
    }

    handle(callback){
        debug('没有事件要处理');
        callback('');
    }

    getResponseRule(where, callback){
        var that = this;
        ruleDb.Rule.findAll({
            where: where
        }).then(function(rules){
            if(rules && rules.length > 0 && rules[0].isActive()){
                that.formatReplyRule(rules[0], callback);
            }else{
                callback('');
            }
        });
    }

    formatReplyRule(rule, callback){
        var that = this;
        if(!rule.answer){
            callback('');
            return;
        }
        var answers = JSON.parse(rule.answer);
        var answerData;
        if(ruleDb.FOLLOW_TYPE === rule.type){//关注自动回复只有一条，不需要随机回复
            answerData = answers;
        }else{//随机取一条进行回复
            var randomIndex = Math.floor(Math.random() * answers.length);
            answerData = answers[randomIndex];
        }
        if(answerData.type === 'news'){
            rule.materialId = parseInt(answerData.content);
            newsDb.News.findAll({where: {
                materialId: rule.materialId
            }}).then(function(newses){
                rule.newses = newses;
                callback(rule);
            });
        }else{
            rule.answer = answerData.content;
            //在末尾加入小尾巴内容
            tailDb.Tail.findOne({where: {
                ownerId: that.ownerId,
                isActive: true
            }}).then(function(tail){
                debug('=========tail================');
                debug(tail);
                if(tail){
                    rule.answer += tail.tail;
                }
                callback(rule);
            });
        }
    }

    buildResponseToWeixinUser(rule){
        var result = rule.isNews()? this._buildNewsResponseToWeixinUser(rule): this._buildTextResponseToWeixinUser(rule.answer);
        //记录给微信用户回复的消息
        var logEmitter = this.req.logEmitter;
        var logEventName = 'recordResp';
        var timer = setInterval(function(){
            if(logEmitter._events.recordResp){
                logEmitter.emit(logEventName, rule);
                clearInterval(timer);
            }
        }, 75);

        if(!this.isFromClient){
            //非模拟器需要加密回复的消息内容
            result = new WxMsgCrypt(
                settings.CONPONENT_INFO.token,
                settings.CONPONENT_INFO.encodingAESKey,
                settings.CONPONENT_INFO.appid
            ).encrypt(result);
        }
        return result;
    }

    _buildTextResponseToWeixinUser(content){
        var toUserName = this.toUserName;
        var fromUserName = this.fromUserName;
        var createTime = new Date().getTime();
        return `<xml>
	            <ToUserName><![CDATA[${fromUserName}]]></ToUserName>
	            <FromUserName><![CDATA[${toUserName}]]></FromUserName>
	            <CreateTime>${createTime}</CreateTime>
	            <MsgType><![CDATA[text]]></MsgType>
	            <Content><![CDATA[${content}]]></Content>
	            <FuncFlag>0</FuncFlag>
            </xml>`;
    }

    _buildNewsResponseToWeixinUser(rule){
        var that = this;
        var toUserName = this.toUserName;
        var fromUserName = this.fromUserName;
        var createTime = new Date().getTime();
        var respXmlBuffer = [];
        respXmlBuffer.push(`
            <xml>
	            <ToUserName><![CDATA[${toUserName}]]></ToUserName>
	            <FromUserName><![CDATA[${fromUserName}]]></FromUserName>
	            <CreateTime>${createTime}</CreateTime>
	            <MsgType><![CDATA[news]]></MsgType>
	            <ArticleCount>${rule.newses.length}</ArticleCount>
	            <Articles>
        `);
        for(var news of rule.newses){
            if(news.url.trim().length === 0){
                news.url = that._getDefaultNewsUrl();
            }
            //TODO 处理图文链接url和链接中的token
            //TODO 通过配置图文和文本自动带上用户昵称的帐号 ["weshop","weizoomjx"]
            var url = '';
            var host = that.req.userProfile.host;
            var picUrl = news.picUrl.indexOf('http') === -1? `http://${host}${news.picUrl}`: news.picUrl;
            var title = news.title;
            var desc = news.summary;
            respXmlBuffer.push(`
                <item>
                    <Title><![CDATA[${title}]]></Title>
                    <Description><![CDATA[${desc}]]></Description>
                    <PicUrl><![CDATA[${picUrl}]]></PicUrl>
            `);
            if(url.trim().length <= 0){
                respXmlBuffer.push(`
                    <Url><![CDATA[${url}]]></Url>
                `);
            }
            respXmlBuffer.push(`</item>`);
        }
        respXmlBuffer.push(`
                </Articles>
                <FuncFlag>1</FuncFlag>
            </xml>
        `);

        return respXmlBuffer.join('');
    }

    //TODO 处理默认链接
    _getDefaultNewsUrl(){
        return '';
    }

}


module.exports = BaseEvent;