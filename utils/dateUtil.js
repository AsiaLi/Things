/**
 * Created by Aix on 2016/8/25 0025.
 */

var moment = require('moment');

module.exports = {
    getCommonDateStr: function(){
        return moment().format('YYYY年 M月 D日 HH:mm');
    }
};