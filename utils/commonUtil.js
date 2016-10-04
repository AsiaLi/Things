/**
 * Created by Aix on 2016/8/25 0025.
 */

"use strict";

module.exports = {
    isEmptyObject: function(obj){
        for(var i in obj){
            return false;
        }
        return true;
    },
    isFunction: function(func){
        return typeof func === 'function';
    },
    stringToXml: function(xml){
        //解析微信的xml，且将所有的标签小写化
        if (!xml || typeof xml != 'string') return {};
        var re = {};
        xml = xml.replace(/^<xml>|<\/xml>$/g, '');
        var ms = xml.match(/<([a-z0-9]+)>([\s\S]*?)<\/\1>/ig);
        if (ms && ms.length > 0)
        {
            ms.forEach( t => {
                let ms = t.match(/<([a-z0-9]+)>([\s\S]*?)<\/\1>/i);
                let tagName = ms[1].toLowerCase();
                let cdata = ms[2] || '';
                cdata = cdata.replace(/^\s*<\!\[CDATA\[\s*|\s*\]\]>\s*$/g,'');
                re[tagName] = cdata;
            });
        }
        return re;
    },
    easlog: function(title, msg){
        console.log(`[start]>>>>>>>>>>>>>>>${title}<<<<<<<<<<<<<<<<<<[start]`);
        console.log(msg);
        console.log(`[end]>>>>>>>>>>>>>>>${title}<<<<<<<<<<<<<<<<<<[end]`);
    },
    SyncCycleOutletHandler: class{
        constructor(array){
            this.queue = array;
            this.status = true;
            if(!this._checkQueue()){
                throw new Error('只处理函数');
            }
        }
        _checkQueue(){
            for(var func of this.queue){
                if(!isFunction(func)) return false;
            }
            return true;
        }
    }
};