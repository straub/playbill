
var Playbill = require('../'),
    path = require('path'),
    app = require('../examples/server');

var request = require('./support/http')(app);

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
                .get(url+'index.json')
                .expect('Content-Type', /json/)
                .expect(200, done);
            });
            it('response should be an object', function (done) {
                request
                .get(url+'index.json')
                .end(function (err, res) {
                    if (err) return done(err);

                    res.body.should.be.an('object');

                    done();
                });
            });
            it('response should have posts', function (done) {
                request
                .get(url+'index.json')
                .end(function (err, res) {
                    if (err) return done(err);

                    res.body.posts.should.be.an('array');
                    res.body.posts.should.not.be.empty;
                    res.body.total.should.be.a('number');

                    done();
                });
            });
            it('response should have published posts', function (done) {
                request
                .get(url+'index.json')
                .end(function (err, res) {
                    if (err) return done(err);

                    res.body.posts.should.contain.an.item.with.property('title', 'Test Post');
                    res.body.posts.should.contain.an.item.with.property('title', 'Test Post 2');
                    res.body.posts.should.contain.an.item.with.property('title', 'Test Post Foo');
                    res.body.posts.should.contain.an.item.with.property('title', 'Test Post Bar');
                    res.body.posts.should.contain.an.item.with.property('title', 'Test Post Past Publication');

                    done();
                });
            });
            it('response should not have unpublished posts', function (done) {
                request
                .get(url+'index.json')
                .end(function (err, res) {
                    if (err) return done(err);

                    res.body.posts.should.not.contain.an.item.with.property('title', 'Test Post Unpublished');
                    res.body.posts.should.not.contain.an.item.with.property('title', 'Test Post Future Publication');

                    done();
                });
            });
            it('response should have posts in order of publication, creation', function (done) {
                request
                .get(url+'index.json')
                .end(function (err, res) {
                    if (err) return done(err);

                    res.body.posts.forEach(function (post, i, posts) {
                        if (i < 1) return;

                        var postDate = new Date(post.published),
                            prev = posts[i-1],
                            prevDate = new Date(prev.published);

                        postDate.should.be.at.most(prevDate);
                    });

                    done();
                });
            });
            it('response should have page number', function (done) {
                request
                .get(url+'index.json')
                .end(function (err, res) {
                    if (err) return done(err);

                    res.body.currentPage.should.be.a('number');
                    res.body.currentPage.should.equal(1);

                    done();
                });
            });
        });
    });describe('GET /rss.xml', function () {
        var url = '/rss.xml';

        it('should respond with xml', function (done) {
            request
            .get(url)
            .expect('Content-Type', /xml/)
            .expect(200, done);
        });
    });
    describe('GET /p:page/', function () {
        var url = '/p1/',
            badUrl = '/p0/',
            tooHighUrl = '/p100000/';

        describe('html', function () {
            it('should redirect to index', function (done) {
                request
                .get(url)
                .expect('Location', '..')
                .expect(301, done);
            });
        });
        describe('json', function () {
            it('should respond with json', function (done) {
                request
                .get(url+'.json')
                .expect('Content-Type', /json/)
                .expect(200, done);
            });
            it('should redirect to index with query string', function (done) {
                request
                .get(url+'?type=json')
                .expect('Location', '..?type=json')
                .expect(301, done);
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
