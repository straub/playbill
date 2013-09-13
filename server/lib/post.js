
var  _ = require('underscore');

function Post(data, options) {
    var self = this;
    data = data || {};
    this.options = options = options || {};

    _.extend(this, data);

    _.each(Post.liftMeta, function (key) {
        self[key] = data.meta[key];
    });
}

Post.liftMeta = ['title','created','published','author'];

Post.safeKeys = ['slug','title','created','published','author','meta','content','html'];

Post.prototype.toJSON = function toJSON() {
    var safePost = _.pick(this, Post.safeKeys);
    return safePost;
};

Post.prototype.get = function get(key) {
    return this[key];
};

Post.prototype.set = function set(key, value) {
    this[key] = value;
};

module.exports = Post;
