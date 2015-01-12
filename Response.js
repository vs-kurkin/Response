'use strict';
/**
 * @fileOverview Response.
 */

var EventEmitter = require('EventEmitter');
var toString = Object.prototype.toString;
var nativeEmit = EventEmitter.prototype.emit;
var undefined = void 0;

/**
 *
 * @param {*} [state] Начальное состояние объекта.
 * @returns {State}
 * @constructor
 * @extends EventEmitter
 */
function State(state) {
    EventEmitter.call(this);

    this.state = arguments.length ? state : this.state;
    this.data = this.data || {};
    this.stateData = new Array(0);

    return this;
}

/**
 * Проверяет, я вляется ли объект экземпляром конструктора {@link State}.
 * @param {Object} [object] Проверяемый объект.
 * @returns {Boolean}
 */
State.isState = function (object) {
    return (object instanceof State) || object && object.isState;
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
 * @param {String} type Тип события.
 * @param {...*} [args] Аргументы, передаваемые в обработчик события.
 * @returns {Boolean}
 */
State.prototype.emit = function (type, args) {
    var index = arguments.length;
    var data = new Array(0);

    while (index) {
        data[--index] = arguments[index];
    }

    return emit(this, data);
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
    var _data = arguments.length > 1 && toArray(stateData);

    if (_data && (_state || _data.length)) {
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
 * @param {Function|EventEmitter} [listener] Обрабо1тчик состояния.
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
 * @param {Response} [parent]
 * @constructor
 * @requires EventEmitter
 * @extends {State}
 * @returns {Response}
 */
function Response(parent) {
    this.State(this.STATE_PENDING);

    this.context = null;
    this.callback = null;
    this.keys = null;

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
    return (object instanceof Response) || object && object.isResponse;
};

/**
 *
 * @param {*} object
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
 *
 * @param {Function|String} method
 * @param {...*} [args]
 * @returns {Response}
 */
Response.invoke = function (method, args) {
    var response = new Response().makeCallback();
    var index = arguments.length;
    var data = new Array(index);

    while (index--) {
        data[index] = arguments[index];
    }

    return call(response, response.invoke, null, data);
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
 * @param {String|Number|Array|Arguments} [keys=null]
 * @returns {Response}
 */
Response.prototype.setKeys = function (keys) {
    this.keys = arguments.length ? keys : null;

    return this;
};

/**
 *
 * @param {Function} callback
 * @param {Object} [context=this]
 * @returns {Function}
 */
Response.prototype.bind = function (callback, context) {
    if (!isFunction(callback)) {
        throw new Error('Callback is not a function');
    }

    var _context = context == null ? this : context;

    return function responseCallback() {
        return callback.apply(_context, arguments);
    };
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
    var index = arguments.length;
    var data = new Array(index);

    while (index--) {
        data[index] = arguments[index];
    }

    this.setState(this.STATE_RESOLVED, data);

    return this;
};

/**
 *
 * @param {*} reason
 * @returns {Response}
 */
Response.prototype.reject = function (reason) {
    this.setState(this.STATE_REJECTED, new Array(reason == null ? 0 : toError(reason)));

    return this;
};

/**
 *
 * @param {*} progress
 * @returns {Response}
 */
Response.prototype.progress = function (progress) {
    if (this.isPending() && this._events && this._events[this.EVENT_PROGRESS]) {
        this.emit(this.EVENT_PROGRESS, progress);
    }

    return this;
};

/**
 *
 * @returns {Boolean}
 */
Response.prototype.isPending = function () {
    return !(this.isResolved() || this.isRejected());
};

/**
 *
 * @returns {Boolean}
 */
Response.prototype.isResolved = function () {
    return this.is(this.STATE_RESOLVED);
};

/**
 *
 * @returns {Boolean}
 */
Response.prototype.isRejected = function () {
    return this.is(this.STATE_REJECTED);
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
 * @throws {Error} Бросает исключение, если response равен this.
 * @returns {Response}
 * @this {Response}
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

            call(this, this.resolve, null, arg);
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
 * @param {Function} [callback=Response.callback]
 * @param {Object} [context=this]
 * @returns {Response}
 */
Response.prototype.makeCallback = function (callback, context) {
    this.callback = this.bind(isFunction(callback) ? callback : Response.prototype.callback, context);

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
 * @throws {Error} Бросает исключение, если методом является строка и response не привязан к объекту,
 *                 либо метод не является функцией.
 * @returns {*} Результат работы метода method
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

    if (isFunction(_method)) {
        index = arguments.length - 1;
        arg = new Array(index);

        while (index--) {
            arg[index] = arguments[index + 1];
        }

        if (!this.isPending()) {
            this.pending();
        }

        return call(this, _method, context, arg);
    }

    return this.reject(new Error('Method is not a function.'));
};

/**
 *
 * @param {Function} callback
 * @param {Object} [context=this]
 */
Response.prototype.spread = function (callback, context) {
    call(this, callback, context == null ? this : context, this.stateData);

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
 * @param {String|Number|Array|Arguments} [key=this.keys]
 * @returns {*|null}
 * @throws {Error}
 */
Response.prototype.getResult = function (key) {
    if (!this.isResolved()) {
        return undefined;
    }

    var keys = arguments.length ? key : this.keys;
    var stateData = this.stateData;
    var result;
    var index;
    var length;
    var _key;

    switch (getType(keys)) {
        case 'String':
            if (!isArray(this.keys)) {
                throw new Error('Default keys must be a array');
            }

            index = this.keys.length;

            while (index--) {
                if (this.keys[index] === keys) {
                    return stateData[index];
                }
            }

            return undefined;

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
                    result[_key] = stateData[index];
                }

                index++;
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
    return this.isRejected() ? this.stateData[0] : null;
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
    this.isStrict = this.isStrict;
    this.isStarted = this.isStarted;
    this.always(this.stop);

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
State.prototype.isQueue = true;

/**
 * @readonly
 * @default false
 * @type {Boolean}
 */
Queue.prototype.isStrict = false;

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
 * @readonly
 * @type {Boolean}
 * @default false
 */
Queue.prototype.isStarted = false;

/**
 *
 * @returns {Queue}
 */
Queue.prototype.start = function () {
    if (!this.isPending()) {
        return this;
    }

    var stack = this.stack;
    var item = this.item;

    while (stack.length) {
        this.item = stack.shift();

        if (!this.isStarted) {
            this.isStarted = true;

            this.emit(this.EVENT_START);

            if (!this.isStarted) {
                return this;
            }
        }

        if (isFunction(this.item)) {
            this.item = call(this, this.item, null, [item]);

            if (!this.isStarted) {
                return this;
            }
        }

        item = this.item;

        this.emit(this.EVENT_NEXT_ITEM, item);

        if (!this.isStarted) {
            return this;
        }

        this.stateData.push(item);

        if (item && Response.isResponse(item)) {
            if (item === this) {
                continue;
            }

            if (item.isPending()) {
                item
                    .onResolve(this.start, this)
                    .onReject(this.isStrict ? this.reject : this.start, this);

                return this;
            } else if (item.isRejected() && this.isStrict) {
                this.reject();

                return this;
            }
        }
    }

    if (stack.length === 0) {
        call(this, this.resolve, null, this.stateData);
    }

    return this;
};

/**
 *
 * @returns {Queue}
 */
Queue.prototype.stop = function () {
    this.isStarted = false;

    this.emit(this.EVENT_STOP, this.item);

    if (!this.isStarted) {
        this.item = null;
    }

    return this;
};

/**
 * @param {...*} [args]
 * @returns {Queue}
 */
Queue.prototype.push = function (args) {
    var index = arguments.length;
    var stackIndex = this.stack.length;

    while (index--) {
        this.stack[stackIndex++] = arguments[index];
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

function getType(object) {
    return toString.call(object).slice(8, -1);
}

function isArray(value) {
    return value && getType(value) === 'Array';
}

function isFunction(object) {
    return typeof object === 'function';
}

function toArray(object) {
    return getType(object) === 'Array' ? object : wrap(object);
}

function wrap(item) {
    var _array = new Array(1);
    _array[0] = item;
    return _array;
}

function toError(value) {
    return value == null || getType(value) !== 'Error' ? new Error(value) : value;
}

function setReason(object, error) {
    if (object.isRejected()) {
        object.stateData[0] = toError(error);
    } else {
        object.reject(error);
    }

    return object;
}

function changeState(object, state, data) {
    var _events = object._events;

    object.stopEmit(object.state);

    object.state = state;

    if (_events) {
        if (state === 'error' || _events[state]) {
            call(object, object.emit, null, wrap(state).concat(data));
        }

        if (_events[object.EVENT_CHANGE_STATE] && object.is(state)) {
            object.emit(object.EVENT_CHANGE_STATE, state);
        }
    }
}

function invoke(emitter, listener, context) {
    if (isFunction(listener)) {
        call(emitter, listener, context, emitter.stateData);
    } else {
        emit(emitter, wrap(emitter.state).concat(emitter.stateData));
    }
}

function call(emitter, method, context, data) {
    var ctx = context == null ? emitter : context;

    try {
        var r;

        switch (data.length) {
            case 0: r = method.call(ctx); break;
            case 1: r = method.call(ctx, data[0]); break;
            case 2: r = method.call(ctx, data[0], data[1]); break;
            case 3: r = method.call(ctx, data[0], data[1], data[2]); break;
            case 4: r = method.call(ctx, data[0], data[1], data[2], data[3]); break;
            case 5: r = method.call(ctx, data[0], data[1], data[2], data[3], data[4]); break;
            default: r = method.apply(ctx, data);
        }

        return r;
    } catch (error) {
        emitter.setState(emitter.STATE_ERROR, [error]);
    }
}

function emit(emitter, data) {
    return call(emitter, nativeEmit, null, data);
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
