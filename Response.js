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
 * @param {String|Number} [state] Начальное состояние объекта.
 * @returns {State}
 * @constructor
 * @extends EventEmitter
 */
function State(state) {
    this.EventEmitter();
    this.state = state || this.state;
    this.stateData = new Array(0);

    return this;
}

/**
 * Проверяет, я вляется ли объект экземпляром конструктора {@link State}.
 * @param {Object} [object] Проверяемый объект.
 * @returns {Boolean}
 */
State.isState = function (object) {
    return object instanceof State;
};

/**
 * Создает объект, который наследует от объекта {@link State}.
 * @function
 * @static
 * @returns {Object}
 * @example
 * var obj = State.create();
 * obj instanceof State; // true
 * obj.hasOwnProperty('state'); // false
 */
State.create = create;

inherits(State, EventEmitter);

State.prototype.EventEmitter = EventEmitter;

/**
 * Событие изменения состояния.
 * @default 'changeState'
 * @type {String}
 */
State.prototype.EVENT_CHANGE_STATE = 'changeState';

/**
 * Текущее состояние объекта.
 * @readonly
 * @type {String}
 */
State.prototype.state = null;

/**
 * Данные для обработчиков стостояния.
 * @readonly
 * @type {Array}
 * @default []
 */
State.prototype.stateData = null;

/**
 * Сбрасывает объект в указанное состояние и удаляет данные.
 * Никакие события при этом не вызываются.
 * @function
 * @param {String|Number} [state] Состояние, в которое необходимо сбросить объект.
 * @returns {State}
 * @example
 * new State()
 *  .onChangeState(function (state) {
 *    console.log(state); // only 'foo'
 *  })
 *  .setState('foo')
 *  .reset('bar');
 *
 * console.log(inst.state); // bar
 */
State.prototype.reset = State;

/**
 * Изменяет состояние объекта.
 * После изменения состояния, первым будет вызвано событие с именем, соответствуюшим новому значению состояния.
 * Затем событие {@link State#EVENT_CHANGE_STATE}.
 * Если новое состояние не передано или объект уже находится в указаном состоянии, события не будут вызваны.
 * @param {String|Number} state Новое сотояние объекта.
 * @param {...*} [args] Данные, которые будут переданы в аргументы обработчикам нового состояния.
 * @returns {State}
 * @example
 * new State()
 *   .onState('foo', function (bar) {
 *     bar; // 'baz'
 *     this.state; // 'foo'
 *   })
 *   .setState('foo', 'baz');
 */
State.prototype.setState = function (state, args) {
    var index = arguments.length;
    var _state = this.state;
    var _events;

    if (index--) {
        if (_state !== state || index) {
            this.stateData.length = index;

            while (index--) {
                this.stateData[index] = arguments[index + 1];
            }

            if (this.eventData) {
                this.eventData.length = 0;
                push.apply(this.eventData, this.stateData);
            }
        }

        if (_state !== state) {
            this.stopEmit();
            this.state = state;

            _events = this._events;

            if (_events) {
                if (_events[state]) {
                    this.emit.apply(this, arguments);
                }

                if (_events[this.EVENT_CHANGE_STATE] && this.state === state) {
                    this.emit(this.EVENT_CHANGE_STATE, _state);
                }
            }
        }
    }

    return this;
};

/**
 * Регистрирует обработчик состояния.
 * Если объект уже находится в указанном состоянии, обработчик будет вызван немедленно.
 * @param {String|Number} state Отслеживаемое состояние.
 * @param {Function|EventEmitter|Event} listener Обработчик состояния.
 * @param {Object} [context=this] Контекст обработчика состояния.
 * @returns {State}
 * @example
 * new State()
 *   .onState('foo', function () {
 *     this.state; // only 'foo'
 *   })
 *   .setState('foo')
 *   .setState('bar');
 */
State.prototype.onState = function (state, listener, context) {
    var event = (listener instanceof Event) ? listener : new Event(state, listener, context);
    var _state = state || event.type;
    var _listener = event.listener;
    var _context = context || event.context || this;
    var currentEvent = EventEmitter.event;

    if (this.state === _state) {
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

    return this.on(_state, event);
};

/**
 * Регистрирует одноразовый обработчик состояния.
 * @param {String|Number} state Отслеживаемое состояние.
 * @param {Function|EventEmitter|Event} [listener] Обработчик состояния.
 * @param {Object} [context=this] Контекст обработчика состояния.
 * @returns {State}
 * @example
 * new State()
 *   .onceState('foo', function () {
 *     // Этот обработчик будет выполнен один раз
 *   })
 *   .setState('foo')
 *   .setState('bar')
 *   .setState('foo');
 */
State.prototype.onceState = function (state, listener, context) {
    var event = (listener instanceof Event) ? listener : new Event(state, listener, context);
    event.isOnce = true;

    return this.onState(state, event, context || event.context);
};

/**
 * Регистрирует обработчик изменения состояния.
 * @param {Function|EventEmitter|Event} listener Обработчик изменения состояния.
 * @param {Object} [context=this] Контекст обработчика изменения состояния.
 * @returns {State}
 * @example
 * new State()
 *   .onChangeState(function (state) {
 *     console.log(state); // 'foo', 'bar'
 *   })
 *   .setState('foo')
 *   .setState('bar');
 */
State.prototype.onChangeState = function (listener, context) {
    return this.on(this.EVENT_CHANGE_STATE, listener, context);
};

/**
 * Отменяет обработку изменения состояния.
 * @param {Function|EventEmitter|Event} [listener] Обработчик, который необходимо отменить. Если обработчик не был передан, будут отменены все обработчики.
 * @returns {State}
 */
State.prototype.offChangeState = function (listener) {
    if (listener) {
        this.removeListener(this.EVENT_CHANGE_STATE, listener);
    } else {
        this.removeAllListeners(this.EVENT_CHANGE_STATE);
    }

    return this;
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
    this.State(this.STATE_PENDING);

    this.data = null;
    this.context = null;
    this.callback = null;
    this.keys = null;

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
    var index = arguments.length;

    while (index--) {
        response.stateData[index] = arguments[index];
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
    response.stateData[0] = toError(reason);

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

Response.prototype.State = State;

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
Response.prototype.STATE_REJECTED = 'error';

/**
 * @type {String}
 * @default 'progress'
 */
Response.prototype.EVENT_PROGRESS = 'progress';

/**
 *
 * @type {*}
 * @default null
 */
Response.prototype.data = null;

/**
 *
 * @type {Object}
 * @default null
 */
Response.prototype.context = null;

/**
 *
 * @type {Function|null}
 * @default null
 */
Response.prototype.callback = null;

/**
 *
 * @type {Array}
 * @default null
 */
Response.prototype.keys = null;

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
 * @param {String|Number|Array|Arguments} [keys=null]
 * @returns {Response}
 */
Response.prototype.setKeys = function (keys) {
    this.keys = arguments.length ? keys : null;

    return this;
};

/**
 *
 * @returns {Response}
 */
Response.prototype.reset = Response;

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
    var result = false;

    if (this._events && this._events[type]) {
        try {
            result = emit.apply(this, arguments);
        } catch (error) {
            if (this.state === this.STATE_REJECTED) {
                this.stateData[0] = toError(error);
            } else {
                this.reject(error);
            }
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
                this.stateData[0] = toError(error);
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
    this.setState(this.STATE_PENDING);

    return this;
};

/**
 * @param {...*} [results]
 * @returns {Response}
 */
Response.prototype.resolve = function (results) {
    var stateData = [this.STATE_RESOLVED];

    push.apply(stateData, arguments);

    this.setState.apply(this, stateData);

    return this;
};

/**
 *
 * @param {*} reason
 * @returns {Response}
 */
Response.prototype.reject = function (reason) {
    this.setState(this.STATE_REJECTED, reason);

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
Response.prototype.isPending = function () {
    return this.state === this.STATE_PENDING;
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
        throw new Error('Cannot listen on itself');
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
        .onceState(this.STATE_RESOLVED, this.reset)
        .onceState(this.STATE_REJECTED, this.reset);

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
 * @returns {Response}
 */
Response.prototype.makeCallback = function (callback, context) {
    this.callback = this.bind(typeof callback === 'function' ? callback : Response.prototype.callback, context);

    return this;
};

/**
 * @example
 * var r = new Response();
 * fs.open('/file.txt', 'r', r.getCallback());
 *
 * @returns {Function}
 */
Response.prototype.getCallback = function () {
    if (typeof this.callback !== 'function') {
        this.makeCallback();
    }

    return this.callback;
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
    callback.apply(context == null ? this : context, this.stateData);

    return this;
};

/**
 *
 * @example
 * new Response()
 *   .resolve(3) // resolve one result
 *   .getResult() // 3, returns result
 *   .resolve(1, 2) // resolve more results
 *   .getResult() // [1, 2], returns a results array
 *   .getResult(1) // 2, returns result on a index
 *   .getResult(['foo', 'bar']) // {foo: 1, bar: 2}, returns a hash results
 *   .setKeys(['foo', 'bar']) // sets a default keys
 *   .getResult('bar') // 2, returns result on a default key
 *
 *
 * @param {String|Number|Array|Arguments} [key=this.keys]
 * @returns {*|null}
 */
Response.prototype.getResult = function (key) {
    if (this.state !== this.STATE_RESOLVED) {
        return null;
    }

    var keys = arguments.length ? key : this.keys;
    var stateData = this.stateData;
    var result;
    var index;
    var length;
    var _key;

    switch (getType(keys)) {
        case 'String':
            index = this.keys.length;

            while (index--) {
                if (this.keys[index] === keys) {
                    return stateData[index];
                }
            }

            return null;

        case 'Number':
            return stateData[keys];

        case 'Array':
        case 'Arguments':
            length = keys.length;
            index = 0;
            result = {};

            while (index < length) {
                _key = keys[index];

                if (_key != null) {
                    result[_key] = stateData[index++];
                }
            }

            return result;

        default:
            return stateData.length === 1 ? stateData[0] : stateData;
    }
};

/**
 *
 * @returns {Error|null}
 */
Response.prototype.getReason = function () {
    return this.state === this.STATE_REJECTED ? this.stateData[0] : null;
};

/**
 *
 * @returns {Object}
 */
Response.prototype.toJSON = function () {
    return this.getResult();
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
    this.Response();

    this.stack = isArray(stack) ? stack : new Array(0);
    this.item = null;

    if (getType(start) === 'Boolean' ? start.valueOf() : false) {
        this.start();
    }

    return this;
}

Queue.create = create;

Queue.isQueue = function (object) {
    return object instanceof Queue;
};

inherits(Queue, Response);

Queue.prototype.Response = Response;

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
 * @readonly
 * @type {Array}
 * @default null
 */
Queue.prototype.stack = null;

/**
 * @readonly
 * @default null
 * @type {*}
 */
Queue.prototype.item = null;

/**
 *
 * @returns {Queue}
 */
Queue.prototype.reset = function () {
    var stateData = this.stateData;
    var length = stateData.length;
    var index = 0;
    var response;

    while (index < length) {
        response = stateData[index++];

        if (Response.isResponse(response)) {
            response.reset();
        }
    }

    stateData.length = 0;

    this.item = null;
    this.stack.length = 0;
    this.Response();

    return this;
};

/**
 *
 * @returns {Queue}
 */
Queue.prototype.start = function () {
    var stack = this.stack;
    var item = this.item;

    while (stack.length) {
        this.item = stack.shift();
        this.setState(this.STATE_START);

        if (this.state !== this.STATE_START) {
            return this;
        }

        if (typeof this.item === 'function') {
            try {
                if (item instanceof Response) {
                    if (item.stateData.length) {
                        this.item = this.item.apply(this, item.stateData);
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
            continue;
        }

        this.emit(this.EVENT_NEXT_ITEM, item);

        if (this.state !== this.STATE_START) {
            return this;
        }

        this.stateData.push(item);

        if (item && Response.isResponse(item) && item.state === item.STATE_PENDING) {
            item.always(this.start, this);
            return this;
        }
    }

    if (stack.length === 0) {
        this.item = null;
        this.resolve.apply(this, this.stateData);
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
    this.off(this.EVENT_REJECT_ITEM, this.reject);

    if (flag !== false) {
        this.on(this.EVENT_REJECT_ITEM, this.reject);
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

    constructor.__base = base;
    constructor.prototype = prototype;
}

function create() {
    Constructor.prototype = new this();
    return new Constructor(this);
}
