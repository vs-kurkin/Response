'use strict';
/**
 * @fileOverview Response.
 */

var EventEmitter = require('EventEmitter');
var toString = Object.prototype.toString;

/**
 * Constants
 */
var EVENT_CHANGE_STATE = 'changeState';
var STATE_ERROR = 'error';

var STATE_PENDING = 'pending';
var STATE_RESOLVED = 'resolve';
var STATE_REJECTED = 'error';
var EVENT_PROGRESS = 'progress';

var EVENT_START = 'start';
var EVENT_STOP = 'stop';
var EVENT_NEXT_ITEM = 'nextItem';
var EVENT_ITEM_REJECTED = 'itemRejected';

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
 * Конструктор объекта "Состояние".
 * @param {*} [state=null] Значение начального состояние объекта.
 * @returns {State}
 * @constructor
 * @extends {EventEmitter}
 * @see https://ru.wikipedia.org/wiki/Состояние_(шаблон_проектирования)
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
 * В обработчики события передается единственный аргумент - новое значение состояния.
 * @const
 * @default 'changeState'
 * @type {String}
 */
State.EVENT_CHANGE_STATE = EVENT_CHANGE_STATE;

/**
 * Встроенное состояние ошибки.
 * Объект {@link State} автоматически переходит в состояние 'error' в случаях, когда функция,
 * вызываемая методами {@link State.invoke} и {@link State#invoke}, выбросила исключение,
 * либо обработчик события (или состояния) выбросил исключение.
 * @const
 * @default 'error'
 * @type {String}
 */
State.STATE_ERROR = STATE_ERROR;

/**
 * Проверяет, я вляется ли объект экземпляром конструктора {@link State}, либо наследует от него.
 * @param {Object} [object] Проверяемый объект.
 * @returns {Boolean} Результат проверки.
 * @static
 */
State.isState = function (object) {
    return object != null && object.isState;
};

/**
 * Создает объект, который наследует от объекта {@link State.prototype}.
 * Метод может использоваться как для создания
 * Если метод используется для создания наследования (передан конструктор), будут выполнены следующие действия:
 *  - в созданный объект будут скопированы свойства из this.prototype
 *  - в созданном объекте будет создано свойство constructor с ссылкой на переданый конструктор
 *  - созданный объект будет сохранен в свойстве constructor.prototype
 * Создание объекта происходит без вызова конструктора.
 * @param {Function} [constructor] Конструктор, экземпляры которого должны наследовать от созданного объекта.
 * @param {Boolean} [copyStatic=false] Флаг, указывающий на необходимость копирования собственных свойст из текущего контекста в объект constructor.
 * @static
 * @returns {Object} Созданный объект.
 * @example
 * function Const () {}
 *
 * State.create(Const);
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
 * Статический аналог метода {@link State#invoke}.
 * @static
 * @param {Function} fnc Функция, которая будет выполнена методом {@link State#invoke} в контексте созданного объекта.
 * @param {Array} [args] Аргументы, с которыми будет выполнена функция.
 * @param {Object} [context={State}] Контекст выполнения функции.
 * @returns {State} Созданный объект {@link State}, в контексте которого вызывается {@link State#invoke}.
 */
State.invoke = function (fnc, args, context) {
    var state = new this();

    state.invoke(fnc, args, context);

    return state;
};

State.prototype = State.create.call(EventEmitter, State);

/**
 * Свойство, указывающее на то, что объект наследует от {@link State}.
 * @type {Boolean}
 * @const
 * @default true
 */
State.prototype.isState = true;

/**
 * Текущее состояние объекта.
 * @readonly
 * @type {String|*}
 * @default null
 */
State.prototype.state = null;

/**
 * Ключи для данных состояния {@link State#stateData}.
 * @type {Array}
 * @default []
 */
State.prototype.keys = null;

/**
 * Пространство имен для пользовательских данных.
 * @type {Object}
 * @default {}
 */
State.prototype.data = null;

/**
 * Данные стостояния. Элементы массива передаются аргументами в обработчики состояния.
 * @readonly
 * @type {Array}
 * @default []
 */
State.prototype.stateData = null;

/**
 * Безопасный вызов функции.
 * Если функция выбросит исключение, объект {@link State} перейдет в состояние {@link State.STATE_ERROR}.
 * @param {Function} fnc Выполняемая функция.
 * @param {Array} [args=[]] Аргументы функции.
 * @param {*} [context=this] Контекст выполнения функции.
 * @returns {*|Error} Результат, который вернет выполняемая функция, либо объект ошибки, если функция выбросила исключение.
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
 * @param {Boolean} [recursive=false] Если флаг был установлен в true, для всех объектов {@link State},
 *                                    находящихся в {@link State#stateData}, будет вызван метод {@link State#destroy} c
 *                                    аргументом recursive, равным true.
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
 * Изменяет состояние объекта (если объект находится в другом состоянии) с заменой данных состояния.
 * После изменения состояния, первым будет вызвано событие с именем, равным новому значению состояния.
 * Если в итоге состояние было изменено, будет вызвано событие {@link State.EVENT_CHANGE_STATE}.
 * Если объект уже находится в указаном состоянии, события не будут вызваны.
 * @param {*} state Новое сотояние объекта.
 * @param {Array|*} [data] Новые данные состояния.
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
    var _data = _hasData ? wrapIfNotArray(data) : [];

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
 * Удаляет обработчик изменения состояния.
 * @param {Function|EventEmitter} [listener] Обработчик, который необходимо удалить.
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
 * Устанавливает пользовательские данные в пространство имен {@link State#data}.
 * @param {String} key Ключ, по которому будут доступны данные.
 * @param {*} [value] Пользовательские данные.
 * @returns {State}
 */
State.prototype.setData = function (key, value) {
    this.data[key] = value;

    return this;
};

/**
 * Возвращает пользовательские данные из пространства имен {@link State#data} по ключу key,
 * либо все данные, если ключ не был передан.
 * @param {String} [key] Ключ пользовательских данных.
 * @returns {*}
 */
State.prototype.getData = function (key) {
    return arguments.length ? this.data[key] : this.data;
};

/**
 * Возвращает данные состояния, соответствующие ключу key.
 * @param {*} key Ключ данных состояния, указаный в {@link State#keys}.
 * @returns {*|undefined} Данные состояния, либо undefined, если данные с таким ключем отсутствуют.
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
 * Трансформирует объект в хеш данных текущего состояния.
 * Имена свойств результирующего объекта передаются массивом keys, либо берутся из {@link State#keys}.
 * Значениями свойств являются данные из {@link State#stateData}.
 * Если ключи отсутствуют, метод вернет пустой объект.
 * @param {Array} [keys=this.keys] Ключи для создаваемого объекта.
 *                                  Порядок ключей должен соответствовать порядку данных в {@link State#stateData}.
 * @returns {Object} Результат трансформации.
 */
State.prototype.toObject = function (keys) {
    var _keys = isArray(keys) ? keys : this.keys;
    var length = this.stateData.length;
    var index = 0;
    var result = {};
    var key;

    if (length === 0 || _keys.length === 0) {
        return result;
    }

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
 * Трансформирует объект в JSON-объект с использованием метода {@link State#toObject}.
 * @returns {Object}
 */
State.prototype.toJSON = function () {
    return this.toObject();
};

/**
 * Устанавливает новые ключи для данных состояния.
 * @param {String[]} [keys=[]] Массив ключей.
 * @returns {State}
 */
State.prototype.setKeys = function (keys) {
    this.keys = isArray(keys) ? keys : [];

    return this;
};

/**
 *
 * @param {Response|Promise} [parent]
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
Response.prototype.any = function (listener, context) {
    if (this.isResolved() || this.isRejected()) {
        invokeListener(this, listener, context);
    } else {
        this.then(onAny, onAny, null, {
            response: this,
            listener: listener,
            context: context
        });
    }

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
 * @param {Response|Deferred} object
 * @throws {Error} Бросает исключение, если parent равен this.
 * @returns {Response}
 * @this {Response}
 */
Response.prototype.notify = function (object) {
    if (object) {
        if (object === this) {
            throw new Error('Can\'t notify itself');
        }

        var onProgress = Response.isResponse(object) ? object.progress : object.notify;

        this.then(object.resolve, object.reject, onProgress, object);
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
 * @param {Response|Promise} object
 * @this {Response}
 * @throws {Error} Бросает исключение, если object равен this.
 * @returns {Response}
 */
Response.prototype.listen = function (object) {
    if (object === this) {
        throw new Error('Cannot listen on itself');
    }

    if (!this.isPending()) {
        this.pending();
    }

    then(object, this.resolve, this.reject, this.progress, this);

    return this;
};

/**
 *
 * @returns {Response}
 */
Response.prototype.done = function () {
    return this.any(this.destroy);
};

/**
 *
 * @returns {Response}
 */
Response.prototype.fork = function () {
    return new Response(this);
};

/**
 *
 * @param {Function} listener
 * @param {*} [context=this]
 * @returns {Response}
 */
Response.prototype.map = function (listener, context) {
    var _context = {
        response: this,
        listener: listener,
        context: context
    };

    if(this.isResolved()) {
        onMap.call(_context);
    } else {
        this.onResolve(onMap, _context);
    }

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
 * @param {String|Number|String[]|Number[]} [key]
 * @returns {*}
 * @throws {Error}
 */
Response.prototype.getResult = function (key) {
    if (this.isRejected()) {
        return;
    }

    if (typeof key === 'string' || typeof key === 'number') {
        return getResponseResults(this.getStateData(key));
    }

    if (this.keys.length === 0) {
        return getResponseResults(this.stateData[0]);
    }

    var _key;
    var keys = isArray(key) ? key : this.keys;
    var length = this.stateData.length;
    var index = 0;
    var result = {};

    while (index < length) {
        _key = keys[index];

        if (_key != null) {
            result[_key] = getResponseResults(this.stateData[index]);
        }

        index++;
    }

    return result;

};

/**
 *
 * @returns {Error|undefined}
 */
Response.prototype.getReason = function () {
    if (this.isRejected()) {
        return this.stateData[0];
    }
};

/**
 *
 * @param {Response[]|Promise[]|Function[]|*[]} [items=[]]
 * @param {Boolean} [start=false]
 * @constructor
 * @extends {Response}
 * @returns {Queue}
 */
function Queue(items, start) {
    this.Response();

    this.items = isArray(items) ? items : [];
    this.keys.length = this.items.length;
    this.item = null;
    this.isStarted = false;
    this.isStrict = this.isStrict;
    this.context = this;
    this
        .onState(STATE_RESOLVED, this.stop)
        .onState(STATE_REJECTED, this.stop);


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
Queue.prototype.items = null;

/**
 * @readonly
 * @type {*}
 * @default null
 */
Queue.prototype.item = null;

/**
 * Контекст выполнения всех задач очереди
 * @readonly
 * @type {*}
 * @default null
 */
Queue.prototype.context = null;

/**
 * @param {Array} args - аргументы для первой задачи
 * @returns {Queue}
 */
Queue.prototype.start = function (args) {
    if (arguments.length > 0) {
        if (!isArray(args)) {
            this.reject(new Error('start arguments must be an array'));
        }

        this.item = (new Response()).setState(Response.STATE_RESOLVED, args);
    }

    if (this.isStarted === false && this.isPending()) {
        this.isStarted = true;

        emit(this, EVENT_START, []);

        if (this.isStarted && (!isCompatible(this.item) || isItemRejected(this.item) || isItemResolved(this.item))) {
            iterate(this);
        }
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

        emit(this, EVENT_STOP, []);

        if (this.isResolved() || this.isRejected()) {
            this.items.length = 0;
        }
    }

    return this;
};

/**
 *
 * @param {Response|Promise|Function|*} item
 * @param {String} [name=item.name]
 * @returns {Queue}
 */
Queue.prototype.push = function (item, name) {
    this.keys.push(arguments.length > 1 || item == null ? name : item.name);
    this.items.push(item);

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
        destroyItems(this.items.concat(this.stateData));
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
 * Подписка на ошибку выполнения элемента очереди
 * @param {Function|EventEmitter} listener
 * @param {Object} [context=this]
 * @returns {Queue}
 */
Queue.prototype.onItemRejected = function (listener, context) {
    this.on(EVENT_ITEM_REJECTED, listener, context);

    return this;
}

/**
 * Устанавливает контекст для всех задач очереди
 * @param {*} context
 * @returns {Queue}
 */
Queue.prototype.bind = function (context) {
    this.context = context;

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
    while (queue.items.length) {
        if (checkFunction(queue, queue.item) || checkResponse(queue, queue.item)) {
            return;
        }
    }

    queue.item = null;
    queue.setState(STATE_RESOLVED, queue.stateData);
}

/**
 *
 * @param {Queue} queue
 * @param {*} item
 * @returns {Boolean}
 */
function checkFunction(queue, item) {
    var next = queue.items.shift();
    var results;
    var context;

    if (isFunction(next)) {
        results = Response.isResponse(item) ? item.stateData : toArray(item);
        context = new State();
        next = queue.invoke.call(context, next, results, queue.context);

        if (context.is(STATE_ERROR)) {
            onFunctionError(queue, next);
        }
    }

    if (queue.isPending()) {
        queue.item = next;
        queue.stateData.push(next);

        emit(queue, EVENT_NEXT_ITEM, [next]);
    }

    return !queue.isStarted;
}

/**
 * Обработчик ошибок для элементов очереди типа "function"
 * @param {Queue} queue
 * @param {Error} error
 */
function onFunctionError (queue, error) {
    emit(queue, EVENT_ITEM_REJECTED, [error]);

    if (queue.isStrict) {
        queue.reject(error);
    }
}

/**
 *
 * @param {Queue} queue
 * @param {*} item
 * @returns {Boolean|undefined}
 */
function checkResponse(queue, item) {
    if (item === queue) {
        throw new Error('Cannot listen on itself');
    }

    if (isCompatible(item) && !isItemResolved(item)) {
        then(item, onResolveItem, onRejectItem, null, queue);
        return true;
    }
}

/**
 * @this {Queue}
 */
function onResolveItem() {
    if (Response.isResponse(this.item)) {
        this.item.off(STATE_REJECTED, onRejectItem);
    }

    if (this.isStarted) {
        iterate(this);
    }
}

/**
 * @param {Error} error
 * @this {Queue}
 */
function onRejectItem(error) {
    if (Response.isResponse(this.item)) {
        this.item.off(STATE_RESOLVED, onResolveItem);
    }

    emit(this, EVENT_ITEM_REJECTED, [error]);

    if (this.isStrict) {
        this.item = null;
        this.reject(error);
    } else if (this.isStarted) {
        iterate(this);
    }
}

/**
 *
 * @param {Response|Promise} item
 * @returns {Boolean}
 */
function isItemResolved(item) {
    return isFunction(item.isResolved) && item.isResolved();
}

/**
 *
 * @param {Response|Promise} item
 * @returns {Boolean}
 */
function isItemRejected(item) {
    return isFunction(item.isRejected) && item.isRejected();
}

/**
 * В случае, если аргумент не является массивом, то функция оборачивает его в массив
 * @param {*|Array} object
 * @returns {Array}
 */
function wrapIfNotArray(object) {
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
 * @param {*} item
 * @returns {Array}
 */
function toArray(item) {
    return (item === undefined) ? [] : [item];
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
 * @param {Response|Object} object
 * @param {Function} [resolve]
 * @param {Function} [reject]
 * @param {Function} [progress]
 * @param {Object} [context]
 */
function then(object, resolve, reject, progress, context) {
    if (object.then.length === 4) {
        object.then(resolve, reject, progress, context);
    } else {
        object.then(bind(resolve, context), bind(reject, context), bind(progress, context));
    }
}

/**
 *
 */
function onAny() {
    var response = this.response;

    response.off(response.isResolved() ? STATE_REJECTED : STATE_RESOLVED, onAny);

    invokeListener(response, this.listener, this.context);
}

/**
 *
 */
function onMap () {
    var response = this.response;
    var result = response.invoke(this.listener, response.stateData, this.context);

    if (response.isResolved()) {
        response.resolve(result);
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

function getResponseResults(item) {
    return Response.isResponse(item) ? item.getResult() : toObject(item);
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
