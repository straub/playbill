
// Playbill Client

(function (name, dependencies, definition, context) {
    if (typeof context.define !== 'undefined' && context.define === 'function' && context.define.amd) { define(name, (dependencies || []), definition); }
    else { context[name] = definition.call(context, context.jQuery, context._, context.Backbone, context.when); }
})('Playbill', ['jquery','underscore','backbone','when'], function ($, _, Backbone, when) {

    var root = this;

    function Playbill(options) {
        this.options = options = options || {};

        this.base = options.base || '/';
        this.baseRegex = new RegExp('^'+this.base);

        this.started = false;
        this._hasPushState = root.history && root.history.pushState;

        this._currentlyLoaded = undefined;

        _.bindAll(this, '_checkUrl');
    }

    _.extend(Playbill.prototype, Backbone.Events);

    Playbill.prototype._request = function (options) {
        var playbill = this;

        if (options.url) {
            // Works around servers that deny requests to "files"
            // that start with a dot.
            options.url += /\/$/.test(options.url) ? '?type=json' : '.json';
        }

        return when($.ajax(_.extend({
            type: 'GET',
            dataType: 'json'
        }, options)));
    };

    Playbill.prototype.listPosts = function (options) {
        var playbill = this;

        options = options || {};
        options.page = options.page || 1;

        return playbill._request({
            url: playbill.base + (options.page !== 1 ? ('p'+options.page+'/') : '')
        });
    };

    Playbill.prototype.loadPost = function (slug) {
        var playbill = this;

        return playbill._request({
            url: playbill.base + encodeURIComponent(slug)
        });
    };

    Playbill.prototype.navigate = function (url) {
        var playbill = this;

        if (playbill._hasPushState) {
            root.history.pushState({}, root.document.title, url);

            playbill.loadUrl(url);
        } else {
            root.document.location.assign(url);
        }
    };

    Playbill.prototype.start = function () {
        var playbill = this;

        if (playbill.started) throw new Error('Playbill already started');

        playbill.started = true;
        playbill._currentlyLoaded = root.document.location.pathname;

        playbill._captureLinks();
        $(root).on('popstate', playbill._checkUrl);

        return playbill;
    };

    Playbill.prototype.stop = function () {
        var playbill = this;

        playbill.started = false;

        playbill._releaseLinks();
        $(root).off('popstate', playbill._checkUrl);

        return playbill;
    };

    Playbill.prototype._checkUrl = function (e) {
        var playbill = this;

        var path = root.document.location.pathname;

        if (playbill.baseRegex.test(path)) {
            playbill.loadUrl(path);
        }
    };

    Playbill.prototype.loadUrl = function (url) {
        var playbill = this;

        if (playbill._currentlyLoaded === url) return;
        playbill._currentlyLoaded = url;

        playbill.trigger('loading', url);

        return playbill._request({
            url: url
        })
        .then(function (data) {
            playbill.trigger('loaded', data, url);
        });
    };

    Playbill.prototype._captureLinks = function () {
        var playbill = this;

        $(root.document).on('click.playbill', 'a', function (e) {
            if (e.meta || e.ctrlKey) return; // Don't block user if they want to open a new tab.

            if (!(
                this.protocol === root.location.protocol &&
                this.hostname === root.location.hostname &&
                this.port === root.location.port
            )) return;

            var path = this.pathname.replace(/^([^\/])/,'/$1');

            if (path && playbill.baseRegex.test(path)) {
                e.preventDefault();
                
                playbill.navigate(path);
            }
        });
    };

    Playbill.prototype._releaseLinks = function () {
        $(root.document).off('click.playbill');
    };

    return Playbill;

}, (this || {}));
