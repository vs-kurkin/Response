'use strict';
/**
 * @fileOverview Response.
 */

var EventEmitter = require('EventEmitter');
var Event = EventEmitter.Event;
var utils = require('utils.js');
var slice = Array.prototype.slice;
var push = Array.prototype.push;

/**
 *
 * @param {Object|null} [context]
 * @param {*} [data]
 * @constructor
 * @requires EventEmitter
 * @requires utils
 * @extends EventEmitter
 */
function Response(context, data) {
    EventEmitter.call(this);

    this.state = this.state;
    this.context = utils.toObject(context, this.context);
    this.result = [];
    this.reason = this.reason;
    this.isResolved = this.isResolved;
    this.data = utils.toSomething(data, this.data);
    this.keys = this.keys;
    this.wrapped = this.wrapped;
    this.callback = null;
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
Response.STATE_REJECTED = 2;

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
 * @param {Object|null} [context]
 * @param {*} [data]
 * @returns {Object}
 */
Response.create = function (context, data) {
    return utils.create(new this(context, data));
};

/**
 * @param {...*} [results]
 * @static
 * @returns {Response}
 */
Response.resolve = function (results) {
    return this.prototype.resolve.apply(new this(), arguments);
};

/**
 *
 * @param {*} reason
 * @static
 * @returns {Response}
 */
Response.reject = function (reason) {
    return new this().reject(reason);
};

/**
 *
 * @static
 * @returns {Queue}
 */
Response.queue = function () {
    var index = 0;
    var length = arguments.length;
    var args = new Array(arguments.length);

    while (index < length) {
        args[index] = arguments[index++];
    }

    return new Queue(args);
};

/**
 *
 * @static
 * @returns {Queue}
 */
Response.strictQueue = function () {
    return this.queue.apply(this, arguments).strict();
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
    var response = new this();

    return response.run.apply(response, arguments);
};

/**
 *
 * @param {Function} method
 * @param {Array} [args]
 * @returns {Response}
 */
Response.fApply = function (method, args) {
    var response = new this();
    var arg = utils.toArray(args);

    arg.unshift(method);

    return response.run.apply(response, arg);
};

utils.inherits(Response, EventEmitter);

/**
 * @type {string}
 */
Response.prototype.EVENT_READY = 'ready';

/**
 * @type {string}
 */
Response.prototype.EVENT_PROGRESS = 'progress';

/**
 * @type {string}
 */
Response.prototype.EVENT_RESOLVE = 'resolve';

/**
 * @type {string}
 */
Response.prototype.EVENT_REJECT = 'error';

/**
 * @readonly
 * @type {Number}
 */
Response.prototype.state = Response.STATE_PENDING;

/**
 *
 * @type {Object}
 */
Response.prototype.context = null;

/**
 *
 * @type {Array}
 */
Response.prototype.result = null;

/**
 *
 * @type {Error}
 */
Response.prototype.reason = null;

/**
 * @readonly
 * @type {Boolean}
 */
Response.prototype.isResolved = false;

/**
 *
 * @type {*}
 */
Response.prototype.data = null;

/**
 *
 * @type {Array|Function}
 */
Response.prototype.keys = null;

/**
 *
 * @type {Object}
 */
Response.prototype.wrapped = null;

/**
 *
 * @param {EventEmitter.Event|String} type
 * @param {Function} [listener]
 * @param {Object|null} [context]
 * @returns {Response}
 */
Response.prototype.on = function (type, listener, context) {
    var state = this.state;
    var currentEvent = EventEmitter.event;
    var event;

    if (type instanceof Event) {
        event = type;

        type = event.type;
        listener = event.listener;
    } else {
        event = new Event(type, listener, context);
    }

    context = event.context || this.context || this;

    switch (state) {
        case 1:
            if (type === this.EVENT_RESOLVE) {
                EventEmitter.event = event;

                try {
                    listener.apply(context, utils.toArray(this.result));
                } catch (error) {
                    this.reject(error);
                }

                EventEmitter.event = currentEvent;
                return this;
            }
            break;

        case 2:
            if (type === this.EVENT_REJECT) {
                EventEmitter.event = event;

                try {
                    listener.call(context, this.reason);
                } catch (error) {
                    this.reason = utils.toError(error);
                }

                EventEmitter.event = currentEvent;
                return this;
            }
            break;
    }

    EventEmitter.prototype.on.call(this, event);

    return this;
};

/**
 * @param {string} type Тип события.
 * @param {...*} [args] Аргументы, передаваемые в обработчик события.
 */
Response.prototype.emit = function (type, args) {
    try {
        return EventEmitter.prototype.emit.apply(this, arguments);
    } catch (error) {
        if (this.state === 2) {
            this.reason = utils.toError(error);
        } else {
            this.reject(error);
        }
    }

    return false;
};

/**
 *
 * @returns {Response}
 */
Response.prototype.pending = function () {
    var prototype = this.constructor.prototype;

    this.state = prototype.state;
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
    var argsLength = arguments.length;
    var index = 0;
    var args;

    this.state = 1;
    this.reason = null;
    this.isResolved = true;

    if (state === 2) {
        EventEmitter.stop(this);

        state = 0;
    }

    args = new Array(argsLength);

    while (index < argsLength) {
        args[index] = arguments[index];
        index++;
    }

    if (argsLength) {
        this.result = args;
    }

    if (state === 0) {
        switch (argsLength) {
            case 0:
                this.emit(this.EVENT_RESOLVE);
                break;
            case 1:
                this.emit(this.EVENT_RESOLVE, arguments[0]);
                break;
            case 2:
                this.emit(this.EVENT_RESOLVE, arguments[0], arguments[1]);
                break;
            case 3:
                this.emit(this.EVENT_RESOLVE, arguments[0], arguments[1], arguments[2]);
                break;
            default:
                args = new Array(argsLength + 1);
                index = 0;
                args[index] = this.EVENT_RESOLVE;

                while (index < argsLength) {
                    args[index + 1] = arguments[index++];
                }

                this.emit.apply(this, [this.EVENT_RESOLVE].concat(args));
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

    this.state = 2;
    this.isResolved = false;

    if (arguments.length && reason != null) {
        this.reason = utils.toError(reason);
    }

    if (utils.isArray(this.result)) {
        this.result.length = 0;
    } else {
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
    this.result = [];
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
 * @param {Array|Function} [keys]
 * @returns {Object|Array}
 */
Response.prototype.map = function (keys) {
    this.result = utils.toArray(this.result);

    var index = 0;
    var length = this.result.length;
    var callback = utils.isFunction(keys) ? keys : utils.toFunction(this.keys, null);
    var key;
    var value;

    keys = utils.toArray(keys, this.keys);

    var hasKeys = utils.isArray(keys);
    var hasCallback = callback !== null;

    var result = hasKeys ? {} : [];
    var args = [];

    while (index < length) {
        value = this.result[index];

        if (Response.isResponse(value)) {
            value = value.map();

            if (!hasKeys && utils.isArray(value)) {
                push.apply(result, value);

                if (hasCallback) {
                    push.apply(args, value);
                }

                index++;
                continue;
            }
        }

        key = hasKeys ? utils.toString(keys[index]) : String(index);

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
            result = utils.toSomething(callback.apply(this, args), result);
        } catch (error) {
            this.reject(error);
        }
    }

    return result;
};

/**
 *
 * @param {Error|null} [error]
 * @param {...*} [results]
 */
Response.prototype.callback = function responseCallback (error, results) {
    if (error == null) {
        self.resolve.apply(self, slice.call(arguments, 1));
    } else {
        self.reject(error);
    }
};

/**
 *
 * @param {Object} wrapped
 * @param {Function} [callback]
 * @returns {Response}
 */
Response.prototype.wrap = function (wrapped, callback) {
    if (wrapped == null) {
        throw new Error('wrapped is not defined');
    }

    if (this.callback == null || utils.isFunction(callback)) {
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
Response.prototype.run = function (method, args) {
    var wrapped = this.wrapped;
    var arg;
    var index = 0;
    var length;

    if (utils.isString(method)) {
        if (wrapped == null) {
            throw new Error('wrapped is not defined');
        }

        method = wrapped[method];
    }

    if (utils.isFunction(method)) {
        this.pending();

        if (this.callback == null) {
            this.setCallback();
        }

        length = arguments.length;
        arg = new Array(length);

        while (index < length) {
            arg[index] = arguments[++index];
        }

        arg[index] = this.callback;

        try {
            method.apply(wrapped, arg);
        } catch (error) {
            this.reject(error);
        }
    } else {
        throw new Error('method is not a function');
    }

    return this;
};

/**
 *
 * @param {Object|null} context
 * @returns {Response}
 */
Response.prototype.setContext = function (context) {
    if (context === null || utils.isObject(context)) {
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
    this.keys = utils.isFunction(keys) ? keys : utils.toArray(keys, this.keys);

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
 * var r = new Response().setCallback(function (data, textStatus, jqXHR) {
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
 * @throws {Error} Бросает исключение, если callback не является функцией.
 * @returns {Response}
 */
Response.prototype.setCallback = function (callback) {
    callback = utils.toFunction(callback, this.constructor.prototype.callback);

    if (!utils.isFunction(callback)) {
        throw new Error('callback is not a function');
    }

    this.callback = new Function('self', 'return ' + callback.toString())(this);

    return this;
};

/**
 *
 * @returns {Function}
 */
Response.prototype.getCallback = function () {
    return utils.isFunction(this.callback) ? this.callback : this.setCallback().callback;
};

/**
 *
 * @param {Response} parent
 * @throws {Error} Бросает исключение, если parent не является экземпляром {@link Response}, является текущим объектом {@link Response}, либо неопределен.
 * @returns {Response}
 * @this {Response}
 */
Response.prototype.notify = function (parent) {
    if (parent && this !== parent && Response.isResponse(parent)) {
        this.then(parent.resolve, parent.reject, parent.progress, parent);
    } else {
        throw new Error('parent is not a valid response');
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
        throw new Error('response is not defined');
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
    if (utils.isFunction(onResolve)) {
        this.once(this.EVENT_RESOLVE, onResolve, context);
    }

    if (utils.isFunction(onReject)) {
        this.once(this.EVENT_REJECT, onReject, context);
    }

    if (utils.isFunction(onProgress)) {
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

    this.stack = utils.toArray(stack);
    this.stopped = !utils.toBoolean(start, false);
    this.item = null;

    this
        .on(this.EVENT_RESOLVE, this.stop)
        .on(this.EVENT_REJECT, this.stop);

    if (this.stopped === false) {
        this.start();
    }

    return this;
}

utils.inherits(Queue, Response);

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
            this.resolve.apply(this, utils.toArray(this.result));
        }

        return this;
    }

    this.stopped = false;

    item = stack.shift();

    if (this.state === 0) {
        if (utils.isFunction(item)) {
            try {
                item = item.apply(this, utils.toArray(this.item && this.item.result));
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
        this.result = utils.toArray(this.result);
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
    this.stopped = true;
    this.emit(this.EVENT_STOP);
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
    this.stack.length = 0;
    this.item = null;
    this.stop();

    Response.prototype.clear.call(this);

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
    var argsLength;
    var index = 0;

    this.result.push(item);

    switch (item.state) {
        case 0:
            return this.emit(this.EVENT_PROGRESS, data);
            break;

        case 1:
            argsLength = arguments.length;

            switch (argsLength) {
                case 0:
                    this.emit(this.EVENT_RESOLVE_ITEM);
                    break;
                case 1:
                    this.emit(this.EVENT_RESOLVE_ITEM, data);
                    break;
                case 2:
                    this.emit(this.EVENT_RESOLVE_ITEM, data, arguments[1]);
                    break;
                case 3:
                    this.emit(this.EVENT_RESOLVE_ITEM, data, arguments[1], arguments[2]);
                    break;
                default:
                    args = new Array(argsLength + 1);
                    args[0] = this.EVENT_RESOLVE_ITEM;

                    while (index < argsLength) {
                        args[index + 1] = arguments[index];
                        index++;
                    }

                    this.emit.apply(this, args);
            }
            break;
        case 2:
            this.emit(this.EVENT_REJECT_ITEM, data);
            break;
    }

    if (this.stopped === false) {
        if (this.stack.length === 0) {
            this.resolve.apply(this, utils.toArray(this.result));
        } else {
            this.start();
        }
    }

    return this;
}
