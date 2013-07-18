
var fs = require('graceful-fs'),
    _ = require('underscore'),
    path = require('path'),
    when = require('when'),
    nodefn = require('when/node/function'),
    promiseReadDir = nodefn.lift(fs.readdir),
    Post = require('./post');

function PostIndex(options) {
    var self = this;
    this.options = options = options || {};

    this.initPromise = undefined;

    this.posts = undefined;
    this._postsBySlug = Object.create(null);

    fs.watch(this.options.playbill.filePath, function () {
        self.reload();
    });
}

PostIndex.prototype.add = function add(post) {
    this.posts.push(post);
    this._postsBySlug[post.get('slug')] = post;
};

PostIndex.prototype.get = function get(slug) {
    return this._postsBySlug[slug];
};

PostIndex.prototype.init = function init(force) {
    var self = this;
    if (force || !this.initPromise) this.initPromise = this.populate();
    return this.initPromise;
};

PostIndex.prototype.reload = function reload() {
    return this.init(/* force */ true);
};

var promiseOpen = nodefn.lift(fs.open),
    promiseClose = nodefn.lift(fs.close);

function _isReadable(path) {
    var def = when.defer();
    fs.open(path, 'r', function (err) {
        def.resolve(!err);
        // FIXME: Do I need to close this?
    });
    return def.promise;
}

PostIndex.prototype.populate = function populate() {
    var self = this,
        playbill = this.options.playbill;

    return promiseReadDir(playbill.filePath)
    .then(function (paths) {
        // Filter out paths that don't have our file extension.
        return _.filter(paths, function (filename) {
            return playbill.extRegex.test(filename);
        });
    })
    .then(function (paths) {
        // A promise to check readability for every path.
        return when.all(_.map(paths, function (filename) {
            return _isReadable(path.join(playbill.filePath, filename));
        }))
        .then(function (postsReadable) {
            // Filter out paths that aren't readable to our process.
            return _.filter(paths, function (file, index) {
                return postsReadable[index];
            });
        });
    })
    .then(function (paths) {
        // Load all posts that weren't filtered out above.
        return when.all(_.map(paths, function (filename) {
            return playbill._loadPost(filename.replace(playbill.extRegex, ''));
        }));
    })
    .then(function (rawPosts) {
        // Parse loaded posts.
        return when.all(_.map(rawPosts, function (rawPost) {
            return playbill._parsePost(rawPost);
        }));
    })
    .then(function (posts) {
        return _.map(posts, function (post) {
            return new Post(post);
        });
    })
    .then(function (posts) {
        self.posts = posts;
        _.each(posts, function (post) {
            self._postsBySlug[post.get('slug')] = post;
        });

        return self;
    });
};

module.exports = PostIndex;
