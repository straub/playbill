
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
                    res.body.total.should.be.a('number');

                    done();
                });
            });
            it('response should have page number', function (done) {
                request
                .get(url+'.json')
                .end(function (err, res) {
                    if (err) return done(err);

                    res.body.currentPage.should.be.a('number');
                    res.body.currentPage.should.equal(1);

                    done();
                });
            });
        });
    });
    describe('GET /p:page/', function () {
        var url = '/p1/',
            badUrl = '/p0/',
            tooHighUrl = '/p100000/';

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
                    res.body.total.should.be.a('number');

                    done();
                });
            });
            it('response should have page number', function (done) {
                request
                .get(url+'.json')
                .end(function (err, res) {
                    if (err) return done(err);

                    res.body.currentPage.should.be.a('number');
                    res.body.currentPage.should.equal(1);

                    done();
                });
            });
        });

        it('should not find posts at bad url', function (done) {
            request
            .get(badUrl)
            .expect(404, function (err) { done(); });
        });
        it('should not find posts at too high page number', function (done) {
            request
            .get(tooHighUrl)
            .expect(404, function (err) { done(); });
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
