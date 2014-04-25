'use strict';
/**
 * @fileOverview Response.
 */

var EventEmitter = require('EventEmitter');
var Event = EventEmitter.Event;
var push = Array.prototype.push;
var toString = Object.prototype.toString;
var emit = EventEmitter.prototype.emit;

/**
 *
 * @param {String|Number} [state]
 * @returns {State}
 * @constructor
 * @extends EventEmitter
 */
function State(state) {
    this.__base();

    /**
     *
     * @readonly
     * @type {String}
     */
    this.state = state;

    /**
     *
     * @readonly
     * @type {Array}
     * @default []
     */
    this.stateData = new Array(0);

    return this;
}

/**
 *
 * @param {Object} [object]
 * @returns {Boolean}
 */
State.isState = function (object) {
    return object instanceof State;
};

/**
 *
 * @function
 * @static
 * @returns {Object}
 */
State.create = create;

inherits(State, EventEmitter);

/**
 * @default 'changeState'
 * @type {String}
 */
State.prototype.EVENT_CHANGE_STATE = 'changeState';

/**
 * @function
 * @returns {State}
 */
State.prototype.clear = clear;

/**
 *
 * @param {String|Number} state
 * @param {...*} [args]
 * @returns {State}
 */
State.prototype.setState = function (state, args) {
    var index = arguments.length;
    var _state = this.state;
    var _events;
    var hasListeners;

    if (index-- && _state !== state) {
        _events = this._events;
        hasListeners = _events && _events[state];

        this.state = state;
        this.stateData.length = index;

        if (index--) {
            while (index--) {
                this.stateData[index] = arguments[index + 1];
            }

            hasListeners && this.emit.apply(this, arguments);
        } else if (hasListeners) {
            this.emit(state);
        }

        if (_events && _events[this.EVENT_CHANGE_STATE] && this.state === state) {
            this.emit(this.EVENT_CHANGE_STATE, _state);
        }
    }

    return this;
};

/**
 *
 * @param {String|Number} state
 * @param {Function|EventEmitter|Event} listener
 * @param {Object} [context=this]
 * @returns {State}
 */
State.prototype.onState = function (state, listener, context) {
    var event = (listener instanceof Event) ? listener : new Event(state, listener, context);
    var _listener = event.listener;
    var _context = event.context == null ? this : event.context;
    var currentEvent = EventEmitter.event;

    if (this.state === state) {
        EventEmitter.event = event;

        if (typeof _listener === 'function') {
            _listener.apply(_context, this.stateData);
        } else {
            _listener.emit.apply(_context, [event.type].concat(this.stateData));
        }

        EventEmitter.event = currentEvent;

        if (event.isOnce) {
            return this;
        }
    }

    return this.on(state, event);
};

/**
 *
 * @param {String|Number} state
 * @param {Function|EventEmitter|Event} [listener]
 * @param {Object} [context=this]
 * @returns {State}
 */
State.prototype.onceState = function (state, listener, context) {
    var event = (listener instanceof Event) ? listener : new Event(state, listener, context);
    event.isOnce = true;

    return this.onState(state, event);
};

/**
 *
 * @param {Function|EventEmitter|Event} listener
 * @param {Object} [context=this]
 * @returns {State}
 */
State.prototype.onChangeState = function (listener, context) {
    return this.on(this.EVENT_CHANGE_STATE, listener, context);
};

/**
 *
 * @param {Function} [wrapper]
 * @constructor
 * @requires EventEmitter
 * @extends State
 * @returns {Response}
 */
function Response(wrapper) {
    this.__base(this.STATE_PENDING);

    /**
     *
     * @type {*}
     * @default null
     */
    this.data = null;

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
     * @type {Object}
     * @default null
     */
    this.context = null;

    /**
     *
     * @type {Function|null}
     * @default null
     */
    this.callback = null;

    if (typeof wrapper === 'function') {
        this.invoke(wrapper);
    }

    return this;
}

/**
 *
 * @param {Response|*} [response]
 * @static
 * @returns {Boolean}
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
 * @returns {Object}
 */
Response.create = create;

/**
 * @param {...*} [results]
 * @static
 * @returns {Response}
 */
Response.resolve = function (results) {
    var response = new Response();
    var result = response.result;
    var index = arguments.length;

    while (index--) {
        result[index] = arguments[index];
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
 * @param {...*} [args]
 * @static
 * @returns {Queue}
 */
Response.queue = function (args) {
    var index = arguments.length;
    var stack = new Array(index);

    while (index--) {
        stack[index] = arguments[index];
    }

    return new Queue(stack);
};

/**
 *
 * @param {...*} [args]
 * @static
 * @returns {Queue}
 */
Response.strictQueue = function (args) {
    var index = arguments.length;
    var stack = new Array(index);

    while (index--) {
        stack[index] = arguments[index];
    }

    return new Queue(stack).strict();
};

inherits(Response, State);

/**
 * @type {String}
 * @default 'pending'
 */
Response.prototype.STATE_PENDING = 'pending';

/**
 * @type {String}
 * @default 'resolve'
 */
Response.prototype.STATE_RESOLVED = 'resolve';

/**
 * @type {String}
 * @default 'error'
 */
Response.prototype.STATE_REJECTED = 'reject';

/**
 * @type {String}
 * @default 'progress'
 */
Response.prototype.EVENT_PROGRESS = 'progress';

/**
 *
 * @param {*} [data=null]
 * @returns {Response}
 */
Response.prototype.setData = function (data) {
    this.data = arguments.length ? data : null;

    return this;
};

/**
 *
 * @returns {Response}
 */
Response.prototype.clear = clear;

/**
 *
 * @param {Function} callback
 * @param {Object} [context=this]
 * @returns {Function}
 */
Response.prototype.bind = function (callback, context) {
    if (typeof callback !== 'function') {
        throw new Error('Callback is not a function');
    }

    var _context = context == null ? this : context;

    return function responseCallback() {
        callback.apply(_context, arguments);
    };
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
        if (this._events[type]) {
            result = emit.apply(this, arguments);
        }
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
 * @param {String|Number} state
 * @param {Function|EventEmitter|Event} listener
 * @param {Object} [context=this]
 * @returns {Response}
 */
Response.prototype.onState = function (state, listener, context) {
    if (this.state === state) {
        try {
            State.prototype.onState.call(this, state, listener, context);
        } catch (error) {
            if (this.state === this.STATE_REJECTED) {
                this.reason = toError(error);
            } else {
                this.reject(error);
            }
        }
    } else {
        this.on(state, listener, context);
    }

    return this;
};

/**
 *
 * @returns {Response}
 */
Response.prototype.pending = function () {
    this.result.length = 0;
    this.reason = null;

    if (this.state !== this.STATE_PENDING) {
        this.stopEmit();
        this.setState(this.STATE_PENDING);
    }

    return this;
};

/**
 * @param {...*} [results]
 * @returns {Response}
 */
Response.prototype.resolve = function (results) {
    var result = this.result;

    this.reason = null;

    if (arguments.length) {
        result.length = 0;
        push.apply(result, arguments);
    }

    if (this.state !== this.STATE_RESOLVED) {
        this.stopEmit();

        if (result.length) {
            this.setState.apply(this, [this.STATE_RESOLVED].concat(result));
        } else {
            this.setState(this.STATE_RESOLVED);
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
    this.result.length = 0;

    if (arguments.length && reason != null) {
        this.reason = toError(reason);
    }

    if (this.state !== this.STATE_REJECTED) {
        this
            .stopEmit()
            .setState(this.STATE_REJECTED, this.reason);
    }


    return this;
};

/**
 *
 * @param {*} progress
 * @returns {Response}
 */
Response.prototype.progress = function (progress) {
    if (this.state === this.STATE_PENDING && this._events && this._events[this.EVENT_PROGRESS]) {
        this.emit(this.EVENT_PROGRESS, progress);
    }

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
 * @returns {Boolean}
 */
Response.prototype.isRejected = function () {
    return this.state === this.STATE_REJECTED;
};

/**
 *
 * @param {Function|EventEmitter|Event} [onResolve]
 * @param {Function|EventEmitter|Event} [onReject]
 * @param {Function|EventEmitter|Event} [onProgress]
 * @param {Object} [context=this]
 * @returns {Response}
 */
Response.prototype.then = function (onResolve, onReject, onProgress, context) {
    if (onResolve != null) {
        this.onceState(this.STATE_RESOLVED, onResolve, context);
    }

    if (onReject != null) {
        this.onceState(this.STATE_REJECTED, onReject, context);
    }

    if (onProgress != null) {
        this.on(this.EVENT_PROGRESS, onProgress, context);
    }

    return this;
};

/**
 *
 * @param {Function|EventEmitter|Event} listener
 * @param {Object} [context=this]
 * @returns {Response}
 */
Response.prototype.always = function (listener, context) {
    this
        .onceState(this.STATE_RESOLVED, listener, context)
        .onceState(this.STATE_REJECTED, listener, context);

    return this;
};

/**
 *
 * @param {Function|EventEmitter|Event} listener
 * @param {Object} [context=this]
 * @returns {Response}
 */
Response.prototype.onResolve = function (listener, context) {
    this.onceState(this.STATE_RESOLVED, listener, context);

    return this;
};

/**
 *
 * @param {Function|EventEmitter|Event} listener
 * @param {Object} [context=this]
 * @returns {Response}
 */
Response.prototype.onReject = function (listener, context) {
    this.onceState(this.STATE_REJECTED, listener, context);

    return this;
};

/**
 *
 * @param {Function|EventEmitter|Event} listener
 * @param {Object} [context=this]
 * @returns {Response}
 */
Response.prototype.onProgress = function (listener, context) {
    this.on(this.EVENT_PROGRESS, listener, context);

    return this;
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
 * @param {Object|null} [context]
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
 * @param {Error|*} [error]
 * @param {...*} [results]
 */
Response.prototype.callback = function defaultResponseCallback(error, results) {
    var index = arguments.length;
    var arg;

    if (error == null) {
        if (index && --index) {
            arg = new Array(index);

            while (index--) {
                arg[index] = arguments[index + 1];
            }

            this.resolve.apply(this, arg);
        } else {
            this.resolve();
        }
    } else {
        this.reject(error);
    }
};

/**
 * @example
 * var Response = require('Response');
 * var r = new Response()
 *
 * function callback (data, textStatus, jqXHR) {
 *   if (data && !data.error) {
 *      this.resolve(data.result);
 *   } else {
 *      this.reject(data.error);
 *   }
 * }
 *
 * r.bind(callback);
 *
 * $.getJSON('ajax/test.json', r.callback);
 *
 * @param {Function} [callback=Response.callback]
 * @param {Object} [context=this]
 * @returns {Function}
 */
Response.prototype.makeCallback = function (callback, context) {
    return this.callback = this.bind(typeof callback === 'function' ? callback : Response.prototype.callback, context);
};

/**
 * @example
 * var r = new Response();
 * fs.open('/file.txt', 'r', r.getCallback());
 *
 * @returns {Function}
 */
Response.prototype.getCallback = function () {
    return typeof this.callback === 'function' ? this.callback : this.makeCallback();
};

/**
 *
 * @example
 * var response = new Response();
 *
 * response
 *   .makeCallback()
 *   .setContext(fs)
 *
 *   // Open file.txt;
 *   .invoke(fs.open, '/file.txt', 'r', response.callback)
 *
 *   // File is opened, read first 10 bytes
 *   .then(function (fd) {
 *     this
 *       .setData(fd) // Save file descriptor
 *       .invoke('read', fd, new Buffer(), 0, 10, null, this.callback);
 *   })
 *
 *   // File is read
 *   .then(function (bytesRead, buffer) {
 *     this.invoke('close', this.data, this.callback);
 *   })
 *
 *   // File is closed
 *   .then(function (fd) {});
 *
 * @param {Function|String} method
 * @param {...*} [args]
 * @throws {Error} Бросает исключение, если методом является строка и response не привязан к объекту, либо метод не является функцией.
 * @returns {Response}
 */
Response.prototype.invoke = function (method, args) {
    var context = this.context == null ? this : this.context;
    var arg;
    var index;
    var _method = method;

    if (typeof _method === 'string' || getType(_method) === 'String') {
        if (context == null) {
            throw new Error('Context object is not defined. Use the Response#setContext method.');
        }

        _method = context[method];
    }

    if (typeof _method === 'function') {
        index = arguments.length - 1;
        arg = new Array(index);

        while (index--) {
            arg[index] = arguments[index + 1];
        }

        if (this.state !== this.STATE_PENDING) {
            this.pending();
        }

        try {
            _method.apply(context, arg);
        } catch (error) {
            this.reject(error);
        }
    } else {
        throw new Error('Method is not a function.');
    }

    return this;
};

/**
 *
 * @param {Function} callback
 * @param {Object} [context=this]
 */
Response.prototype.spread = function (callback, context) {
    callback.apply(context == null ? this : context, this.result);

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
 * @param {Array} [stack=[]]
 * @param {Boolean} [start=false]
 * @constructor
 * @extends Response
 * @returns {Queue}
 */
function Queue(stack, start) {
    this.__base();

    /**
     * @readonly
     * @type {Array}
     */
    this.stack = isArray(stack) ? stack : new Array(0);

    /**
     * @readonly
     * @default null
     * @type {*}
     */
    this.item = null;

    if (typeof start === 'boolean' || getType(start) === 'Boolean' ? start.valueOf() : false) {
        this.start();
    }

    return this;
}

Queue.create = create;

Queue.isQueue = function (object) {
    return object instanceof Queue;
};

inherits(Queue, Response);

/**
 * @default 'start'
 * @type {String}
 */
Queue.prototype.STATE_START = 'start';

/**
 * @default 'pending'
 * @type {String}
 */
Queue.prototype.STATE_STOP = Queue.prototype.STATE_PENDING;

/**
 * @default 'nextItem'
 * @type {String}
 */
Queue.prototype.EVENT_NEXT_ITEM = 'nextItem';

/**
 * @default 'resolveItem'
 * @type {String}
 */
Queue.prototype.EVENT_RESOLVE_ITEM = 'resolveItem';

/**
 * @default 'rejectItem'
 * @type {String}
 */
Queue.prototype.EVENT_REJECT_ITEM = 'rejectItem';

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

    this.item = null;
    this.stack.length = 0;
    this.__base();

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
Queue.prototype.start = function () {
    var stack = this.stack;
    var item = this.item;

    if (stack.length === 0) {
        if (this.state !== this.STATE_START) {
            this.resolve.apply(this, this.result);
        }

        return this;
    }

    this.item = stack.shift();
    this.setState(this.STATE_START);

    if (this.state !== this.STATE_START) {
        return this;
    }

    if (typeof this.item === 'function') {
        try {
            if (item instanceof Response) {
                if (item.result.length) {
                    this.item = this.item.apply(this, item.result);
                } else {
                    this.item = this.item();
                }
            } else {
                this.item = this.item(item);
            }
        } catch (error) {
            this.reject(error);
            return this;
        }

        if (this.state !== this.STATE_START) {
            return this;
        }
    }

    item = this.item;

    if (item === this) {
        return this.start();
    }

    this.emit(this.EVENT_NEXT_ITEM, item);

    if (this.state !== this.STATE_START) {
        return this;
    }

    this.result.push(item);

    if (Response.isResponse(item)) {
        item
            .delegate(this, item.STATE_RESOLVED, this.EVENT_RESOLVE_ITEM)
            .onceState(item.STATE_RESOLVED, this.start, this)

            .delegate(this, item.STATE_REJECTED, this.EVENT_REJECT_ITEM)
            .onceState(item.STATE_REJECTED, this.start, this);
    } else {
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
    this.setState(this.STATE_STOP);

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
 * @param {Function|EventEmitter|Event} listener
 * @param {Object} [context=this]
 * @returns {Queue}
 */
Queue.prototype.onStart = function (listener, context) {
    this.onState(this.STATE_START, listener, context);
    return this;
};

/**
 *
 * @param {Function|EventEmitter|Event} listener
 * @param {Object} [context=this]
 * @returns {Queue}
 */
Queue.prototype.onStop = function (listener, context) {
    this.onState(this.STATE_STOP, listener, context);
    return this;
};

/**
 *
 * @param {Function|EventEmitter|Event} listener
 * @param {Object} [context=this]
 * @returns {Queue}
 */
Queue.prototype.onNextItem = function (listener, context) {
    this.on(this.EVENT_NEXT_ITEM, listener, context);
    return this;
};

/**
 *
 * @param {Function|EventEmitter|Event} listener
 * @param {Object} [context=this]
 * @returns {Queue}
 */
Queue.prototype.onResolveItem = function (listener, context) {
    this.on(this.EVENT_RESOLVE_ITEM, listener, context);
    return this;
};

/**
 *
 * @param {Function|EventEmitter|Event} listener
 * @param {Object} [context=this]
 * @returns {Queue}
 */
Queue.prototype.onRejectItem = function (listener, context) {
    this.on(this.EVENT_REJECT_ITEM, listener, context);
    return this;
};

/**
 * @param {Boolean} [flag=true]
 * @returns {Queue}
 */
Queue.prototype.strict = function (flag) {
    if (flag === false) {
        this.on(this.EVENT_REJECT_ITEM, this.reject);
    } else {
        this.off(this.EVENT_REJECT_ITEM, this.reject);
    }

    return this;
};

/**
 * @type {Queue}
 */
Response.Queue = Queue;

/**
 * @type {State}
 */
Response.State = State;

/**
 * Exports: {@link Response}
 * @exports Response
 */
module.exports = Response;

function getType(object) {
    return toString.call(object).slice(8, -1);
}

function isArray(value) {
    return !(value == null || getType(value) !== 'Array');
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

function inherits(constructor, base) {
    Constructor.prototype = base.prototype;

    var prototype = new Constructor();

    for (var name in base.prototype) {
        if (base.prototype.hasOwnProperty(name)) {
            prototype[name] = base.prototype[name];
        }
    }

    prototype.constructor = constructor;
    prototype.__base = base;

    constructor.prototype = prototype;
}

function create() {
    Constructor.prototype = new this();
    return new Constructor(this).__base();
}

function clear() {
    return this.constructor();
}
