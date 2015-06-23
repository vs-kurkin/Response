'use strict';
/**
 * @fileOverview Response.
 */

var EventEmitter = require('EventEmitter');
var toString = Object.prototype.toString;

var EVENT_CHANGE_STATE = 'changeState';
var STATE_ERROR = 'error';

var STATE_PENDING = 'pending';
var STATE_RESOLVED = 'resolve';
var STATE_REJECTED = 'error';
var EVENT_PROGRESS = 'progress';

var EVENT_START = 'start';
var EVENT_STOP = 'stop';
var EVENT_NEXT_ITEM = 'nextItem';

/**
 * @param {Object} proto
 * @param {Function} constructor
 * @type {Function}
 */
var defineConstructor = isFunction(Object.defineProperty) ? function (proto, constructor) {
    Object.defineProperty(proto, 'constructor', {
        value: constructor,
        enumerable: false,
        writable: true,
        configurable: true
    });
} : function (proto, constructor) {
    proto.constructor = constructor;
};

/**
 * @function
 * @param {*} object
 */
var getKeys = isFunction(Object.keys) ? Object.keys : function keys(object) {
    var keys = [];

    for (var name in object) {
        if (object.hasOwnProperty(name)) {
            keys.push(name);
        }
    }

    return keys;
};

/**
 * @function
 * @param {*} object
 */
var isArray = isFunction(Array.isArray) ? Array.isArray : function isArray(object) {
    return object && (toString.call(object) === '[object Array]');
};

/**
 *
 * @param {Function} [callback]
 * @param {Object} [context]
 * @returns {Function}
 * @type {Function}
 */
var bind = isFunction(Function.prototype.bind) ? function (callback, context) {
    return callback && callback.bind(context);
} : function (callback, context) {
    return callback && function () {
            var index = 0;
            var length = arguments.length;
            var args = new Array(length);

            while (index < length) {
                args[index] = arguments[index++];
            }

            return callback.apply(context, args);
        }
};

/**
 *
 * @param {*} [state] Начальное состояние объекта.
 * @returns {State}
 * @constructor
 * @extends {EventEmitter}
 */
function State(state) {
    EventEmitter.call(this);

    this.state = arguments.length ? state : this.state;
    this.stateData = [];
    this.data = this.data || {};
    this.keys = [];

    return this;
}

/**
 * Событие изменения состояния.
 * @const
 * @default 'changeState'
 * @type {String}
 */
State.EVENT_CHANGE_STATE = EVENT_CHANGE_STATE;

/**
 * Событие изменения состояния.
 * @const
 * @default 'changeState'
 * @type {String}
 */
State.STATE_ERROR = STATE_ERROR;

/**
 * Проверяет, я вляется ли объект экземпляром конструктора {@link State}.
 * @param {Object} [object] Проверяемый объект.
 * @returns {Boolean}
 * @static
 */
State.isState = function (object) {
    return object != null && object.isState;
};

/**
 * Создает объект, который наследует от объекта {@link State}.
 * @param {Function} [constructor]
 * @param {Boolean} [copyStatic=false]
 * @static
 * @returns {Object}
 * @example
 * function Const () {}
 *
 * Const.prototype = State.create(Const);
 *
 * new Const() instanceof State; // true
 * Const.prototype.constructor === Const; // true
 */
State.create = function (constructor, copyStatic) {
    if (constructor && copyStatic === true) {
        copy(this, constructor);
    }

    return inherits(this, constructor);
};

/**
 *
 * @static
 * @param {Function} fnc
 * @param {Array} [args]
 * @param {Object} [context]
 * @returns {State}
 */
State.invoke = function (fnc, args, context) {
    var state = new this();

    state.invoke(fnc, args, context);

    return state;
};

State.prototype = State.create.call(EventEmitter, State);

/**
 * @type {Boolean}
 * @const
 * @default true
 */
State.prototype.isState = true;

/**
 * Текущее состояние объекта.
 * @readonly
 * @type {String}
 * @default null
 */
State.prototype.state = null;

/**
 *
 * @type {Array}
 * @default []
 */
State.prototype.keys = null;

/**
 *
 * @type {Object}
 * @default {}
 */
State.prototype.data = null;

/**
 * Данные для обработчиков стостояния.
 * @readonly
 * @type {Array}
 * @default []
 */
State.prototype.stateData = null;

/**
 *
 * @param {Function} fnc
 * @param {Array} [args]
 * @param {*} [context=this]
 * @returns {*}
 */
State.prototype.invoke = function (fnc, args, context) {
    var _args = isArray(args) ? args : [];
    var ctx = context == null ? this : context;
    var result;

    try {
        switch (_args.length) {
            case 0:
                result = fnc.call(ctx);
                break;
            case 1:
                result = fnc.call(ctx, _args[0]);
                break;
            case 2:
                result = fnc.call(ctx, _args[0], _args[1]);
                break;
            case 3:
                result = fnc.call(ctx, _args[0], _args[1], _args[2]);
                break;
            case 4:
                result = fnc.call(ctx, _args[0], _args[1], _args[2], _args[3]);
                break;
            case 5:
                result = fnc.call(ctx, _args[0], _args[1], _args[2], _args[3], _args[4]);
                break;
            default:
                result = fnc.apply(ctx, _args);
        }
    } catch (error) {
        result = toError(error);

        if (this && this.isState) {
            this.setState(STATE_ERROR, [result]);
        }
    }

    return result;
};

/**
 * Обнуляет все собственные свойства объекта.
 * @param {Boolean} [recursive=false]
 * @returns {State}
 */
State.prototype.destroy = function (recursive) {
    if (recursive === true) {
        destroyItems(this.stateData);
    }

    destroy(this);

    return this;
};

/**
 * Сравнивает текущее состояние объекта со значение state.
 * @param {*} state Состояние, с которым необходимо ставнить текущее.
 * @returns {Boolean} Результат сравнения.
 */
State.prototype.is = function (state) {
    return this.state === state;
};

/**
 * Изменяет состояние объекта.
 * После изменения состояния, первым будет вызвано событие с именем, соответствуюшим новому значению состояния.
 * Затем событие {@link State.EVENT_CHANGE_STATE}.
 * Если новое состояние не передано или объект уже находится в указаном состоянии, события не будут вызваны.
 * @param {*} state Новое сотояние объекта.
 * @param {Array|*} [data] Данные, которые будут переданы аргументом в обработчики нового состояния.
 *                         Если был передан массив, аргументами для обработчиков будут его элементы.
 * @returns {State}
 * @example
 * new State()
 *   .onState('foo', function (bar) {
 *     bar; // 'baz'
 *     this.state; // 'foo'
 *   })
 *   .setState('foo', 'baz');
 *
 * new State()
 *   .onState('foo', function (bar, baz) {
 *     bar; // true
 *     baz; // false
 *   })
 *   .setState('foo', [true, false]);
 */
State.prototype.setState = function (state, data) {
    var _state = this.state !== state;
    var _hasData = arguments.length > 1;
    var _data = _hasData ? wrapIfArray(data) : [];

    if (_state || _hasData) {
        this.stateData = _data;

        if (this._event) {
            this._event.data = _data;
        }
    }

    if (_state) {
        changeState(this, state, _data);
    }

    return this;
};

/**
 * Регистрирует обработчик состояния.
 * Если объект уже находится в указанном состоянии, обработчик будет вызван немедленно.
 * @param {*} state Отслеживаемое состояние.
 * @param {Function|EventEmitter} listener Обработчик состояния.
 * @param {Object} [context=this] Контекст обработчика состояния.
 * @returns {State}
 * @throws {Error}
 * @example
 * new State()
 *   .onState('foo', function () {
 *     this.state; // only 'foo'
 *   })
 *   .setState('foo')
 *   .setState('bar');
 */
State.prototype.onState = function (state, listener, context) {
    if (this.state === state) {
        invokeListener(this, listener, context);
    }

    this.on(state, listener, context);

    return this;
};

/**
 * Регистрирует одноразовый обработчик состояния.
 * @param {*} state Отслеживаемое состояние.
 * @param {Function|EventEmitter} listener Обрабо1тчик состояния.
 * @param {Object} [context=this] Контекст обработчика состояния.
 * @returns {State}
 * @throws {Error}
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
    if (this.state === state) {
        invokeListener(this, listener, context);
    } else {
        this.once(state, listener, context);
    }

    return this;
};

/**
 * Регистрирует обработчик изменения состояния.
 * @param {Function|EventEmitter} listener Обработчик изменения состояния.
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
    this.on(EVENT_CHANGE_STATE, listener, context);

    return this;
};

/**
 * Отменяет обработку изменения состояния.
 * @param {Function|EventEmitter} [listener] Обработчик, который необходимо отменить.
 *                                           Если обработчик не был передан, будут отменены все обработчики.
 * @returns {State}
 */
State.prototype.offChangeState = function (listener) {
    if (listener) {
        this.removeListener(EVENT_CHANGE_STATE, listener);
    } else {
        this.removeAllListeners(EVENT_CHANGE_STATE);
    }

    return this;
};

/**
 *
 * @param {String} key
 * @param {*} [value]
 * @returns {State}
 */
State.prototype.setData = function (key, value) {
    this.data[key] = value;

    return this;
};

/**
 *
 * @param {String} [key]
 * @returns {*}
 */
State.prototype.getData = function (key) {
    return arguments.length ? this.data[key] : this.data;
};

/**
 *
 * @param {*} key
 * @returns {*|undefined}
 */
State.prototype.getStateData = function (key) {
    var index = this.keys.length;

    while (index) {
        if (this.keys[--index] === key) {
            return this.stateData[index];
        }
    }
};

/**
 * @param {Array} [keys=this.keys]
 * @returns {Object}
 */
State.prototype.toObject = function (keys) {
    var _keys = isArray(keys) ? keys : this.keys;

    if (_keys.length === 0) {
        return {};
    }

    var length = this.stateData.length;
    var index = 0;
    var result = {};
    var key;

    while (index < length) {
        key = _keys[index];

        if (key != null) {
            result[key] = toObject(this.stateData[index]);
        }

        index++;
    }

    return result;
};

/**
 *
 * @returns {Object}
 */
State.prototype.toJSON = function () {
    return this.toObject();
};

/**
 *
 * @param {Array} [keys=[]]
 * @returns {State}
 */
State.prototype.setKeys = function (keys) {
    this.keys = isArray(keys) ? keys : [];

    return this;
};

/**
 *
 * @param {Response} [parent]
 * @constructor
 * @requires EventEmitter
 * @extends {State}
 * @returns {Response}
 */
function Response(parent) {
    this.State(STATE_PENDING);

    if (isCompatible(parent)) {
        this.listen(parent);
    }

    return this;
}

/**
 * @const
 * @type {String}
 * @default 'pending'
 */
Response.STATE_PENDING = STATE_PENDING;

/**
 * @const
 * @type {String}
 * @default 'resolve'
 */
Response.STATE_RESOLVED = STATE_RESOLVED;

/**
 * @const
 * @type {String}
 * @default 'error'
 */
Response.STATE_REJECTED = STATE_ERROR;

/**
 * @const
 * @type {String}
 * @default 'progress'
 */
Response.EVENT_PROGRESS = EVENT_PROGRESS;

/**
 * @type {State}
 */
Response.State = State;

/**
 * @type {Queue}
 */
Response.Queue = Queue;

/**
 *
 * @param {Response|*} [object]
 * @static
 * @returns {Boolean}
 */
Response.isResponse = function (object) {
    return object != null && object.isResponse;
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
 * @static
 * @returns {Object}
 */
Response.create = State.create;

/**
 *
 * @static
 * @param {Function} fnc
 * @param {Array} [args]
 * @param {Object} [context]
 * @type {Function}
 * @returns {Response}
 */
Response.invoke = State.invoke;

/**
 * @param {...*} [results]
 * @static
 * @returns {Response}
 */
Response.resolve = function (results) {
    var response = new Response();
    var index = arguments.length;

    while (index) {
        response.stateData[--index] = arguments[index];
    }

    response.state = STATE_RESOLVED;

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

    response.state = STATE_REJECTED;
    response.stateData[0] = toError(reason);

    return response;
};

Response.prototype = State.create(Response);

/**
 * {@link State}
 * @type {State}
 */
Response.prototype.State = State;

/**
 * @type {Boolean}
 * @const
 * @default true
 */
Response.prototype.isResponse = true;

/**
 *
 * @returns {Response}
 */
Response.prototype.pending = function () {
    this.setState(STATE_PENDING);

    return this;
};

/**
 * @param {...*} [results]
 * @returns {Response}
 */
Response.prototype.resolve = function (results) {
    var index = arguments.length;

    if (index || !this.isResolved()) {
        var data = [];

        while (index) {
            data[--index] = arguments[index];
        }

        this.setState(STATE_RESOLVED, data);
    }

    return this;
};

/**
 *
 * @param {*} reason
 * @returns {Response}
 */
Response.prototype.reject = function (reason) {
    if (arguments.length || !this.isRejected()) {
        this.setState(STATE_REJECTED, [toError(reason)]);
    }

    return this;
};

/**
 *
 * @param {*} progress
 * @returns {Response}
 */
Response.prototype.progress = function (progress) {
    if (this.isPending()) {
        emit(this, EVENT_PROGRESS, [progress]);
    }

    return this;
};

/**
 *
 * @returns {Boolean}
 */
Response.prototype.isPending = function () {
    return !(
        this.hasOwnProperty('state') &&
        this.state == null ||
        this.state === STATE_RESOLVED ||
        this.state === STATE_REJECTED
    );
};

/**
 *
 * @returns {Boolean}
 */
Response.prototype.isResolved = function () {
    return this.state === STATE_RESOLVED;
};

/**
 *
 * @returns {Boolean}
 */
Response.prototype.isRejected = function () {
    return this.state === STATE_REJECTED;
};

/**
 *
 * @param {Function|EventEmitter} [onResolve]
 * @param {Function|EventEmitter} [onReject]
 * @param {Function|EventEmitter} [onProgress]
 * @param {Object} [context=this]
 * @returns {Response}
 */
Response.prototype.then = function (onResolve, onReject, onProgress, context) {
    if (onResolve != null) {
        this.onceState(STATE_RESOLVED, onResolve, context);
    }

    if (onReject != null) {
        this.onceState(STATE_REJECTED, onReject, context);
    }

    if (onProgress != null) {
        this.on(EVENT_PROGRESS, onProgress, context);
    }

    return this;
};

/**
 *
 * @param {Function|EventEmitter} listener
 * @param {Object} [context=this]
 * @returns {Response}
 */
Response.prototype.always = function (listener, context) {
    this
        .onceState(STATE_RESOLVED, listener, context)
        .onceState(STATE_REJECTED, listener, context);

    return this;
};

/**
 *
 * @param {Function|EventEmitter} listener
 * @param {Object} [context=this]
 * @returns {Response}
 */
Response.prototype.onPending = function (listener, context) {
    this.onceState(STATE_PENDING, listener, context);

    return this;
};

/**
 *
 * @param {Function|EventEmitter} listener
 * @param {Object} [context=this]
 * @returns {Response}
 */
Response.prototype.onResolve = function (listener, context) {
    this.onceState(STATE_RESOLVED, listener, context);

    return this;
};

/**
 *
 * @param {Function|EventEmitter} listener
 * @param {Object} [context=this]
 * @returns {Response}
 */
Response.prototype.onReject = function (listener, context) {
    this.onceState(STATE_REJECTED, listener, context);

    return this;
};

/**
 *
 * @param {Function|EventEmitter} listener
 * @param {Object} [context=this]
 * @returns {Response}
 */
Response.prototype.onProgress = function (listener, context) {
    this.on(EVENT_PROGRESS, listener, context);

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
    if (parent) {
        if (parent === this) {
            throw new Error('Can\'t notify itself');
        }

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
 * @param {Response|Object} response
 * @this {Response}
 * @throws {Error} Бросает исключение, если response равен this.
 * @returns {Response}
 */
Response.prototype.listen = function (response) {
    if (response === this) {
        throw new Error('Cannot listen on itself');
    }

    if (!this.isPending()) {
        this.pending();
    }

    if (response.then.length === 4) {
        response.then(this.resolve, this.reject, this.progress, this);
    } else {
        response.then(bind(this.resolve, this), bind(this.reject, this), bind(this.progress, this));
    }

    return this;
};

/**
 *
 * @returns {Response}
 */
Response.prototype.done = function () {
    return this.always(this.destroy);
};

/**
 *
 * @example
 * var r = new Response()
 *   .resolve(3) // resolve one result
 *   .getResult() // 3, returns result
 *
 * r
 *   .resolve(1, 2) // resolve more results
 *   .getResult() // [1, 2], returns a results array
 *
 * r.getResult(1) // 2, returns result on a index
 *
 * r.getResult(['foo', 'bar']) // {foo: 1, bar: 2}, returns a hash results
 *
 * r
 *   .setKeys(['foo', 'bar']) // sets a default keys
 *   .getResult('bar') // 2, returns result on a default key
 *
 * @param {String|Number} [key]
 * @returns {*}
 * @throws {Error}
 */
Response.prototype.getResult = function (key) {
    if (this.isRejected()) {
        return;
    }

    switch (typeof key) {
        case 'string':
        case 'number':
            return toObject(this.getStateData(key));
            break;
        default:
            if (this.stateData.length === 1) {
                return toObject(this.stateData[0]);
            } else {
                return this.toObject(key);
            }
            break;
    }
};

/**
 *
 * @returns {Error|null}
 */
Response.prototype.getReason = function () {
    return this.isRejected() ? this.stateData[0] : null;
};

/**
 *
 * @param {Array} [stack=[]]
 * @param {Boolean} [start=false]
 * @constructor
 * @extends {Response}
 * @returns {Queue}
 */
function Queue(stack, start) {
    this.Response();

    this.stack = isArray(stack) ? stack : [];
    this.item = null;
    this.isStarted = false;
    this.isStrict = this.isStrict;
    this
        .onState(STATE_RESOLVED, this.stop)
        .onState(STATE_REJECTED, this.stop);

    this.keys.length = this.stack.length;

    if (typeof start === 'boolean' && start) {
        this.start();
    }

    return this;
}

/**
 * @const
 * @default 'start'
 * @type {String}
 */
Queue.EVENT_START = EVENT_START;

/**
 * @const
 * @default 'stop'
 * @type {String}
 */
Queue.EVENT_STOP = EVENT_STOP;

/**
 * @const
 * @default 'nextItem'
 * @type {String}
 */
Queue.EVENT_NEXT_ITEM = EVENT_NEXT_ITEM;

/**
 *
 * @function
 */
Queue.create = State.create;

/**
 *
 * @static
 * @param {Function} fnc
 * @param {Array} [args]
 * @param {Object} [context]
 * @type {Function}
 * @returns {Queue}
 */
Queue.invoke = State.invoke;

/**
 *
 * @param {Queue|*} [object]
 * @returns {Boolean}
 */
Queue.isQueue = function (object) {
    return object != null && object.isQueue;
};

Queue.prototype = Response.create(Queue);

Queue.prototype.Response = Response;

/**
 * @type {Boolean}
 * @const
 * @default true
 */
Queue.prototype.isQueue = true;

/**
 * @readonly
 * @default false
 * @type {Boolean}
 */
Queue.prototype.isStrict = false;

/**
 * @readonly
 * @type {Boolean}
 * @default false
 */
Queue.prototype.isStarted = false;

/**
 * @readonly
 * @type {Array}
 * @default null
 */
Queue.prototype.stack = null;

/**
 * @readonly
 * @type {*}
 * @default null
 */
Queue.prototype.item = null;

/**
 *
 * @returns {Queue}
 */
Queue.prototype.start = function () {
    if (!this.isStarted && this.isPending()) {
        this.isStarted = true;

        emit(this, EVENT_START, []);

        iterate(this);
    }

    return this;
};

/**
 *
 * @returns {Queue}
 */
Queue.prototype.stop = function () {
    if (this.isStarted === true) {
        this.isStarted = false;

        if (this.stack.length === 0) {
            this.item = null;
        }

        emit(this, EVENT_STOP, []);
    }

    return this;
};

/**
 *
 * @param {Response|Function|*} item
 * @param {String} [name=item.name]
 * @returns {Queue}
 */
Queue.prototype.push = function (item, name) {
    if (arguments.length > 1) {
        if (!isArray(this.keys)) {
            this.keys = [];
        }

        this.keys[this.stack.length + this.stateData.length] = name;
    }

    this.stack.push(item);

    return this;
};

/**
 * @param {Boolean} [flag=true]
 * @returns {Queue}
 */
Queue.prototype.strict = function (flag) {
    this.isStrict = arguments.length ? Boolean(flag) : true;

    return this;
};

/**
 * @param {Boolean} [recursive=false]
 * @returns {Queue}
 */
Queue.prototype.destroy = function (recursive) {
    if (recursive === true) {
        destroyItems(this.stack.concat(this.stateData));
    }

    destroy(this);

    return this;
};

/**
 *
 * @param {Function|EventEmitter} listener
 * @param {Object} [context=this]
 * @returns {Queue}
 */
Queue.prototype.onStart = function (listener, context) {
    this.on(EVENT_START, listener, context);

    return this;
};

/**
 *
 * @param {Function|EventEmitter} listener
 * @param {Object} [context=this]
 * @returns {Queue}
 */
Queue.prototype.onStop = function (listener, context) {
    this.on(EVENT_STOP, listener, context);

    return this;
};

/**
 *
 * @param {Function|EventEmitter} listener
 * @param {Object} [context=this]
 * @returns {Queue}
 */
Queue.prototype.onNextItem = function (listener, context) {
    this.on(EVENT_NEXT_ITEM, listener, context);

    return this;
};

/**
 * Exports: {@link Response}
 * @exports Response
 */
module.exports = Response;

/**
 *
 * @param {Queue} queue
 */
function iterate(queue) {
    if (!queue.isStarted) {
        return;
    }

    while (queue.stack.length) {
        if (checkFunction(queue, queue.item) || emitNext(queue, queue.item) || checkResponse(queue, queue.item)) {
            return;
        }

        queue.stateData.push(queue.stack.shift());
    }

    queue.setState(STATE_RESOLVED, queue.stateData);
}

/**
 *
 * @param {Queue} queue
 * @param {*} item
 * @returns {Boolean}
 */
function checkFunction(queue, item) {
    if (isFunction(queue.item)) {
        var results;

        if (Response.isResponse(item)) {
            results = item.state === STATE_RESOLVED ? item.stateData : null;
        } else {
            results = [item];
        }

        queue.stack[0] = queue.invoke.call(queue.isStrict ? queue : null, queue.item, results, queue);
    }

    queue.item = queue.stack[0];

    return !queue.isStarted;
}

/**
 *
 * @param {Queue} queue
 * @param {*} item
 * @returns {Boolean}
 */
function emitNext(queue, item) {
    emit(queue, EVENT_NEXT_ITEM, [item]);

    return !queue.isStarted;
}

function checkResponse(queue, item) {
    if (item && Response.isResponse(item) && item !== queue) {
        if (item.state === STATE_REJECTED && queue.isStrict) {
            queue.setState(STATE_REJECTED, item.stateData);

            return true;
        } else if (item.state !== STATE_RESOLVED) {
            item
                .onceState(STATE_RESOLVED, onEndStackItem, queue)
                .onceState(STATE_REJECTED, queue.isStrict ? queue.reject : onEndStackItem, queue);

            return true;
        }
    }
}

/**
 * @this {Queue}
 */
function onEndStackItem() {
    if (this.isStarted) {
        this.stateData.push(this.stack.shift());

        iterate(this);
    }
}

/**
 *
 * @param {*|Array} object
 * @returns {Array}
 */
function wrapIfArray(object) {
    return isArray(object) ? object : [object];
}

/**
 *
 * @param {*} object
 * @returns {Boolean}
 */
function isFunction(object) {
    return typeof object === 'function';
}

/**
 *
 * @param {*} item
 * @returns {Boolean}
 */
function isCompatible(item) {
    return item != null && isFunction(item.then);
}

/**
 *
 * @param {*|Error} value
 * @returns {Error}
 */
function toError(value) {
    return value != null && (value instanceof Error) ? value : new Error(String(value));
}

/**
 *
 * @param {State} object
 * @param {*} state
 * @param {Array} data
 */
function changeState(object, state, data) {
    object.stopEmit(object.state);
    object.state = state;

    emit(object, state, data);

    if (object.state === state) {
        emit(object, EVENT_CHANGE_STATE, [state]);
    }
}

/**
 *
 * @param {State} item
 */
function destroy(item) {
    var keys = getKeys(item);
    var index = keys.length;

    while (index) {
        item[keys[--index]] = undefined;
    }
}

/**
 *
 * @param {Array} items
 */
function destroyItems(items) {
    var index = items.length;
    var item;

    while (index) {
        item = items[--index];

        if (State.isState(item)) {
            item.destroy(true);
        }
    }
}

/**
 *
 * @param {Object} item
 * @returns {Object}
 */
function toObject(item) {
    return (item && item.toObject) ? item.toObject() : item;
}

/**
 *
 * @param {State} emitter
 * @param {Function|EventEmitter} listener
 * @param {*} context
 * @returns {*}
 */
function invokeListener(emitter, listener, context) {
    if (isFunction(listener)) {
        emitter.invoke(listener, emitter.stateData, context);
    } else if (listener && isFunction(listener.emit)) {
        emit(listener, emitter.state, emitter.stateData);
    } else {
        throw new Error(EventEmitter.LISTENER_TYPE_ERROR);
    }
}

/**
 *
 * @param {State} emitter
 * @param {String} type
 * @param {Array} data
 */
function tryEmit(emitter, type, data) {
    try {
        switch (data.length) {
            case 0:
                emitter.emit(type);
                break;
            case 1:
                emitter.emit(type, data[0]);
                break;
            case 2:
                emitter.emit(type, data[0], data[1]);
                break;
            case 3:
                emitter.emit(type, data[0], data[1], data[2]);
                break;
            case 4:
                emitter.emit(type, data[0], data[1], data[2], data[3]);
                break;
            case 5:
                emitter.emit(type, data[0], data[1], data[2], data[3], data[4]);
                break;
            default:
                emitter.emit.apply(emitter, [type].concat(data));
        }
    } catch (error) {
        emitter.setState(STATE_ERROR, [toError(error)]);
    }
}

/**
 *
 * @param {State} emitter
 * @param {String} type
 * @param {Array} data
 */
function emit(emitter, type, data) {
    if (emitter._events && emitter._events[type]) {
        tryEmit(emitter, type, data);
    }
}

/**
 *
 * @param {Object} from
 * @param {Object} to
 */
function copy(from, to) {
    var properties = Object.keys(from);
    var index = 0;
    var name;

    while (name = properties[index++]) {
        to[name] = from[name];
    }
}

/**
 *
 * @param {Function} superConst
 * @param {Function} [constructor]
 * @returns {Object}
 */
function inherits(superConst, constructor) {
    Prototype.prototype = superConst.prototype;

    var proto = new Prototype();

    if (constructor) {
        copy(constructor.prototype, proto);
        defineConstructor(proto, constructor);

        constructor.prototype = proto;
    }

    return proto;
}

/**
 *
 * @constructor
 */
function Prototype() {
    Prototype.prototype = null;
}
