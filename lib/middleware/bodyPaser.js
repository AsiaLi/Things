/**
 * Created by Asia on 2016/10/03.
 */

'use strict';

var concat = require('concat-stream');
var debug = require('debug')('service:middleware[bodyPaser]');

module.exports = function (req, res, next){
	req.pipe(concat(function(data){
		req.body = data;
		next();
	}));
};
