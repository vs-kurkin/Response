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

    /**
     * @type {String}
     * @default 'pending'
     */
    this.STATE_PENDING = 'pending';

    /**
     * @type {String}
     * @default 'resolve'
     */
    this.STATE_RESOLVED = 'resolve';

    /**
     * @type {String}
     * @default 'error'
     */
    this.STATE_REJECTED = 'reject';

    /**
     * @type {String}
     * @default 'ready'
     */
    this.EVENT_READY = 'ready';

    /**
     * @type {String}
     * @default 'progress'
     */
    this.EVENT_PROGRESS = 'progress';

    /**
     * @readonly
     * @type {String}
     * @default 'pending'
     */
    this.state = 'pending';

    /**
     * @readonly
     * @type {Array}
     * @default []
     */
    this.stateData = new Array(0);

    /**
     *
     * @type {Object}
     * @default null
     */
    this.context = null;

    /**
     *
     * Fix: Did not inline (target contains unsupported syntax [early])
     * @type {Array}
     * @default []
     * @readonly
     */
    this.result = new Array(0);

    /**
     *
     * @type {Error}
     * @default null
     */
    this.reason = null;

    /**
     *
     * @type {*}
     * @default null
     */
    this.data = null;

    /**
     *
     * @type {Object}
     * @default null
     */
    this.wrapped = null;

    /**
     *
     * @type {Function|null}
     * @default null
     */
    this.callback = null;

    if (isFunction(wrapper)) {
        wrapper.call(this);
    }

    return this;
}

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
    var index = 0;
    var result = response.result;

    while (index < arguments.length) {
        result[index] = arguments[index++];
    }

    response.state = response.STATE_RESOLVED;

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

    response.state = response.STATE_REJECTED;
    response.reason = toError(reason);

    return response;
};

/**
 *
 * @static
 * @returns {Queue}
 */
Response.queue = function () {
    var length = arguments.length;
    var index = 0;
    var stack = new Array(length);

    while (index < length) {
        stack[index] = arguments[index++];
    }

    return new Queue(stack);
};

/**
 *
 * @static
 * @returns {Queue}
 */
Response.strictQueue = function () {
    var length = arguments.length;
    var index = 0;
    var stack = new Array(length);

    while (index < length) {
        stack[index] = arguments[index++];
    }

    return new Queue(stack).strict();
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

    return response.invoke.apply(response, [method].concat(isArray(args) ? args : []));
};

inherits(Response, new EventEmitter());

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
        if (this.state === this.STATE_REJECTED) {
            this.reason = toError(reason);
        } else {
            this.reject(reason);
        }
    }

    return result;
};

/**
 *
 * @param {String|Number} state
 * @param {...*} [args]
 */
Response.prototype.setState = function (state, args) {
    if (this.state !== state) {
        var index = 0;
        var length = arguments.length - 1;

        this.state = state;
        this.stateData = new Array(length);

        while (index < length) {
            this.stateData[index++] = arguments[index];
        }

        this.emit.apply(this, arguments);
    }

    return this;
};

Response.prototype.onState = function (state, listener, context) {
    var event = (state instanceof EventEmitter.Event) ? state : new EventEmitter.Event(state, listener, context);
    var currentEvent = EventEmitter.event;
    var ctx = event.context == null ? this.context : event.context;

    if (this.state === state) {
        EventEmitter.event = event;

        event.listener.apply(ctx == null ? this : ctx, this.stateData);

        EventEmitter.event = currentEvent;

        if (event.isOnce) {
            return this;
        }
    }

    on.call(this, event);

    return this;
};


Response.prototype.onceState = function (state, listener, context) {
    return this.onState(new EventEmitter.Event(state, listener, context, true));
};

/**
 *
 * @returns {Response}
 */
Response.prototype.pending = function () {
    this.result.length = 0;
    this.reason = null;
    this.final();

    this.setState(this.STATE_PENDING);

    return this;
};

/**
 * @param {...*} [results]
 * @returns {Response}
 */
Response.prototype.resolve = function (results) {
    var length = arguments.length;
    var index = 0;
    var result = this.result;

    this.reason = null;

    if (this.state !== this.STATE_RESOLVED) {
        EventEmitter.stop(this);
    }

    if (length) {
        result.length = length;

        while (index < length) {
            result[index] = arguments[index++];
        }

        this.setState.apply(this, [this.STATE_RESOLVED].concat(result));
    } else {
        this.setState(this.STATE_RESOLVED);
    }

    return this;
};

/**
 *
 * @param {*} reason
 * @returns {Response}
 */
Response.prototype.reject = function (reason) {
    this.result.length = 0;

    if (this.state !== this.STATE_REJECTED) {
        EventEmitter.stop(this);
    }

    if (arguments.length && reason != null) {
        this.reason = toError(reason);
    }

    this.setState(this.STATE_REJECTED, this.reason);

    return this;
};

/**
 *
 * @returns {Boolean}
 */
Response.prototype.isResolved = function () {
    return this.state === this.STATE_RESOLVED;
};


/**
 *
 * @returns {Response}
 */
Response.prototype.ready = function () {
    if (this.state === this.STATE_PENDING) {
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
    if (this.state === this.STATE_PENDING) {
        this.emit(this.EVENT_PROGRESS, progress);
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
    this.pending();
    this.removeAllListeners();

    return Response.call(this);
};

/**
 *
 * @param {Function} callback
 * @param {Object|null} [context=this]
 */
Response.prototype.spread = function (callback, context) {
    callback.apply(typeof context === 'object' ? context : this, this.result);

    return this;
};

/**
 *
 * @example
 * new Response()
 *   .resolve(1, 2)
 *   .map(['foo', 'bar']); // {foo: 1, bar: 2}
 *
 * @param {Array} [keys=[]]
 * @returns {Object}
 */
Response.prototype.map = function (keys) {
    if (!isArray(keys)) {
        return {};
    }

    var result = this.result;
    var length = keys.length;
    var index = 0;
    var hash = {};

    while (index < length) {
        hash[keys[index]] = result[index++];
    }

    return hash;
};

/**
 *
 * @param {Object} [wrapped]
 * @param {Function} [callback]
 * @returns {Response}
 */
Response.prototype.bind = function (wrapped, callback) {
    if (isFunction(callback) || !isFunction(this.callback)) {
        this.setCallback(callback);
    }

    this.wrapped = wrapped;

    return this;
};

/**
 *
 * @example
 * new Response()
 *   .then(function (fd) {
 *     // File is opened, read first 10 bytes
 *     this
 *       .setData(fd) // Save file descriptor
 *       .invoke(fs.read, fd, new Buffer(), 0, 10, null);
 *   })
 *   .then(function (bytesRead, buffer) {
 *     // File is read
 *     this.invoke(fs.close, this.data);
 *   })
 *   .then(function (fd) {
 *     // File is closed
 *   })
 *   // Start
 *   .invoke(fs.open, '/file.txt', 'r');
 *
 * @param {Function|String} method
 * @param {...*} [args]
 * @throws {Error} Бросает исключение, если методом является строка и response не привязан к объекту, либо метод не является функцией.
 * @returns {Response}
 */
Response.prototype.invoke = function (method, args) {
    var wrapped = this.wrapped;
    var arg;
    var index = 0;
    var length;
    var _method = method;

    if (isString(method)) {
        if (wrapped == null) {
            throw new Error('Wrapped object is not defined. Use the Response#bind method.');
        }

        _method = wrapped[method];
    }

    if (isFunction(_method)) {
        length = arguments.length;
        arg = new Array(length);

        while (index < length) {
            arg[index++] = arguments[index];
        }

        if (this.state !== this.STATE_PENDING) {
            this.pending();
        }

        arg[index] = this.getCallback();

        try {
            _method.apply(wrapped, arg);
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
 * @example
 * var Response = require('Response');
 * var r = new Response()
 *
 * r.setCallback(function (data, textStatus, jqXHR) {
 *   if (data && !data.error) {
 *      r.resolve(data.result);
 *   } else {
 *      r.reject(data.error);
 *   }
 * });
 *
 * $.getJSON('ajax/test.json', r.callback);
 *
 * @param {Function} [callback={Function}]
 * @returns {Function}
 */
Response.prototype.setCallback = function (callback) {
    // Fix:
    // Did not inline isFunction called from Response.setCallback (target requires context change).
    if (typeof callback === 'function') {
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

    return this.callback;
};

/**
 * @example
 * var r = new Response();
 * fs.open('/file.txt', 'r', r.getCallback());
 *
 * @returns {Function}
 */
Response.prototype.getCallback = function () {
    return isFunction(this.callback) ? this.callback : this.setCallback();
};

/**
 *
 * @param {Response} parent
 * @throws {Error} Бросает исключение, если parent равен this.
 * @returns {Response}
 * @this {Response}
 */
Response.prototype.notify = function (parent) {
    if (parent === this) {
        throw new Error('Can\'t notify itself');
    }

    if (parent && Response.isResponse(parent)) {
        this.then(parent.resolve, parent.reject, parent.progress, parent);
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
 * new Response()
 *   .then(function (result) {
 *     // result is 'foo' here
 *     this.isResolved(); // true
 *     this.listen(Response.resolve('bar'));
 *     this.isResolved(); // false
 *   })
 *   .then(function (result) {
 *     // result is 'bar' here
 *     this.isResolved(); // true
 *   })
 *   .resolve('foo');
 *
 * @param {Response|Object} response
 * @throws {Error} Бросает исключение, если response равен this.
 * @returns {Response}
 * @this {Response}
 */
Response.prototype.listen = function (response) {
    if (response === this) {
        throw new Error('Can\'t listen on itself');
    }

    if (this.state !== this.STATE_PENDING) {
        this.pending();
    }

    response.then(this.resolve, this.reject, this.progress, this);

    return this;
};

/**
 *
 * @returns {Response}
 */
Response.prototype.done = function () {
    this
        .onceState(this.STATE_RESOLVED, this.clear)
        .onceState(this.STATE_REJECTED, this.clear);

    return this;
};

/**
 *
 * @param {Function} [onResolve]
 * @param {Function} [onReject]
 * @param {Function} [onProgress]
 * @param {Object} [context=this]
 * @returns {Response}
 */
Response.prototype.then = function (onResolve, onReject, onProgress, context) {
    if (isFunction(onResolve)) {
        this.onceState(this.STATE_RESOLVED, onResolve, context);
    }

    if (isFunction(onReject)) {
        this.onceState(this.STATE_REJECTED, onReject, context);
    }

    if (isFunction(onProgress)) {
        this.on(this.EVENT_PROGRESS, onProgress, context);
    }

    return this;
};

/**
 *
 * @param {Function} listener
 * @param {Object|null} [context=this]
 * @returns {Response}
 */
Response.prototype.always = function (listener, context) {
    this
        .onceState(this.STATE_RESOLVED, listener, context)
        .onceState(this.STATE_REJECTED, listener, context)
        .on(this.EVENT_PROGRESS, listener, context);

    return this;
};

/**
 *
 * @param {Function} listener
 * @param {Object|null} [context=this]
 * @returns {Response}
 */
Response.prototype.onResolve = function (listener, context) {
    this.onceState(this.STATE_RESOLVED, listener, context);
    return this;
};

/**
 *
 * @param {Function} listener
 * @param {Object|null} [context=this]
 * @returns {Response}
 */
Response.prototype.onReject = function (listener, context) {
    this.onceState(this.STATE_REJECTED, listener, context);
    return this;
};

/**
 *
 * @param {Function} listener
 * @param {Object|null} [context=this]
 * @returns {Response}
 */
Response.prototype.onReady = function (listener, context) {
    this.on(this.EVENT_READY, listener, context);
    return this;
};

/**
 *
 * @param {Function} listener
 * @param {Object|null} [context=this]
 * @returns {Response}
 */
Response.prototype.onProgress = function (listener, context) {
    return this.on(this.EVENT_PROGRESS, listener, context);
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

    /**
     * @default 'start'
     * @type {String}
     */
    this.EVENT_START = 'start';

    /**
     * @default 'stop'
     * @type {String}
     */
    this.EVENT_STOP = 'stop';

    /**
     * @default 'resolveItem'
     * @type {String}
     */
    this.EVENT_RESOLVE_ITEM = 'resolveItem';

    /**
     * @default 'rejectItem'
     * @type {String}
     */
    this.EVENT_REJECT_ITEM = 'rejectItem';

    /**
     * @readonly
     * @type {Array}
     */
    this.stack = isArray(stack) ? stack : new Array(0);

    /**
     * @readonly
     * @default true
     * @type {Boolean}
     */
    this.stopped = !toBoolean(start, false);

    /**
     * @readonly
     * @default null
     * @type {*}
     */
    this.item = null;

    this
        .onState(this.STATE_RESOLVED, this.stop)
        .onState(this.STATE_REJECTED, this.stop);

    if (this.stopped === false) {
        this.start();
    }

    return this;
}

Queue.isQueue = function (object) {
    return object instanceof Queue;
};

inherits(Queue, new Response());

/**
 *
 * @returns {Queue}
 */
Queue.prototype.start = function () {
    var stack = this.stack,
        item;

    if (stack.length === 0) {
        if (this.stopped === false) {
            this.resolve.apply(this, this.result);
        }

        return this;
    }

    this.stopped = false;

    item = stack.shift();

    if (this.state === this.STATE_PENDING) {
        if (isFunction(item)) {
            try {
                if (Response.isResponse(this.item) && this.item.result.length) {
                    item = item.apply(this, this.item.result);
                } else {
                    item = item.call(this);
                }
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
            .always(onResultItem, this);
    } else {
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
 * @param {...*} [args]
 * @returns {Queue}
 */
Queue.prototype.push = function (args) {
    push.apply(this.stack, arguments);
    return this;
};

/**
 *
 * @returns {Queue}
 */
Queue.prototype.clear = function () {
    var result = this.result;
    var length = result.length;
    var index = 0;
    var response;

    while (index < length) {
        response = result[index++];

        if (Response.isResponse(response)) {
            response.clear();
        }
    }

    result.length = 0;

    // Achtung! Copy-paste from Response#clear, reason: fixed deoptimization for V8.
    this.pending();
    this.removeAllListeners();
    Queue.call(this);

    return this;
};

/**
 *
 * @param {Array} [keys=[]]
 * @returns {Object}
 */
Queue.prototype.map = function (keys) {
    if (!isArray(keys)) {
        return {};
    }

    var result = this.result;
    var key;
    var length = keys.length;
    var index = 0;
    var hash = {};
    var item;

    while (index < length) {
        item = result[index++];
        key = keys[index];

        if (Response.isResponse(item)) {
            item = item.map(key);
        }

        hash[key] = item;
    }

    return hash;
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
    var arg;
    var length;
    var index = 0;

    this.result.push(item);

    switch (item.state) {
        case this.STATE_PENDING:
            return this.emit(this.EVENT_PROGRESS, data);
            break;
        case this.STATE_RESOLVED:
            length = arguments.length;

            if (length) {
                args = new Array(length + 1);
                args[0] = this.EVENT_RESOLVE_ITEM;

                while (index < length) {
                    arg = arguments[index++];
                    args[index] = arg;
                }

                this.emit.apply(this, args);
            } else {
                this.emit(this.EVENT_RESOLVE_ITEM);
            }
            break;
        case this.STATE_REJECTED:
            this.emit(this.EVENT_REJECT_ITEM, data);
            break;
    }

    if (this.stopped === false) {
        if (this.stack.length === 0) {
            this.resolve.apply(this, this.result);
        } else {
            this.start();
        }
    }

    return this;
}

function getType(object) {
    return toString.call(object).slice(8, -1);
}

function isString(value) {
    return ((typeof value === 'string') || getType(value) === 'String') && value != '';
}

function isArray(value) {
    return !(value == null || getType(value) !== 'Array');
}

function isFunction(value) {
    return typeof value === 'function';
}

function toBoolean(value, defaultValue) {
    return typeof value === 'boolean' || getType(value) === 'Boolean' ? value.valueOf() : defaultValue;
}

function toError(value) {
    return value == null || getType(value) !== 'Error' ? new Error(value) : value;
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
