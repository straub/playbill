
var Playbill = require('../'),
    path = require('path'),
    playbill = new Playbill({
        filePath: path.join(__dirname, '../examples/posts'),
        views: path.join(__dirname, '../examples/views'),
        viewEngine: 'ejs'
    }),
    request = require('./support/http')(playbill.app);

describe('HTTP', function () {

    describe('GET /', function () {
        var url = '/';

        describe('html', function () {
            it('should respond with html', function (done) {
                request
                .get(url)
                .expect('Content-Type', /html/)
                .expect(200, done);
            });
        });
        describe('json', function () {
            it('should respond with json', function (done) {
                request
                .get(url+'.json')
                .expect('Content-Type', /json/)
                .expect(200, done);
            });
            it('response should be an object', function (done) {
                request
                .get(url+'.json')
                .end(function (err, res) {
                    if (err) return done(err);

                    res.body.should.be.an('object');

                    done();
                });
            });
            it('response should have posts', function (done) {
                request
                .get(url+'.json')
                .end(function (err, res) {
                    if (err) return done(err);

                    res.body.posts.should.be.an('array');
                    res.body.posts.should.not.be.empty;

                    done();
                });
            });
        });
    });
    describe('GET /p:page/', function () {
        var url = '/p1/';

        describe('html', function () {
            it('should respond with html', function (done) {
                request
                .get(url)
                .expect('Content-Type', /html/)
                .expect(200, done);
            });
        });
        describe('json', function () {
            it('should respond with json', function (done) {
                request
                .get(url+'.json')
                .expect('Content-Type', /json/)
                .expect(200, done);
            });
            it('response should be an object', function (done) {
                request
                .get(url+'.json')
                .end(function (err, res) {
                    if (err) return done(err);

                    res.body.should.be.an('object');

                    done();
                });
            });
            it('response should have posts', function (done) {
                request
                .get(url+'.json')
                .end(function (err, res) {
                    if (err) return done(err);

                    res.body.posts.should.be.an('array');
                    res.body.posts.should.not.be.empty;

                    done();
                });
            });
        });
    });
    describe('GET /:slug', function () {
        var url = '/test';

        describe('html', function () {
            it('should respond with html', function (done) {
                request
                .get(url)
                .expect('Content-Type', /html/)
                .expect(200, done);
            });
        });
        describe('json', function () {
            it('should respond with json', function (done) {
                request
                .get(url+'.json')
                .expect('Content-Type', /json/)
                .expect(200, done);
            });
            it('response should not be empty', function (done) {
                request
                .get(url+'.json')
                .end(function (err, res) {
                    if (err) return done(err);

                    res.body.should.not.be.empty;

                    done();
                });
            });
            it('response should be an object', function (done) {
                request
                .get(url+'.json')
                .end(function (err, res) {
                    if (err) return done(err);

                    res.body.should.be.an('object');

                    done();
                });
            });
        });
    });
});
