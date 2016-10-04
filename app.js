
'use strict';

var express = require('express');
var path = require('path');
var debug = require('debug')('settings: ---');

var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var swig = require('swig');

var app = express();
var settings = require('settings');
var routes = require('routes');

//连接mongo数据库
if(settings.MONGO){
    var mongoose = require('mongoose');
    mongoose.connect(settings.MONGO);
}else{
    console.error('you must config mongo settings!');
}

// view engine setup
app.engine('html', swig.renderFile);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

if (app.get('env') === 'develop') {
    swig.setDefaults({ cache: false });
    app.set('view cache', false);
} else {
    swig.setDefaults({ cache: 'memory' });
    app.set('view cache', true);
}

// uncomment after placing your favicon in /public
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'static')));

app.use(function(req, res, next) {
    if (req.body) {
        req.POST = req.body;
    }

    req.GET = null;
    if (req.query) {
        req.GET = req.query;
    }

    next();
});

//load dynamic middwares
var middwares = settings.MIDDLEWARES;
for(var middware of middwares){
    debug(middware);
    app.use(require(middware.replace(/\./g, '/')));
}


app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

module.exports = app;