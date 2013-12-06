
// Example server host for Playbill

var express = require('express'),
    http = require('http'),
    path = require('path'),
    Playbill = require('../');

var app = express(),
    playbill = new Playbill({
        filePath: path.join(__dirname, 'posts'),
        perPage: 100
    });

// all environments
app.set('port', process.env.PORT || 8080);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.logger('dev'));
app.use(app.router);
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use('/', playbill.app);

// development only
if (app.get('env') !== 'production') {
    app.use(express.errorHandler());
}

if (!module.parent) {
    var server = http.createServer(app);

    server.listen(app.get('port'), function () {
        console.log('Playbill server listening on port ' + app.get('port'));
    });
}

module.exports = app;
