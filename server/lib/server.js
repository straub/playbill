
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
    truncate = require('html-truncate'),
    RSS = require('rss'),
    Post = require('./post'),
    PostIndex = require('./post-index');

function Playbill(options) {
    var playbill = this;

    this.options = options = options || {};

    this.name = options.name || 'Playbill Blog';
    this.description = options.description || '';
    this.author = options.author || '';
    this.language = options.language || 'en';
    this.categories = options.categories || [];

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

    this.index = new PostIndex(_.extend({}, options, { playbill: this }));

    this.app = options.app || express();

    var locals = {
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
    };

    this.app.locals(locals);

    this._initApp(this.app);

    this.app.on('mount', function (parent) {
        // Copy locals to parent app.
        parent.locals(locals);

        // Copy parent views configuration.
        playbill.app.set('views', parent.get('views'));
        playbill.app.set('view engine', parent.get('view engine'));
    });

    return this;
}

Playbill.prototype._initApp = function _initApp(app) {
    var playbill = this;

    app.use(express.bodyParser());
    app.use(determineSiteURL);
    app.use(app.router);

    var getPostsRoute = _getPosts.call(playbill, app);
    var getFeedRoute = _getFeed.call(playbill, app);
    app.get('/', getPostsRoute);
    app.get('/rss.xml', getFeedRoute);
    app.get('/.:type(json)', getPostsRoute);
    app.get('/p:page([1-9][0-9]{0,})/', getPostsRoute);
    app.get('/p:page([1-9][0-9]{0,})/.:type(json)', getPostsRoute);

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

function determineSiteURL(req, res, next){
    var siteURL,
        scheme = req.header("X-Originally-SSL") ? "https" : (req.protocol || "http"),
        host = req.header("X-Forwarded-Host") || req.header("Host") || "",
        port = req.header("X-Forwarded-Port") || req.app.get("port"),
        hosts = host.split(/, ?/);

    if (hosts.length > 1) {
        host = hosts[-1];
        /*if(!/^http/.test(host)){
            var protocol = hosts[0].match(/(^https?:\/\/)/)[0];
            host = protocol + host;
        }*/
    }

    if (!host) {
        host = hostname || "localhost";
        if (port) {
            if (!((scheme === "https" && port === 443) || (scheme !== "https" && port === 80))) {
                host += ":"+port;
            }
        }
    }

    host = (scheme === "https" ? "https://" : "http://") + host;

    res.locals.siteURL = siteURL = host + "/";

    return next ? next() : siteURL;
}

Playbill.prototype.listPosts = function listPosts(options) {
    var playbill = this,
        limit,
        offset,
        total;

    options = options || {};

    return when(options)
    .then(function (options) {
        options.page = options.page || 1;
        options.perPage = options.perPage || playbill.perPage;

        limit = options.perPage;
        offset = options.perPage * (options.page - 1);
    })
    .then(function () {
        return playbill.index.init();
    })
    .then(function (index) {
        return index.posts;
    })
    .then(function (posts) {
        total = posts.length;

        function postPublishedFilter(post, i, posts) {
            // If it's falsy, we can stop right now.
            if (!post.published) return false;

            // Else it should be a date and we check that it's now or past.
            return post.published <= (new Date());
        }

        // Apply filter options.
        posts = posts.filter(postPublishedFilter);

        // Apply sort options.
        posts = arrayQuery()
        .sort('published').date().desc()
        .sort('lastModified').date().desc()
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

            if (!posts.length) {
                var err = new Error('No posts found.');
                err.status = 404;
                return next(err);
            }

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

function _getFeed(app) {
    var playbill = this;

    var feed = new RSS({
        title: playbill.name,
        description: playbill.description,

        // These values are replaced in the context of the request.
        feed_url: 'PLACEHOLDER',
        site_url: 'PLACEHOLDER',

        author: playbill.author,
        language: playbill.language,
        categories: playbill.categories,
        ttl: 60 // 1 hour
    });

    return function getFeed(req, res, next) {

        // Clear feed items
        feed.items.length = 0;

        // Get our actual URL.
        var url = req.originalUrl;
        url = url.replace(/^\//, '');
        url = url.replace(/rss\.xml.*$/, '');
        var siteURL = res.locals.siteURL+url;

        feed.site_url = siteURL;
        feed.feed_url = siteURL+'rss.xml';

        var page = 1;

        playbill.listPosts({
            page: page
        })
        .then(function (data) {
            var posts = data.posts;

            if (!posts.length) {
                var err = new Error('No posts found.');
                err.status = 404;
                return next(err);
            }

            res.locals({
                listView: true,
                total: data.total,
                pages: Math.round(data.total/playbill.perPage),
                currentPage: page
            });

            var _render = nodefn.lift(res.render.bind(res));

            when.map(posts, function (post) {
                return _render(post.meta.view || playbill.defaultPostView, { post: post })
                .then(function (html) {
                    post.html = html;

                    return post;
                });
            })
            .then(function (posts) {
                _.each(posts, function (post) {
                    feed.item({
                        title:  post.title,
                        description: post.html,
                        url: siteURL+post.slug,
                        author: post.author || '', // Defaults to feed author property
                        date: post.published // any format that js Date can parse.
                    });
                });

                // Setting the appropriate Content-Type
                res.set('Content-Type', 'text/xml');

                // This feed can be cached for the length of its ttl.
                res.set('Cache-Control', 'public, max-age=' + (feed.ttl*60));

                res.send(feed.xml());
            });
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
            post.content = postHTML;
            return post;
        });
    });
};

Playbill.metaRegex = /^(---[\s\S]+)---/;

var promiseStat = nodefn.lift(fs.stat);

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
        if (post.meta.lastModified) {
            post.meta.lastModified = new Date(post.meta.lastModified);
        }
        return post;
    })
    .then(function (post) {
        if (!post.meta.lastModified && post.path) {
            return promiseStat(post.path)
            .then(function (stat) {
                post.meta.lastModified = stat.mtime;
                return post;
            });
        }
        return post;
    })
    .then(function (post) {
        if (post.meta.published === true) {
            post.meta.published = post.meta.lastModified;
        } else if (post.meta.published) {
            post.meta.published = new Date(post.meta.published);
        } else {
            post.meta.published = false;
        }

        return post;
    })
    .then(function (post) {
        _.each(Post.liftMeta, function (key) {
            post[key] = post.meta[key];
        });
        return post;
    });
};

Playbill.prototype._sanitizePost = function _sanitizePost(unsafePost) {
    return (unsafePost.toJSON ? unsafePost : new Post(unsafePost)).toJSON();
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

        playbill.index.init()
        .then(function (index) {
            return index.get(slug);
        })
        .then(function (post) {
            if (!post) {
                var err = new Error('Post not found.');
                err.status = 404;
                throw err;
            }
            return post;
        })
        .then(function (post) {
            // Don't cache unpublished posts.
            if (!post.published) res.set('Cache-Control', 'no-cache');

            return post;
        })
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
