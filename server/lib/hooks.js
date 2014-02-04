
/*
    Based on hooks-js (https://github.com/bnoguchi/hooks-js),
    but with promise-style async behavior provided by when.
*/

var when = require('when'),
    slice = Array.prototype.slice;

module.exports = {
    hook: function (name, fn) {
        if (arguments.length === 1 && typeof name === 'object') {
            for (var k in name) { // `name` is a hash of hookName->hookFn
                this.hook(k, name[k]);
            }
            return this;
        }

        var proto = this.prototype || this,
            pres = proto._pres = proto._pres || {},
            posts = proto._posts = proto._posts || {};
        pres[name] = pres[name] || [];
        posts[name] = posts[name] || [];

        proto[name] = function () {
            var self = this,
                pres = this._pres[name],
                posts = this._posts[name],
                args = slice.call(arguments);

            return pipelineApply(pres, args, self)
            .then(function (args) {

                // Call original method with new args,
                // then move on to posts.
                var ret = fn.apply(self, args);

                return pipeline(posts, ret, self);
            });
        };

        proto[name]._hooked = true;

        return this;
    },

    pre: function (name, fn) {
        var proto = this.prototype || this,
            pres = proto._pres = proto._pres || {};

        this._lazySetupHooks(proto, name);

        (pres[name] = pres[name] || []).push(fn);

        return this;
    },
    post: function (name, fn) {
        var proto = this.prototype || this,
            posts = proto._posts = proto._posts || {};
        
        this._lazySetupHooks(proto, name);

        (posts[name] = posts[name] || []).push(fn);

        return this;
    },
    removePre: function (name, fnToRemove) {
        var proto = this.prototype || this,
            pres = proto._pres || (proto._pres || {});

        if (!pres[name]) return this;

        if (arguments.length === 1) {
            // Remove all pre callbacks for hook `name`
            pres[name].length = 0;
        } else {
            pres[name] = pres[name].filter(function (currFn) {
                return currFn !== fnToRemove;
            });
        }
        return this;
    },
    _lazySetupHooks: function (proto, methodName) {
        if (typeof proto[methodName]._hooked === 'undefined') {
            this.hook(methodName, proto[methodName]);
        }
    }
};

function pipelineApply(tasks, initialArgs, context) {
    var runTask = function(args, task) {
        return task.apply(context, args);
    };

    return when.all(initialArgs).then(function(args) {
        return when.reduce(tasks, function(args, task) {
            return runTask(args, task);
        }, args);
    });
}

function pipeline(tasks, initialArg, context) {
    var runTask = function(arg, task) {
        return task.call(context, arg);
    };

    return when(initialArg).then(function(arg) {
        return when.reduce(tasks, function(arg, task) {
            return runTask(arg, task);
        }, arg);
    });
}
