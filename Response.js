'use strict';
/**
 * @fileOverview Response.
 */

var EventEmitter = require('EventEmitter');
var toString = Object.prototype.toString;
var nativeEmit = EventEmitter.prototype.emit;

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
    this.data = this.data || {};
    this.stateData = new Array(0);
    this.keys = null;

    return this;
}

/**
 * Проверяет, я вляется ли объект экземпляром конструктора {@link State}.
 * @param {Object} [object] Проверяемый объект.
 * @returns {Boolean}
 * @static
 */
State.isState = function (object) {
    return object != null && ((object instanceof State) || object.isState);
};

/**
 * Создает объект, который наследует от объекта {@link State}.
 * @function
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
State.create = create;

State.prototype = create.call(EventEmitter, State);

/**
 * Событие изменения состояния.
 * @default 'changeState'
 * @type {String}
 */
State.prototype.EVENT_CHANGE_STATE = 'changeState';

/**
 * Событие изменения состояния.
 * @default 'changeState'
 * @type {String}
 */
State.prototype.STATE_ERROR = 'error';

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
 */
State.prototype.state = null;

/**
 *
 * @type {Array}
 * @default null
 */
State.prototype.keys = null;

/**
 *
 * @type {*}
 * @default null
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
 * @param {Function} method
 * @param {Array} [args]
 * @param {*} [context=this]
 */
State.prototype.invoke = function (method, args, context) {
    var ctx = context == null ? this : context;
    var _args = (args && !isNaN(args.length)) ? args : new Array(0);
    var r;

    try {
        switch (_args.length) {
            case 0:
                r = method.call(ctx);
                break;
            case 1:
                r = method.call(ctx, _args[0]);
                break;
            case 2:
                r = method.call(ctx, _args[0], _args[1]);
                break;
            case 3:
                r = method.call(ctx, _args[0], _args[1], _args[2]);
                break;
            case 4:
                r = method.call(ctx, _args[0], _args[1], _args[2], _args[3]);
                break;
            case 5:
                r = method.call(ctx, _args[0], _args[1], _args[2], _args[3], _args[4]);
                break;
            default:
                r = method.apply(ctx, _args);
        }
    } catch (error) {
        r = toError(error);

        if (this && this.isState) {
            this.setState(this.STATE_ERROR, r);
        }
    }

    return r;
};

/**
 * @param {String} type Тип события.
 * @param {...*} [args] Аргументы, передаваемые в обработчик события.
 * @returns {Boolean|Error}
 */
State.prototype.emit = function (type, args) {
    if (this._events && this._events[type]) {
        var index = arguments.length;
        var data = new Array(index);

        while (index) {
            data[--index] = arguments[index];
        }

        return this.invoke(nativeEmit, data);
    }

    return false;
};

/**
 * Обнуляет все собственные свойства объекта.
 * @returns {State}
 */
State.prototype.destroy = function () {
    for (var property in this) {
        if (this.hasOwnProperty(property)) {
            this[property] = null;
        }
    }

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
 * Затем событие {@link State#EVENT_CHANGE_STATE}.
 * Если новое состояние не передано или объект уже находится в указаном состоянии, события не будут вызваны.
 * @param {*} state Новое сотояние объекта.
 * @param {Array|*} [stateData] Данные, которые будут переданы аргументом в обработчики нового состояния.
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
State.prototype.setState = function (state, stateData) {
    var _state = !this.is(state);
    var _hasData = arguments.length > 1;
    var _data = _hasData ? wrapIfArray(stateData) : new Array(0);

    if (_state || _hasData || _data.length) {
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
    if (this.is(state)) {
        invoke(this, listener, context);
    }

    return this.on(state, listener, context);
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
    if (this.is(state)) {
        invoke(this, listener, context);
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
    return this.on(this.EVENT_CHANGE_STATE, listener, context);
};

/**
 * Отменяет обработку изменения состояния.
 * @param {Function|EventEmitter} [listener] Обработчик, который необходимо отменить.
 *                                           Если обработчик не был передан, будут отменены все обработчики.
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
 * @param {Function} callback
 * @param {Object} [context=this]
 * @throws {Error}
 * @returns {Function}
 */
State.prototype.bind = function (callback, context) {
    if (typeof callback !== 'function') {
        throw new Error('Callback is not a function');
    }

    var _context = context == null ? this : context;

    return function stateCallback() {
        return callback.apply(_context, arguments);
    };
};

/**
 *
 * @param {Array} [keys=this.keys]
 * @returns {Object}
 */
State.prototype.toObject = function (keys) {
    var _keys = keys == null ? this.keys : keys;
    var key;
    var item;
    var result = {};

    if (isArray(_keys)) {
        var length = this.stateData.length;
        var index = 0;

        while (index < length) {
            key = _keys[index];

            if (key != null) {
                item = this.stateData[index];
                result[key] = item && item.toObject && item.toObject() || item;
            }

            index++;
        }
    }

    return result;
};

/**
 *
 * @param {*} key
 * @returns {*}
 */
State.prototype.getByKey = function (key) {
    if (!isArray(this.keys)) {
        return;
    }

    var index = this.keys.length;

    while (index) {
        if (this.keys[--index] === key) {
            return this.stateData[index];
        }
    }
};

/**
 *
 * @param {Number} index
 * @returns {*}
 */
State.prototype.getByIndex = function (index) {
    return this.stateData[index];
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
 * @param {Array} [keys=null]
 * @returns {State}
 */
State.prototype.setKeys = function (keys) {
    this.keys = isArray(keys) ? keys : null;

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
    this.State(this.STATE_PENDING);
    this.callback = this.callback;

    if (Response.isCompatible(parent)) {
        this.listen(parent);
    }

    return this;
}

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
    return object != null && ((object instanceof Response) || object.isResponse);
};

/**
 *
 * @param {*} object
 * @static
 * @returns {Boolean}
 */
Response.isCompatible = function (object) {
    return object != null && isFunction(object.then);
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
Response.create = create;

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

    while (index) {
        stack[--index] = arguments[index];
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

    while (index) {
        stack[--index] = arguments[index];
    }

    return new Queue(stack).strict();
};

Response.prototype = State.create(Response);

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
    this.setState(this.STATE_PENDING);

    return this;
};

/**
 * @param {...*} [results]
 * @returns {Response}
 */
Response.prototype.resolve = function (results) {
    var index = arguments.length;

    if (index || !this.isResolved()) {
        var data = new Array(index);

        while (index) {
            data[--index] = arguments[index];
        }

        this.setState(this.STATE_RESOLVED, data);
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
        this.setState(this.STATE_REJECTED, toError(reason));
    }

    return this;
};

/**
 *
 * @param {*} progress
 * @returns {Response}
 */
Response.prototype.progress = function (progress) {
    if (this.isPending() && this._events && this._events[this.EVENT_PROGRESS]) {
        this.invoke(nativeEmit, new Array(this.EVENT_PROGRESS, progress));
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
        this.state === null ||
        this.state === this.STATE_RESOLVED ||
        this.state === this.STATE_REJECTED
    );
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
 * @param {Function|EventEmitter} [onResolve]
 * @param {Function|EventEmitter} [onReject]
 * @param {Function|EventEmitter} [onProgress]
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
 * @param {Function|EventEmitter} listener
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
 * @param {Function|EventEmitter} listener
 * @param {Object} [context=this]
 * @returns {Response}
 */
Response.prototype.onPending = function (listener, context) {
    this.onceState(this.STATE_PENDING, listener, context);

    return this;
};

/**
 *
 * @param {Function|EventEmitter} listener
 * @param {Object} [context=this]
 * @returns {Response}
 */
Response.prototype.onResolve = function (listener, context) {
    this.onceState(this.STATE_RESOLVED, listener, context);

    return this;
};

/**
 *
 * @param {Function|EventEmitter} listener
 * @param {Object} [context=this]
 * @returns {Response}
 */
Response.prototype.onReject = function (listener, context) {
    this.onceState(this.STATE_REJECTED, listener, context);

    return this;
};

/**
 *
 * @param {Function|EventEmitter} listener
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

    response.then(this.resolve, this.reject, this.progress, this);

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
 * @param {Error|*} [error]
 * @param {...*} [results]
 */
Response.prototype.callback = function defaultResponseCallback(error, results) {
    var index = arguments.length;
    var args;

    if (error == null) {
        if (index <= 1) {
            this.resolve();
        } else {
            args = new Array(--index);

            while (index) {
                args[--index] = arguments[index + 1];
            }

            this.setState(this.STATE_RESOLVED, args);
        }
    } else {
        this.reject(error);
    }
};

/**
 * @example
 * var Response = require('Response');
 * var r = new Response()
 *   .bind(function (data, textStatus, jqXHR) {
 *     if (data && data.error) {
 *        this.reject(data.error);
 *     } else {
 *        this.resolve(data.result);
 *     }
 *   });
 *
 * $.getJSON('ajax/test.json', r.callback);
 *
 * @param {Function} [callback=this.callback]
 * @param {Object} [context=this]
 * @returns {Response}
 */
Response.prototype.makeCallback = function (callback, context) {
    this.callback = this.bind(isFunction(callback) ? callback : this.callback, context);

    return this;
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
 *
 * @param {String|Number|Array|Arguments} [key]
 * @returns {*}
 * @throws {Error}
 */
Response.prototype.getResult = function (key) {
    if (this.isRejected()) {
        return;
    }

    switch (getType(key)) {
        case 'String':
            return this.getByKey(key);
        case 'Number':
            return this.getByIndex(key);
        case 'Array':
        case 'Arguments':
            return this.toObject(key);
        default:
            return this.stateData.length === 1 ? this.stateData[0] : this.stateData;
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

    this.stack = isArray(stack) ? stack : new Array(0);
    this.item = null;
    this.isStrict = this.isStrict;
    this.isStarted = this.isStarted;
    this
        .onState(this.STATE_RESOLVED, this.stop)
        .onState(this.STATE_REJECTED, this.stop);

    if (getType(start) === 'Boolean' ? start.valueOf() : false) {
        this.start();
    }

    return this;
}

Queue.create = create;

/**
 *
 * @param {Queue|*} [object]
 * @returns {Boolean}
 */
Queue.isQueue = function (object) {
    return (object instanceof Queue) || object && object.isQueue;
};

Queue.prototype = Response.create(Queue);

Queue.prototype.Response = Response;

/**
 * @default 'start'
 * @type {String}
 */
Queue.prototype.EVENT_START = 'start';

/**
 * @default 'stop'
 * @type {String}
 */
Queue.prototype.EVENT_STOP = 'stop';

/**
 * @default 'nextItem'
 * @type {String}
 */
Queue.prototype.EVENT_NEXT_ITEM = 'nextItem';

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
        this.invoke(nativeEmit, wrapToArray(this.EVENT_START));

        queueIterator(this);
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

        if (!this.isPending()) {
            this.stack.length = 0;
            this.item = null;
        }

        this.invoke(nativeEmit, new Array(this.EVENT_STOP, this.item));
    }

    return this;
};

/**
 * @param {...*} [args]
 * @returns {Queue}
 */
Queue.prototype.push = function (args) {
    var length = arguments.length;
    var index = 0;
    var stackIndex = this.stack.length;

    while (index < length) {
        this.stack[stackIndex++] = arguments[index++];
    }

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
 *
 * @param {Function|EventEmitter} listener
 * @param {Object} [context=this]
 * @returns {Queue}
 */
Queue.prototype.onStart = function (listener, context) {
    this.on(this.EVENT_START, listener, context);
    return this;
};

/**
 *
 * @param {Function|EventEmitter} listener
 * @param {Object} [context=this]
 * @returns {Queue}
 */
Queue.prototype.onStop = function (listener, context) {
    this.on(this.EVENT_STOP, listener, context);
    return this;
};

/**
 *
 * @param {Function|EventEmitter} listener
 * @param {Object} [context=this]
 * @returns {Queue}
 */
Queue.prototype.onNextItem = function (listener, context) {
    this.on(this.EVENT_NEXT_ITEM, listener, context);
    return this;
};

/**
 *
 * @returns {Queue}
 */
Queue.prototype.destroyItems = function () {
    var index = this.stateData.length;

    while (index) {
        var item = this.stateData[--index];

        if (State.isState(item)) {
            item.destroy();
        }
    }

    return this;
};

/**
 * Exports: {@link Response}
 * @exports Response
 */
module.exports = Response;

function queueIterator(queue) {
    if (!queue.isStarted) {
        return;
    }

    while (queue.stack.length) {
        if (checkFunction(queue) || changeItem(queue) || checkResponse(queue)) {
            return;
        }
    }

    queue.setState(queue.STATE_RESOLVED, queue.stateData);
}

// TODO: fixed "Did not inline State.onceState called from checkResponse (cumulative AST node limit reached)."
function checkFunction(queue) {
    var results;
    var item = queue.stack.shift();

    if (isFunction(item)) {
        var current = queue.item;

        if (Response.isResponse(queue.item)) {
            results = current.state === current.STATE_RESOLVED ? current.stateData : null;
        } else {
            results = wrapToArray(current);
        }

        item = queue.invoke.call(queue.isStrict ? queue : null, item, results, queue);
    }

    if (queue.isPending()) {
        queue.stateData.push(item);
        queue.item = item;
    }

    return !queue.isStarted;
}

function changeItem(queue) {
    queue.invoke(nativeEmit, new Array(queue.EVENT_NEXT_ITEM, queue.item));

    return !queue.isStarted;
}

function checkResponse(queue) {
    var item = queue.item;

    if (item && Response.isResponse(item) && item !== queue) {
        if (item.state === item.STATE_REJECTED && queue.isStrict) {
            queue.setState(queue.STATE_REJECTED, item.stateData);

            return true;
        } else if (item.state !== item.STATE_RESOLVED) {
            item
                .onceState(item.STATE_RESOLVED, onEndStackItem, queue)
                .onceState(item.STATE_REJECTED, queue.isStrict ? queue.reject : onEndStackItem, queue);

            return true;
        }
    }
}

function onEndStackItem() {
    queueIterator(this);
}

function getType(object) {
    return toString.call(object).slice(8, -1);
}

function isArray(object) {
    return object && (toString.call(object).slice(8, -1) === 'Array');
}

function wrapIfArray(object) {
    return isArray(object) ? object : wrapToArray(object);
}

function wrapToArray(item) {
    var _array = new Array(1);
    _array[0] = item;
    return _array;
}

function isFunction(object) {
    return typeof object === 'function';
}

function toError(value) {
    return value != null && (getType(value) === 'Error' || value instanceof Error) ? value : new Error(value);
}

function changeState(object, state, data) {
    var _events = object._events;

    object.stopEmit(object.state);
    object.state = state;

    if (_events) {
        if (_events[state]) {
            object.invoke(nativeEmit, wrapToArray(state).concat(data));
        }

        if (_events[object.EVENT_CHANGE_STATE] && object.is(state)) {
            object.invoke(nativeEmit, new Array(object.EVENT_CHANGE_STATE, state));
        }
    }
}

function invoke(emitter, listener, context) {
    if (isFunction(listener)) {
        emitter.invoke(listener, emitter.stateData, context);
    } else if(isFunction(emitter && emitter.then)) {
        if (emitter._events && emitter._events[emitter.state]) {
            emitter.invoke(nativeEmit, wrapToArray(emitter.state).concat(emitter.stateData));
        }
    } else {
        throw new Error(EventEmitter.LISTENER_TYPE_ERROR);
    }
}

function Constructor(constructor, parent, sp) {
    var prototype = parent.prototype;
    var name;

    for (name in prototype) {
        if (prototype.hasOwnProperty(name) && name !== 'constructor') {
            this[name] = prototype[name];
        }
    }

    if (constructor) {
        this.constructor = constructor;

        constructor.prototype = this;

        if (sp === true) {
            for (name in parent) {
                if (parent.hasOwnProperty(name)) {
                    constructor[name] = parent[name];
                }
            }
        }
    }

    Constructor.prototype = null;
}

function create(constructor, sp) {
    Constructor.prototype = this.prototype;

    return new Constructor(constructor, this, sp);
}
