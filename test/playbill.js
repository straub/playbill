
var Playbill = require('../'),
    path = require('path');

describe('Playbill', function () {
    var playbill;

    beforeEach(function () {
        playbill = new Playbill({
            filePath: path.join(__dirname, '../examples/posts')
        });
    });

    it('should have properties', function () {
        return playbill.should.not.be.empty;
    });

    var postSlug = 'test';

    describe('#_loadPost', function () {
        it('should return a promise', function () {
            return playbill._loadPost(postSlug).should.have.property('then');
        });
        it('should return a promise for an object', function () {
            return playbill._loadPost(postSlug).should.eventually.be.an('object');
        });
        it('should have path', function () {
            return playbill._loadPost(postSlug).should.eventually.have.property('path');
        });
        it('should have raw', function () {
            return playbill._loadPost(postSlug).should.eventually.have.property('raw');
        });
    });

    describe('#_parsePost', function () {
        var parsedPost;

        beforeEach(function (done) {
            playbill._parsePost(playbill._loadPost(postSlug))
            .then(function (post) {
                parsedPost = post;
                done();
            })
            .otherwise(done);
        });

        it('should return a promise', function () {
            return playbill._parsePost(playbill._loadPost(postSlug)).should.have.property('then');
        });
        it('should return a promise for a object', function () {
            return parsedPost.should.be.an('object');
        });
        it('should not be empty', function () {
            return parsedPost.should.not.be.empty;
        });
        it('should have slug', function () {
            return parsedPost.should.have.property('slug');
        });
        it('should have meta', function () {
            return parsedPost.should.have.property('meta');
        });
        it('should have content', function () {
            return parsedPost.should.have.property('content');
        });
        it('should have path', function () {
            return parsedPost.should.have.property('path');
        });
        it('should have raw', function () {
            return parsedPost.should.have.property('raw');
        });
    });

    describe('#_parseMeta', function () {
        var parsedPost;

        beforeEach(function (done) {
            playbill._parseMeta(playbill._loadPost(postSlug))
            .then(function (post) {
                parsedPost = post;
                done();
            })
            .otherwise(done);
        });

        it('should return a promise', function () {
            return playbill._parseMeta(playbill._loadPost(postSlug)).should.have.property('then');
        });
        it('should return a promise for a object', function () {
            return parsedPost.should.be.an('object');
        });
        it('should not be empty', function () {
            return parsedPost.should.not.be.empty;
        });
        it('should have meta', function () {
            return parsedPost.should.have.property('meta');
        });
        it('should have meta with title', function () {
            return parsedPost.meta.should.have.property('title');
        });
        it('should have meta with created', function () {
            return parsedPost.meta.should.have.property('created');
        });
    });
});
