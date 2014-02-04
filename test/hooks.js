
var Playbill = require('../'),
    path = require('path');

describe('hooks', function () {
    var playbill;

    beforeEach(function () {
        playbill = new Playbill({
            filePath: path.join(__dirname, '../examples/posts')
        });
    });

    var postSlug = 'future-published';

    describe('#_loadPost', function () {

        beforeEach(function () {
            playbill.pre('_loadPost', function (slug) {
                return [slug.replace('future','past')];
            })
            .post('_loadPost', function (rawPost) {
                rawPost.raw = '---\ntitle: Faux Title\npublished: !!bool false\n---\nFaux body.';
                return rawPost;
            });
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
        it('slug should be transformed by pre hook', function () {
            return playbill._loadPost(postSlug).should.eventually.have.property('slug', 'past-published');
        });
        it('raw should be transformed by post hook', function () {
            return playbill._loadPost(postSlug)
            .should.eventually.have.property(
                'raw',
                '---\ntitle: Faux Title\npublished: !!bool false\n---\nFaux body.'
            );
        });
    });

    describe('#_parsePost', function () {
        var parsedPost;

        beforeEach(function (done) {
            playbill.pre('_parsePost', function (rawPost) {
                rawPost.slug = rawPost.slug+'-bar';
                return [rawPost];
            })
            .post('_parsePost', function (post) {
                post.meta.foo = true;
                return post;
            });

            playbill._parsePost(playbill._loadPost(postSlug))
            .then(function (post) {
                parsedPost = post;
                done();
            })
            .otherwise(done);
        });

        it('should return a promise for an object', function () {
            return playbill._parsePost(playbill._loadPost(postSlug))
                .should.eventually.be.an('object');
        });
        it('should not be empty', function () {
            return parsedPost.should.not.be.empty;
        });
        it('slug should be transformed by post hook', function () {
            return parsedPost.should.have.property('slug', 'future-published-bar');
        });
        it('meta should be transformed by post hook', function () {
            return parsedPost.meta.should.have.property('foo', true);
        });
    });

    describe('#_parseMeta', function () {
        var parsedPost;

        beforeEach(function (done) {
            playbill
            .pre('_parseMetaExtra', function (post) {
                post.meta.title = 'Testy Test';
                return [post];
            })
            .post('_parseMeta', function (post) {
                post.meta.bar = true;
                return post;
            });

            playbill._parseMeta(playbill._loadPost(postSlug))
            .then(function (post) {
                parsedPost = post;
                done();
            })
            .otherwise(done);
        });

        it('should return a promise for an object', function () {
            return playbill._parseMeta(playbill._loadPost(postSlug)).should.eventually.be.an('object');
        });
        it('should not be empty', function () {
            return parsedPost.should.not.be.empty;
        });
        it('should have meta', function () {
            return parsedPost.should.have.property('meta');
        });
        it('title should be transformed by pre hook', function () {
            return parsedPost.meta.should.have.property('title', 'Testy Test');
        });
        it('meta should be transformed by post hook', function () {
            return parsedPost.meta.should.have.property('bar', true);
        });
    });
});
