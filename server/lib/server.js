
// Playbill Express Server

var express = require('express'),
    marked = require('marked'),
    _ = require('underscore'),
    fs = require('graceful-fs'),
    path = require('path'),
    when = require('when'),
    apply = require('when/apply'),
    nodefn = require('when/node/function'),
    yaml = require('js-yaml'),
    arrayQuery = require('array-query'),
    truncate = require('html-truncate');

function Playbill(options) {
    this.options = options = options || {};
    this.filePath = options.filePath || path.join(process.cwd(), 'posts');
    this.ext = options.ext || '.md';
    this.extRegex = new RegExp('\\'+this.ext+'$', 'i');

    this.perPage = options.perPage || 10;

    this.defaultPostView = options.defaultPostView || 'post';
    this.defaultWrapperView = options.defaultWrapperView || 'wrapper';
    this.defaultListView = options.defaultListView || 'list';

    this.markedOptions = _.extend({}, {
        breaks: true,
        smartLists: true
    }, options.markedOptions);

    this.client = options.client && typeof options.client === 'string' ?
        options.client :
        true;

    this.app = options.app || express();

    if (options.views) this.app.set('views', options.views);
    if (options.viewEngine) this.app.set('view engine', options.viewEngine);

    this.app.locals({
        truncate: truncate,

        // listView is false unless overridden later.
        listView: false,
        // prevent errors by defining these,
        // they will be overridden later.
        post: {},
        posts: [],
        total: 0,
        pages: 0,
        currentPage: 0
    });

    this.init(this.app);

    return this;
}

Playbill.prototype.init = function init(app) {
    var playbill = this;

    app.disable('x-powered-by');
    app.use(express.bodyParser());
    app.use(app.router);

    var getPostsRoute = _getPosts.call(playbill, app);
    app.get('/', getPostsRoute);
    app.get('/.:type(json)', getPostsRoute);
    app.get('/p:page(\\d+)/', getPostsRoute);
    app.get('/p:page(\\d+)/.:type(json)', getPostsRoute);

    var getPostRoute = _getPost.call(playbill, app);
    app.get('/:slug([\\w-]+)', getPostRoute);
    app.get('/:slug([\\w-]+).:type(json)', getPostRoute);

    if (playbill.client) {
        var clientPath = typeof playbill.client === 'string' ? playbill.client : '/playbill.js';
        app.get(clientPath, function (req, res) {
            res.sendfile('client.js', { root: path.join(__dirname, '../../client/lib') });
        });
    }
};

var promiseReadDir = nodefn.lift(fs.readdir),
    promiseOpen = nodefn.lift(fs.open),
    promiseClose = nodefn.lift(fs.close);

function _isReadable(path) {
    var def = when.defer();
    fs.open(path, 'r', function (err) {
        def.resolve(!err);
        // FIXME?: Do I need to close this?
    });
    return def.promise;
}

Playbill.prototype.listPosts = function listPosts(options) {
    var playbill = this;

    options = options || {};
    options.page = options.page || 1;
    options.perPage = options.perPage || playbill.perPage;

    var limit = options.perPage,
        offset = options.perPage * (options.page - 1),
        total;

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
        total = posts.length;

        // Apply query options.
        posts = arrayQuery()
        .sort('created').date().desc()
        .sort('title')
        .on(posts);

        // Replace broken array-query .offset() implementation.
        posts = posts.slice(offset, limit ? offset+limit : undefined);

        return posts;
    })
    .then(function (unsafePosts) {
        // Sanitize parsed posts.
        return when.all(_.map(unsafePosts, function (unsafePost) {
            return playbill._sanitizePost(unsafePost);
        }));
    })
    .then(function (posts) {
        return {
            total: total,
            posts: posts
        };
    });
};

function _getPosts(app) {
    var playbill = this;

    return function getPosts(req, res, next) {
        var type = req.param('type') || 'html',
            page = parseInt(req.param('page'), 10) || 1;

        playbill.listPosts({
            page: page
        })
        .then(function (data) {
            var posts = data.posts;

            res.locals({
                listView: true,
                total: data.total,
                pages: Math.round(data.total/playbill.perPage),
                currentPage: page
            });

            switch (type) {
                case "json":
                    var _render = nodefn.lift(res.render.bind(res));

                    when.map(posts, function (post) {
                        return _render(post.meta.view || playbill.defaultPostView, { post: post })
                        .then(function (html) {
                            post.html = html;

                            return post;
                        });
                    })
                    .then(function (posts) {
                        return res.send(200, { posts: posts, total: res.locals.total, pages: res.locals.pages, currentPage: page });
                    })
                    .otherwise(next);
                    break;
                default:
                    res.render(playbill.defaultWrapperView, { posts: posts });
                    break;
            }
        })
        .otherwise(function (err) {
            next(err);
        });
    };
}

Playbill.prototype._path = function _path(slug) {
    var playbill = this;
    return path.join(playbill.filePath, slug + playbill.ext);
};

var promiseReadFile = nodefn.lift(fs.readFile);

Playbill.prototype._loadPost = function _loadPost(slug) {
    var playbill = this,
        path = playbill._path(slug);
    return promiseReadFile(path, 'utf8')
    .then(function (string) {
        return {
            slug: slug,
            path: path,
            raw: string
        };
    });
};

var promiseMarked = nodefn.lift(marked);

Playbill.prototype._parsePost = function _parsePost(rawPost) {
    var playbill = this;

    return when(rawPost)
    .then(function (rawPost) {
        return playbill._parseMeta(rawPost);
    })
    .then(function (post) {
        return promiseMarked(post.raw, playbill.markedOptions)
        .then(function (postHTML) {
            post.html = postHTML;
            return post;
        });
    });
};

Playbill.metaRegex = /^(---[\s\S]+)---/;

var promiseStat = nodefn.lift(fs.stat);

Playbill.liftMeta = ['title','created'];

Playbill.prototype._parseMeta = function _parseMeta(post) {
    var playbill = this;

    return when(post)
    .then(function (post) {
        post.meta = {};

        var metaMatch = post.raw.match(Playbill.metaRegex);
        if (metaMatch && metaMatch.length > 1) {
            post.meta = metaMatch[1];

            try{
                post.meta = yaml.safeLoad(post.meta);
            } catch(e) {
                console.error(e);
                post.meta = {};
            }

            post.raw = post.raw.replace(Playbill.metaRegex, '');
        }

        return post;
    })
    .then(function (post) {
        if (post.meta.created) {
            post.meta.created = new Date(post.meta.created);
        }
        return post;
    })
    .then(function (post) {
        if (!post.meta.created && post.path) {
            return promiseStat(post.path)
            .then(function (stat) {
                post.meta.created = stat.ctime;
                return post;
            });
        }
        return post;
    })
    .then(function (post) {
        _.each(Playbill.liftMeta, function (key) {
            post[key] = post.meta[key];
        });
        return post;
    });
};

Playbill.safeKeys = ['slug','title','created','meta','html'];

Playbill.prototype._sanitizePost = function _sanitizePost(unsafePost) {
    var safePost = _.pick(unsafePost, Playbill.safeKeys);
    return safePost;
};

Playbill.prototype.fetchPost = function fetchPost(slug) {
    var playbill = this;

    return playbill._loadPost(slug)
    .then(function (rawPost) {
        return playbill._parsePost(rawPost);
    })
    .then(function (unsafePost) {
        return playbill._sanitizePost(unsafePost);
    });
};

function _getPost(app) {
    var playbill = this;

    return function getPost(req, res, next) {
        var slug = req.param('slug'),
            type = req.param('type');

        playbill.fetchPost(slug)
        .then(function (post) {
            switch (type) {
                case "json":
                    nodefn.call(res.render.bind(res), post.meta.view || playbill.defaultPostView, { post: post })
                    .then(function (html) {
                        post.html = html;

                        return res.send(200, post);
                    })
                    .otherwise(next);
                    break;
                default:
                    res.render(post.meta.wrapper ? post.meta.wrapper : playbill.defaultWrapperView, { post: post });
                    break;
            }
        })
        .otherwise(function (err) {
            if (err.code === 'ENOENT') {
                err.status = 404;
            }
            return next(err);
        });
    };
}

module.exports = Playbill; 
