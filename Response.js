'use strict';
/**
 * @fileOverview Response.
 */

var EventEmitter = require('EventEmitter');
var push = Array.prototype.push;
var toString = Object.prototype.toString;
var on = EventEmitter.prototype.on;
var emit = EventEmitter.prototype.emit;

/**
 *
 * @param {Function} [wrapper]
 * @constructor
 * @requires EventEmitter
 * @extends EventEmitter
 */
function Response(wrapper) {
    EventEmitter.call(this);

    this.state = this.state;
    this.context = this.context;
    // TODO: Did not inline (target contains unsupported syntax [early])
    this.result = [];
    this.reason = this.reason;
    this.isResolved = this.isResolved;
    this.data = this.data;
    this.keys = this.keys;
    this.wrapped = this.wrapped;
    this.callback = this.callback;

    if (isFunction(wrapper)) {
        wrapper.call(this);
    }
}

/**
 * @type {Number}
 * @constant
 */
Response.STATE_PENDING = 0;

/**
 * @type {Number}
 * @constant
 */
Response.STATE_RESOLVED = 1;

/**
 * @type {Number}
 * @constant
 */
Response.STATE_REJECTED = -1;

/**
 *
 * @param {Response|*} [response]
 * @static
 */
Response.isResponse = function (response) {
    return response instanceof Response;
};

/**
 *
 * @example
 * var Response = require('Response');
 *
 * module.exports = Response.create();
 * module.exports instanceof Response; // true
 * module.exports.hasOwnProperty('resolve'); // false
 *
 * @param {Function} [wrapper]
 * @returns {Object}
 */
Response.create = function (wrapper) {
    Constructor.prototype = new Response(wrapper);
    return new Constructor();
};

/**
 * @param {...*} [results]
 * @static
 * @returns {Response}
 */
Response.resolve = function (results) {
    var response = new Response();

    response.state = 1;
    response.result = argsToArray.apply(null, arguments);
    response.isResolved = true;

    return response;
};

/**
 *
 * @param {*} reason
 * @static
 * @returns {Response}
 */
Response.reject = function (reason) {
    var response = new Response();

    response.state = -1;
    response.reason = toError(reason);

    return response;
};

/**
 *
 * @static
 * @returns {Queue}
 */
Response.queue = function () {
    return new Queue(argsToArray.apply(null, arguments));
};

/**
 *
 * @static
 * @returns {Queue}
 */
Response.strictQueue = function () {
    return new Queue(argsToArray.apply(null, arguments)).strict();
};

/**
 * @example
 * Response
 *  .fCall(fs.open, '/file.txt', 'r')
 *  .then(function (content) {});
 * @param {Function} method
 * @param {...*} args
 * @returns {Response}
 */
Response.fCall = function (method, args) {
    var response = new Response();

    return response.invoke.apply(response, arguments);
};

/**
 *
 * @param {Function} method
 * @param {Array} [args]
 * @returns {Response}
 */
Response.fApply = function (method, args) {
    var response = new Response();
    var arg = toArray(args);

    arg.unshift(method);

    return response.invoke.apply(response, arg);
};

inherits(Response, new EventEmitter());

/**
 * @type {string}
 * @default 'ready'
 */
Response.prototype.EVENT_READY = 'ready';

/**
 * @type {string}
 * @default 'progress'
 */
Response.prototype.EVENT_PROGRESS = 'progress';

/**
 * @type {string}
 * @default 'resolve'
 */
Response.prototype.EVENT_RESOLVE = 'resolve';

/**
 * @type {string}
 * @default 'error'
 */
Response.prototype.EVENT_REJECT = 'error';

/**
 * @readonly
 * @type {Number}
 * @default 0
 */
Response.prototype.state = Response.STATE_PENDING;

/**
 *
 * @type {Object}
 * @default null
 */
Response.prototype.context = null;

/**
 *
 * @type {Array}
 * @default null
 */
Response.prototype.result = null;

/**
 *
 * @type {Error}
 * @default null
 */
Response.prototype.reason = null;

/**
 * @readonly
 * @type {Boolean}
 * @default false
 */
Response.prototype.isResolved = false;

/**
 *
 * @type {*}
 * @default null
 */
Response.prototype.data = null;

/**
 *
 * @type {Array|Function}
 * @default null
 */
Response.prototype.keys = null;

/**
 *
 * @type {Object}
 * @default null
 */
Response.prototype.wrapped = null;

/**
 *
 * @type {Function|null}
 * @default null
 */
Response.prototype.callback = null;

/**
 *
 * @param {EventEmitter.Event|String} type
 * @param {Function} [listener]
 * @param {Object|null} [context]
 * @returns {Response}
 */
Response.prototype.on = function (type, listener, context) {
    var event = (type instanceof EventEmitter.Event) ? type : new EventEmitter.Event(type, listener, context);
    var currentEvent = EventEmitter.event;
    var ctx = event.context == null ? this.context : event.context;

    switch (this.state) {
        case 1:
            if (event.type === this.EVENT_RESOLVE) {
                EventEmitter.event = event;

                try {
                    event.listener.apply(ctx == null ? this : ctx, this.result = toArray(this.result));
                } catch (error) {
                    this.reject(error);
                }

                EventEmitter.event = currentEvent;
                return this;
            }
            break;

        case -1:
            if (event.type === this.EVENT_REJECT) {
                EventEmitter.event = event;

                try {
                    event.listener.call(ctx == null ? this : ctx, this.reason);
                } catch (error) {
                    this.reason = toError(error);
                }

                EventEmitter.event = currentEvent;
                return this;
            }
            break;
    }

    on.call(this, event);

    return this;
};

/**
 *
 * @param {String} type
 * @param {Function} listener
 * @param {Object} [context]
 * @returns {Response}
 */
Response.prototype.once = function (type, listener, context) {
    return this.on(new EventEmitter.Event(type, listener, context, true));
};

/**
 * @param {string} type Тип события.
 * @param {...*} [args] Аргументы, передаваемые в обработчик события.
 * @returns {Boolean}
 */
Response.prototype.emit = function (type, args) {
    var reason;
    var result = false;

    try {
        result = emit.apply(this, arguments);
    } catch (error) {
        reason = error;
    }

    if (reason) {
        if (this.state === -1) {
            this.reason = toError(reason);
        } else {
            this.reject(reason);
        }
    }

    return result;
};

/**
 *
 * @returns {Response}
 */
Response.prototype.pending = function () {
    var prototype = this.constructor.prototype;

    this.state = prototype.state;
    // TODO: Did not inline (target contains unsupported syntax [early])
    this.result = [];
    this.reason = prototype.reason;
    this.isResolved = prototype.isResolved;
    this.final();

    return this;
};

/**
 *
 * @returns {Response}
 */
Response.prototype.ready = function () {
    if (this.state === 0) {
        this.emit(this.EVENT_READY);
    }

    return this;
};

/**
 *
 * @param {*} progress
 * @returns {Response}
 */
Response.prototype.progress = function (progress) {
    if (this.state === 0) {
        this.emit(this.EVENT_PROGRESS, progress);
    }

    return this;
};

/**
 * @param {...*} [results]
 * @returns {Response}
 */
Response.prototype.resolve = function (results) {
    var state = this.state;
    var length = arguments.length;
    var index = 0;
    var args;

    this.state = 1;
    this.reason = null;
    this.isResolved = true;

    if (state === -1) {
        EventEmitter.stop(this);

        state = 0;
    }

    if (state === 0) {
        if (length) {
            args = new Array(length + 1);
            args[0] = this.EVENT_RESOLVE;

            while (index < length) {
                args[index + 1] = arguments[index++];
            }

            this.result = args.slice(1);
            this.emit.apply(this, args);
        } else {
            this.result = [];
            this.emit(this.EVENT_RESOLVE);
        }
    }

    return this;
};

/**
 *
 * @param {*} reason
 * @returns {Response}
 */
Response.prototype.reject = function (reason) {
    var state = this.state;

    this.state = -1;
    this.isResolved = false;

    if (arguments.length && reason != null) {
        this.reason = toError(reason);
    }

    if (isArray(this.result)) {
        this.result.length = 0;
    } else {
        // TODO: Did not inline (target contains unsupported syntax [early])
        this.result = [];
    }

    if (state === 1) {
        EventEmitter.stop(this);

        state = 0;
    }

    if (state === 0) {
        this.emit(this.EVENT_REJECT, this.reason);
    }

    return this;
};

/**
 *
 * @returns {Response}
 */
Response.prototype.final = function () {
    EventEmitter.stop(this);

    return this;
};

/**
 *
 * @returns {Response}
 */
Response.prototype.clear = function () {
    var prototype = this.constructor.prototype;

    this.removeAllListeners();
    this.state = prototype.state;
    this.context = prototype.context;
    // TODO: Did not inline (target contains unsupported syntax [early])
    this.result = [];
    this.reason = prototype.reason;
    this.isResolved = prototype.isResolved;
    this.data = prototype.data;
    this.keys = prototype.keys;
    this.wrapped = prototype.wrapped;
    this.callback = prototype.callback;

    return this;
};

/**
 *
 * @param {Function} callback
 */
Response.prototype.spread = function (callback) {
    callback.apply(this, this.result);
};

/**
 *
 * @param {Array|Function} [keys]
 * @returns {Object|Array}
 */
Response.prototype.map = function (keys) {
    this.result = toArray(this.result);

    var index = 0;
    var length = this.result.length;
    var callback = isFunction(keys) ? keys : isFunction(this.keys) ? this.keys : null;
    var key;
    var value;

    keys = toArray(keys, this.keys);

    var hasKeys = isArray(keys);
    var hasCallback = callback !== null;

    var result = hasKeys ? {} : [];
    var args = [];

    while (index < length) {
        value = this.result[index];

        if (Response.isResponse(value)) {
            value = value.map();

            if (!hasKeys && isArray(value)) {
                push.apply(result, value);

                if (hasCallback) {
                    push.apply(args, value);
                }

                index++;
                continue;
            }
        }

        key = hasKeys ? isString(value) && String(value) : String(index);

        if (key) {
            result[key] = value;
        }

        if (hasCallback) {
            args[index] = value;
        }

        index++;
    }

    if (hasCallback) {
        try {
            result = toSomething(callback.apply(this, args), result);
        } catch (error) {
            this.reject(error);
        }
    }

    return result;
};

/**
 *
 * @param {Object} [wrapped]
 * @param {Function} [callback]
 * @returns {Response}
 */
Response.prototype.bind = function (wrapped, callback) {
    if (!isFunction(this.callback) || isFunction(callback)) {
        this.setCallback(callback);
    }

    this.wrapped = wrapped;

    return this;
};

/**
 *
 * @param {Function|String} method
 * @param {...*} [args]
 * @returns {Response}
 */
Response.prototype.invoke = function (method, args) {
    var wrapped = this.wrapped;
    var arg;
    var index = 0;
    var length;

    if (isString(method)) {
        if (wrapped == null) {
            return this.reject('Wrapped object is not defined. Use the Response#bind method.');
        }

        method = wrapped[method];
    }

    if (isFunction(method)) {
        this.pending();

        if (!isFunction(this.callback)) {
            this.setCallback();
        }

        length = arguments.length;
        arg = new Array(length);

        while (index < length) {
            arg[index++] = arguments[index];
        }

        arg[index] = this.callback;

        try {
            method.apply(wrapped, arg);
        } catch (error) {
            this.reject(error);
        }
    } else {
        this.reject('method is not a function');
    }

    return this;
};

/**
 *
 * @param {Object|null} context
 * @returns {Response}
 */
Response.prototype.setContext = function (context) {
    if (typeof context === 'object') {
        this.context = context;
    }

    return this;
};

/**
 *
 * @param {*} data
 * @returns {Response}
 */
Response.prototype.setData = function (data) {
    this.data = data;

    return this;
};

/**
 *
 * @param {Array|Function} keys
 * @returns {Response}
 */
Response.prototype.setKeys = function (keys) {
    this.keys = isFunction(keys) ? keys : toArray(keys, this.keys);

    return this;
};

/**
 * @example
 * var Response = require('Response');
 * var fs = require('fs');
 * var r = new Response();
 *
 * // Getting the reference on the response out of callback
 * r.setCallback(function (error, fd) {
 *   r.resolve(fd); // ReferenceError: r is not defined
 *   self.resolve(fd); // OK, variable "self" is a reference on a response
 * });
 *
 * r.callback = function (error, fd) {
 *   r.resolve(fd); // OK
 *   self.resolve(fd); // ReferenceError: self is not defined
 * }
 *
 * // Invalid callback
 * r.setCallback(function self (error, fd) {
 *   r.resolve(fd); // ReferenceError: r is not defined
 *   self.resolve(fd); // TypeError: self.resolve is not a function
 * });
 *
 * // Using a default callback
 * r.setCallback();
 * fs.open('/file.txt', 'r', r.callback);
 *
 * r
 * .then(function (fd) {
 *   // File is opened
 *   this.pending(); // Stops execution of other event handlers
 *   fs.close(fd, this.callback);
 * })
 * .then(function () {
 *   // File is closed
 * });
 *
 * // Using a custom callback
 * r = new Response().setCallback(function (data, textStatus, jqXHR) {
 *   if (!data || data.error) {
 *      self.reject(data.error);
 *   } else {
 *      self.resolve(data.result);
 *   }
 * });
 *
 * $.getJSON('ajax/test.json', r.callback);
 *
 * @param {Function} [callback=this.callback]
 * @returns {Response}
 */
Response.prototype.setCallback = function (callback) {
    if (isFunction(callback)) {
        this.callback = callback;
    } else {
        var self = this;

        this.callback = function responseCallback(error, results) {
            if (error == null) {
                var index = 0;
                var length = arguments.length;
                var args;

                if (length && --length) {
                    args = new Array(length);

                    while (index < length) {
                        args[index++] = arguments[index];
                    }

                    self.resolve.apply(self, args);
                } else {
                    self.resolve();
                }
            } else {
                self.reject(error);
            }

            self = null;
        }
    }

    return this;
};

/**
 * @example
 * var Response = require('Response');
 * var fs = require('fs');
 * var r = new Response();
 *
 * fs.open('/file.txt', 'r', r.getCallback());
 *
 * @returns {Function}
 */
Response.prototype.getCallback = function () {
    return isFunction(this.callback) ? this.callback : this.setCallback().callback;
};

/**
 *
 * @param {Response} parent
 * @returns {Response}
 * @this {Response}
 */
Response.prototype.notify = function (parent) {
    if (parent && this !== parent && Response.isResponse(parent)) {
        this.then(parent.resolve, parent.reject, parent.progress, parent);
    } else {
        this.reject('parent is not a valid response');
    }

    return this;
};

/**
 * @example
 * var Response = require('Response');
 * var Vow = require('Vow');
 *
 * new Response()
 *   .onResolve(function (result) {
 *     // result is "'success'" here
 *   })
 *   .listen(new Vow.Promise(function (resolve, reject, notify) {
 *     resolve('success');
 *   }));
 *
 * @param {Response|Object} response
 * @returns {Response}
 * @this {Response}
 */
Response.prototype.listen = function (response) {
    if (response) {
        response.then(this.resolve, this.reject, this.progress, this);
    } else {
        this.reject('response is not defined');
    }

    return this;
};

/**
 *
 * @returns {Response}
 */
Response.prototype.complete = function () {
    this
        .once(this.EVENT_RESOLVE, this.clear)
        .once(this.EVENT_REJECT, this.clear);

    return this;
};

/**
 *
 * @param {Function} [onResolve]
 * @param {Function} [onReject]
 * @param {Function} [onProgress]
 * @param {Object} [context]
 * @returns {Response}
 */
Response.prototype.then = function (onResolve, onReject, onProgress, context) {
    if (isFunction(onResolve)) {
        this.once(this.EVENT_RESOLVE, onResolve, context);
    }

    if (isFunction(onReject)) {
        this.once(this.EVENT_REJECT, onReject, context);
    }

    if (isFunction(onProgress)) {
        this.on(this.EVENT_PROGRESS, onProgress, context);
    }

    return this;
};

/**
 *
 * @param {Function} listener
 * @param {Object|null} [context]
 * @returns {Response}
 */
Response.prototype.onResolve = function (listener, context) {
    this.once(this.EVENT_RESOLVE, listener, context);
    return this;
};

/**
 *
 * @param {Function} listener
 * @param {Object|null} [context]
 * @returns {Response}
 */
Response.prototype.onReady = function (listener, context) {
    this.once(this.EVENT_READY, listener, context);
    return this;
};

/**
 *
 * @param {Function} listener
 * @param {Object|null} [context]
 * @returns {Response}
 */
Response.prototype.onReject = function (listener, context) {
    this.once(this.EVENT_REJECT, listener, context);
    return this;
};

/**
 *
 * @param {Function} listener
 * @param {Object|null} [context]
 * @returns {Response}
 */
Response.prototype.onProgress = function (listener, context) {
    return this.on(this.EVENT_PROGRESS, listener, context);
};

/**
 *
 * @param {Function} listener
 * @param {Object|null} [context]
 * @returns {Response}
 */
Response.prototype.onResult = function (listener, context) {
    this
        .once(this.EVENT_RESOLVE, listener, context)
        .once(this.EVENT_REJECT, listener, context)
        .on(this.EVENT_PROGRESS, listener, context);

    return this;
};

/**
 *
 * @param {Array} [stack=[]]
 * @param {Boolean} [start=false]
 * @constructor
 * @returns {Queue}
 */
function Queue(stack, start) {
    Response.call(this);

    this.stack = toArray(stack);
    this.stopped = !toBoolean(start, false);
    this.item = null;

    this
        .on(this.EVENT_RESOLVE, this.stop)
        .on(this.EVENT_REJECT, this.stop);

    if (this.stopped === false) {
        this.start();
    }

    return this;
}

inherits(Queue, new Response());

Queue.prototype.EVENT_START = 'start';
Queue.prototype.EVENT_STOP = 'stop';
Queue.prototype.EVENT_RESOLVE_ITEM = 'resolveItem';
Queue.prototype.EVENT_REJECT_ITEM = 'rejectItem';
Queue.prototype.stack = null;
Queue.prototype.stopped = true;
Queue.prototype.item = null;

/**
 *
 * @returns {Queue}
 */
Queue.prototype.start = function () {
    var stack = this.stack,
        item;

    if (stack.length === 0) {
        if (this.stopped === false) {
            this.resolve.apply(this, toArray(this.result));
        }

        return this;
    }

    this.stopped = false;

    item = stack.shift();

    if (this.state === 0) {
        if (isFunction(item)) {
            try {
                item = item.apply(this, toArray(this.item && this.item.result));
            } catch (error) {
                this.reject(error);
                return this;
            }

            if (this.stopped === true) {
                return this;
            }
        }
    } else {
        return this;
    }

    if (item === this) {
        return this.start();
    }

    this.item = item;
    this.emit(this.EVENT_START, item);

    if (this.stopped === true) {
        return this;
    }

    if (Response.isResponse(item)) {
        item
            .ready()
            .onResult(onResultItem, this);
    } else {
        this.result = toArray(this.result);
        this.result.push(item);
        this.start();
    }

    return this;
};

/**
 *
 * @returns {Queue}
 */
Queue.prototype.stop = function () {
    this.item = null;

    if (this.stopped === false) {
        this.stopped = true;
        this.emit(this.EVENT_STOP);
    }

    return this;
};

/**
 *
 * @returns {Queue}
 */
Queue.prototype.push = function () {
    push.apply(this.stack, arguments);
    return this;
};

/**
 *
 * @returns {Queue}
 */
Queue.prototype.clear = function () {
    var result = this.result = toArray(this.result);
    var length = result.length;
    var index = 0;
    var response;
    var prototype = this.constructor.prototype;

    while (index < length) {
        response = result[index++];

        if (Response.isResponse(response)) {
            response.clear();
        }
    }

    result.length = 0;

    this.removeAllListeners();
    this.stack.length = 0;
    this.item = prototype.item;
    this.state = prototype.state;
    this.context = prototype.context;
    this.reason = prototype.reason;
    this.isResolved = prototype.isResolved;
    this.data = prototype.data;
    this.keys = prototype.keys;
    this.wrapped = prototype.wrapped;
    this.callback = null;

    return this;
};

/**
 *
 * @returns {Queue}
 */
Queue.prototype.strict = function () {
    this.once(this.EVENT_REJECT_ITEM, this.reject);
    return this;
};

/**
 *
 * @param {Function} listener
 * @param {Object|null} [context=this]
 * @returns {Queue}
 */
Queue.prototype.onStart = function (listener, context) {
    this.on(this.EVENT_START, listener, context);
    return this;
};

/**
 *
 * @param {Function} listener
 * @param {Object|null} [context=this]
 * @returns {Queue}
 */
Queue.prototype.onStop = function (listener, context) {
    this.on(this.EVENT_STOP, listener, context);
    return this;
};

/**
 *
 * @param {Function} listener
 * @param {Object|null} [context=this]
 * @returns {Queue}
 */
Queue.prototype.onResolveItem = function (listener, context) {
    this.on(this.EVENT_RESOLVE_ITEM, listener, context);
    return this;
};

/**
 *
 * @param {Function} listener
 * @param {Object|null} [context=this]
 * @returns {Queue}
 */
Queue.prototype.onRejectItem = function (listener, context) {
    this.on(this.EVENT_REJECT_ITEM, listener, context);
    return this;
};

/**
 * @type {Queue}
 */
Response.Queue = Queue;

/**
 * Exports: {@link Response}
 * @exports Response
 */
module.exports = Response;

function onResultItem(data) {
    var item = this.item;
    var args;
    var length;
    var index = 0;

    this.result = toArray(this.result);
    this.result.push(item);

    switch (item.state) {
        case 0:
            return this.emit(this.EVENT_PROGRESS, data);
            break;
        case 1:
            length = arguments.length;

            if (length) {
                args = new Array(length + 1);
                args[0] = this.EVENT_RESOLVE_ITEM;

                while (index < length) {
                    args[index + 1] = arguments[index++];
                }

                this.emit.apply(this, args);
            } else {
                this.emit(this.EVENT_RESOLVE_ITEM);
            }
            break;
        case -1:
            this.emit(this.EVENT_REJECT_ITEM, data);
            break;
    }

    if (this.stopped === false) {
        if (this.stack.length === 0) {
            this.resolve.apply(this, toArray(this.result));
        } else {
            this.start();
        }
    }

    return this;
}

function getType(object) {
    return (object === null ? 'Null' : toString.call(object).slice(8, -1));
}

function isString(value) {
    return ((typeof value === 'string') || getType(value) === 'String') && value != '';
}

function isArray(value) {
    return value != null && getType(value) === 'Array';
}

function isFunction(value) {
    return typeof value === 'function';
}

function toBoolean(value, defaultValue) {
    return typeof value === 'boolean' || getType(value) === 'Boolean' ? value.valueOf() : defaultValue;
}

function toSomething(value, defaultValue) {
    return typeof value === 'undefined' ? defaultValue : value;
}

function toError(value) {
    return value != null && getType(value) === 'Error' ? value : new Error(value);
}

function toArray(value, defaultValue) {
    if (value == null) {
        return [];
    }

    if (getType(value) === 'Array') {
        return value;
    }

    return arguments.length === 1 ? [] : defaultValue;
}

function Constructor(constructor) {
    if (constructor) {
        this.constructor = constructor;
    }

    Constructor.prototype = null;
}

function inherits(constructor, prototype) {
    Constructor.prototype = prototype;
    constructor.prototype = new Constructor(constructor);
}

function argsToArray() {
    var length = arguments.length;
    var index = 0;
    var result = new Array(length);

    while (index < length) {
        result[index] = arguments[index++];
    }

    return result;
}
