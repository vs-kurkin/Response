describe('State:', function () {
    var EE = require('EventEmitter');
    var Response = require('../Response.js');
    var State = Response.State;
    var state;
    var Const;
    var listener;
    var ctx;

    // TODO тесты используют process.on, process.emit
    // в тестах через карму там используется пакет в котором
    // process.on, process.emit просто noop-заглушки
    // https://github.com/defunctzombie/node-process/blob/master/browser.js#L164
    // пока просто детектим браузер по window
    if (typeof window !== 'undefined') {
        process.__events__ = {};

        process.on = function(event, cb) {
            process.__events__[event] = cb;
        };

        process.emit = function () {

            var input = arguments;
            var event = input[0];

            if (typeof process.__events__[event] === 'function') {
                var args = Object.keys(input).slice(1).map(function (k) {
                    return input[k];
                });

                process.__events__[event].apply(this, args);
            }
        }
    }

    function checkProperties() {
        expect(state.state).toBeNull();
        expect(state.data).toEqual({});
        expect(state.stateData).toEqual([]);
        expect(state.isState).toBeTruthy();
        expect(state.keys).toEqual([]);
    }

    function checkInherit() {
        expect(state instanceof Const).toBeTruthy();
    }

    function checkPrototype() {
        expect(Const.prototype instanceof EE).toBeTruthy();
        expect(Const.prototype.hasOwnProperty('constructor')).toBeTruthy();
        expect(Const.prototype.constructor).toBe(Const);
    }

    function checkType() {
        expect(State.isState(state)).toBeTruthy();
    }

    beforeEach(function () {
        Const = State;
        state = new State();
        listener = jasmine.createSpy();
        ctx = {};
    });

    it('check exports', function () {
        expect(typeof State).toBe('function');

        expect(State.EVENT_CHANGE_STATE).toBe('changeState');
        expect(State.STATE_ERROR).toBe('error');
    });

    describe('check constructor:', function () {
        it('prototype', checkPrototype);

        it('may be called in another context object', function () {
            var obj = {};

            expect(obj).toBe(State.call(obj));

            checkProperties(obj);
        });
    });

    describe('check instance:', function () {
        it('inherit', checkInherit);
        it('properties', checkProperties);
        it('type', checkType);

        it('set initial state', function () {
            expect(new State(undefined).state).toBeUndefined();
            expect(new State(0).state).toBe(0);
            expect(new State(1).state).toBe(1);
            expect(new State('').state).toBe('');
            expect(new State('str').state).toBe('str');
            expect(new State({a: 1}).state).toEqual({a: 1});
        });
    });

    describe('check inheritance for', function () {
        beforeEach(function () {
            Const = function () {
                State.call(this);
            };

            State.create(Const, true);

            state = new Const();
        });

        describe('constructor:', function () {
            describe('prototype', function () {
                it('inherit', checkPrototype);

                describe('change', function () {
                    it('state', function () {
                        Const.prototype.state = 1;

                        expect(new Const().state).toBe(1);
                    });

                    it('data', function () {
                        var data = Const.prototype.data = {
                            a: 1
                        };

                        expect(new Const().data).toBe(data);
                    });
                })
            });

            it('static methods', function () {
                for (var name in Const) {
                    if (Const.hasOwnProperty(name)) {
                        expect(Const[name]).toBe(State[name]);
                    }
                }
            });
        });

        describe('instance:', function () {
            it('inherit', checkInherit);
            it('properties', checkProperties);
            it('type', checkType);
        });
    });

    describe('isState', function () {
        it('check invalid arguments', function () {
            expect(State.isState()).toBeFalsy();
            expect(State.isState(null)).toBeFalsy();
            expect(State.isState(1)).toBeFalsy();
            expect(State.isState('')).toBeFalsy();
            expect(State.isState({})).toBeFalsy();
        });

        it('check object', function () {
            expect(State.isState({
                isState: true
            })).toBeTruthy();
        });
    });

    it('check created object', function () {
        state = State.create();

        checkInherit();

        expect(state.hasOwnProperty('constructor')).toBeFalsy();
        expect(state.constructor).toBe(State);

        expect(state === State.prototype).toBeFalsy();
    });

    it('throw error in listener should be set state "error"', function () {
        state
            .onState('error', listener)
            .onState('event', function () {
                throw 'err';
            });

        state.setState('event');

        expect(state.state).toBe('error');
        expect(listener).toHaveBeenCalledWith(new Error('err'));
    });

    describe('set state', function () {
        function checkState(object, state) {
            object.setState(state);

            expect(object.state).toBe(state);
            expect(object.is(state)).toBeTruthy();
        }

        it('check settled state', function () {
            state = new State(0);

            checkState(state, 1);
            checkState(state, '');
            checkState(state, {});
            checkState(state, null);
            checkState(state, undefined);
        });

        describe('subscribe', function () {
            it('event listener', function () {
                state
                    .on(1, listener)
                    .setState(1);

                expect(listener).toHaveBeenCalled();
            });

            it('before change state', function () {
                state
                    .onState(1, listener)
                    .setState(1);

                expect(listener).toHaveBeenCalled();
            });

            it('after change state', function () {
                state
                    .setState(1)
                    .onState(1, listener);

                expect(listener).toHaveBeenCalled();
            });

            it('once listener', function () {
                state
                    .onceState(1, listener)
                    .setState(1)
                    .setState(2)
                    .setState(1);

                expect(listener.calls.count()).toBe(1);
            });

            it('check context listener', function () {
                var lOne = jasmine.createSpy();
                var lTwo = jasmine.createSpy();
                var lThree = jasmine.createSpy();

                state
                    .onState(1, lOne, ctx)
                    .onState(1, lTwo, null)
                    .onState(1, lThree, undefined)
                    .setState(1);

                expect(lOne.calls.mostRecent().object).toBe(ctx);
                expect(lTwo.calls.mostRecent().object).toBe(state);
                expect(lThree.calls.mostRecent().object).toBe(state);
            });

            it('check context once listener', function () {
                var lOne = jasmine.createSpy();
                var lTwo = jasmine.createSpy();
                var lThree = jasmine.createSpy();

                state
                    .onceState(1, lOne, ctx)
                    .onceState(1, lTwo, null)
                    .onceState(1, lThree, undefined)
                    .setState(1);

                expect(lOne.calls.mostRecent().object).toBe(ctx);
                expect(lTwo.calls.mostRecent().object).toBe(state);
                expect(lThree.calls.mostRecent().object).toBe(state);
            });

            it('other emitter', function () {
                var emitter = new EE();

                state.onState(1, emitter);
                emitter.on(1, listener);

                state.setState(1, [1, 2]);

                expect(listener).toHaveBeenCalledWith(1, 2);
            });

            it('should be throws error if subscribe invalid listener', function () {
                expect(function () {
                    state.onState(1, null);
                }).toThrow();

                expect(function () {
                    state.setState(1).onState(1, null);
                }).toThrow();
            });

            describe('on change any state', function () {
                it('subscription on event', function () {
                    state
                        .on(State.EVENT_CHANGE_STATE, listener)
                        .setState(1);

                    expect(listener).toHaveBeenCalledWith(1);

                    state.setState(2);

                    expect(listener).toHaveBeenCalledWith(2);
                    expect(listener.calls.count()).toBe(2);
                });

                it('subscription (shorthand)', function () {
                    state
                        .onChangeState(listener)
                        .setState(1);

                    expect(listener).toHaveBeenCalledWith(1);
                    expect(listener.calls.mostRecent().object).toBe(state);
                });

                it('subscription (shorthand, custom context)', function () {
                    state
                        .onChangeState(listener, ctx)
                        .setState(1);

                    expect(listener.calls.mostRecent().object).toBe(ctx);
                });

                it('unsubscription', function () {
                    state
                        .onChangeState(listener)
                        .setState(1)
                        .offChangeState(listener)
                        .setState(2);

                    expect(listener.calls.count()).toBe(1);
                });

                it('unsubscription of all listeners', function () {
                    var lOne = jasmine.createSpy();
                    var lTwo = jasmine.createSpy();

                    state
                        .onChangeState(lOne)
                        .onChangeState(lTwo)
                        .offChangeState()
                        .setState(1);

                    expect(lOne).not.toHaveBeenCalled();
                    expect(lTwo).not.toHaveBeenCalled();
                });
            });
        });

        it('listeners should not be called if the status has not changed', function () {
            state
                .onState(1, listener)
                .setState(1)
                .setState(1);

            expect(listener.calls.count()).toBe(1);
        });

        it('second listener should not be called if the status well be changed', function () {
            state
                .onState(1, function () {
                    this.setState(2);
                })
                .onState(1, listener)
                .setState(1);

            expect(listener).not.toHaveBeenCalled();
        });

        describe('should be emit "unhandledStateError" on process', function () {
            it('if the state does not have event listeners', function (done) {
                var error = new Error();

                process.on('unhandledStateError', listener);

                state.setState('error', error);

                expect(listener).not.toHaveBeenCalled();

                process.nextTick(function () {
                    expect(listener).toHaveBeenCalledWith(error, state);

                    done();
                })
            });
        });

        describe('should not be emit "unhandledStateError" on process', function () {
            it('if the state have event listeners', function (done) {
                var error = new Error();

                process.on('unhandledStateError', listener);

                state
                    .onState('error', function () {})
                    .setState('error', error);

                expect(listener).not.toHaveBeenCalled();

                process.nextTick(function () {
                    expect(listener).not.toHaveBeenCalled();

                    done();
                })
            });

            it('if the state have once event listeners', function (done) {
                var error = new Error();

                process.on('unhandledStateError', listener);

                state
                    .onceState('error', function () {})
                    .setState('error', error);

                expect(listener).not.toHaveBeenCalled();

                process.nextTick(function () {
                    expect(listener).not.toHaveBeenCalled();

                    done();
                })
            });
        });
    });

    describe('state data', function () {
        var data = [1, {}, null];

        it('one value', function () {
            var fnc = function () {
            };

            state.setState(1, 1);
            expect(state.stateData).toEqual([1]);

            state.setState(1, 1, 2, 3);
            expect(state.stateData).toEqual([1]);

            state.setState(1, '1');
            expect(state.stateData).toEqual(['1']);

            state.setState(1, {});
            expect(state.stateData).toEqual([{}]);

            state.setState(1, []);
            expect(state.stateData).toEqual([]);

            state.setState(1, fnc);
            expect(state.stateData).toEqual([fnc]);

            state.setState(1, null);
            expect(state.stateData).toEqual([null]);

            state.setState(1, undefined);
            expect(state.stateData).toEqual([undefined]);

            state.setState(1);
            expect(state.stateData).toEqual([undefined]);
        });

        it('several values', function () {
            state.setState(1, data);
            expect(state.stateData).toBe(data);
        });

        it('change in listener', function () {
            state
                .onState(1, function () {
                    this.setState(1, data);
                })
                .onState(1, listener)
                .setState(1);

            expect(state.stateData).toBe(data);
            expect(listener).toHaveBeenCalledWith(1, {}, null);
        });

        it('change in listener after change state', function () {
            state
                .setState(1)
                .onState(1, function () {
                    this.setState(1, data);
                })
                .onState(1, listener);

            expect(state.stateData).toBe(data);
            expect(listener).toHaveBeenCalledWith(1, {}, null);
        });

        it('should not be changed if they were not passed', function () {
            state
                .setState(1, data)
                .onState(1, function () {
                    this.setState(1);
                })
                .onState(1, listener);

            expect(state.stateData).toBe(data);
        });

        it('should change with changing state', function () {
            state
                .onState(1, listener)
                .onState(2, listener);

            state.setState(1, [1]);
            expect(state.stateData).toEqual([1]);
            expect(listener).toHaveBeenCalledWith(1);

            state.setState(2);
            expect(state.stateData).toEqual([]);
            expect(listener).toHaveBeenCalledWith();
        });
    });

    describe('data', function () {
        var data3 = {a: 1};

        beforeEach(function () {
            state
                .setData('key1', 'val1')
                .setData('key2', 2)
                .setData('key3', data3)
                .setData('key4');
        });

        it('set by key', function () {
            expect(state.data).toEqual({
                key1: 'val1',
                key2: 2,
                key3: {a: 1},
                key4: undefined
            });
        });

        it('get by key', function () {
            expect(state.getData('key1')).toBe('val1');
            expect(state.getData('key2')).toBe(2);
            expect(state.getData('key3')).toBe(data3);
            expect(state.getData('key4')).toBeUndefined();
            expect(state.getData('key5')).toBeUndefined();
        });

        it('get all', function () {
            expect(state.getData()).toBe(state.data);
        });
    });

    describe('getStateData', function () {
        it('should returns undefined if a data of state  are missing', function () {
            expect(state.getStateData(1)).toBeUndefined();
        });

        it('should returns undefined if key is not defined', function () {
            expect(state
                .setState('state', ['data'])
                .setKeys([1])
                .getStateData(2))
                .toBeUndefined();
        });

        it('should be returns undefined if keys is empty', function () {
            expect(state
                .setState('state', ['data'])
                .getStateData(1))
                .toBeUndefined();
        });

        it('key should be strict equal', function () {
            expect(state
                .setState('state', ['data'])
                .setKeys([1])
                .getStateData('1'))
                .toBeUndefined();
        });

        it('must return data', function () {
            expect(state
                .setState('state', ['data'])
                .setKeys(['1'])
                .getStateData('1'))
                .toBe('data');
        });

        it('must return latest value', function () {
            expect(state
                .setState('state', ['data1', 'data2'])
                .setKeys(['1', '1'])
                .getStateData('1'))
                .toBe('data2');
        });
    });

    it('destroy', function () {
        state
            .on(1, function () {
            })
            .setState(1, 2, 3, 4)
            .setData('key', 1);

        state.a = true;

        state.destroy();

        for (var property in state) {
            if (state.hasOwnProperty(property)) {
                expect(state[property]).toBeUndefined();
            }
        }
    });

    it('recursive destroy', function () {
        var resp = new Response().resolve();
        var property;

        state
            .setState(1, [resp])
            .destroy(true);

        for (property in resp) {
            if (resp.hasOwnProperty(property)) {
                expect(resp[property]).toBeUndefined();
            }
        }
    });

    it('destroy with an empty State object don`t throw exception', function () {
        state
            .setState(1, [new State().destroy()])
            .destroy(true);
    });

    describe('invoke', function () {
        it('without arguments', function () {
            state.invoke(listener);

            expect(listener).toHaveBeenCalledWith();
        });

        it('with one argument', function () {
            state.invoke(listener, [1]);

            expect(listener).toHaveBeenCalledWith(1);
        });

        it('with several arguments', function () {
            state.invoke(listener, [1, {}, []]);

            expect(listener).toHaveBeenCalledWith(1, {}, []);
        });

        it('should be returns of the method result', function () {
            expect(state.invoke(function () {
                return listener;
            })).toBe(listener);
        });

        it('should be change state to "error" if function throw exception', function () {
            state.invoke(function () {
                throw 'error';
            });

            expect(state.state).toBe('error');
            expect(state.stateData).toEqual([new Error('error')]);
        });

        it('should be returns error object if function throw exception', function () {
            expect(state.invoke(function () {
                throw 'error';
            })).toEqual(new Error('error'));
        });

        it('should be called with defined context', function () {
            state.invoke(listener, null, ctx);

            expect(listener.calls.mostRecent().object).toBe(ctx);
        });

        it('Should remain in the same state if no error', function () {
            state.setState(1).invoke(listener);

            expect(state.state).toBe(1);
        })
    });

    describe('toObject', function () {
        it('should be returns empty object if no results', function () {
            expect(state.toObject()).toEqual({});
        });

        it('should be returns empty object if have keys and no results', function () {
            expect(state.toObject(['key'])).toEqual({});
            expect(state.setKeys(['key']).toObject()).toEqual({});
        });

        it('should be returns empty object if no keys and have results', function () {
            expect(state.setState(1, [null, 2]).toObject()).toEqual({});
        });

        it('should be returns object if have keys and results', function () {
            expect(state
                .setState(1, [null, 2])
                .toObject(['first', 'second']))
                .toEqual({
                    first: null,
                    second: 2
                });

            expect(state
                .setKeys(['first', 'second'])
                .toObject())
                .toEqual({
                    first: null,
                    second: 2
                });
        });

        it('should not be returns value if no key', function () {
            expect(state
                .setState(1, [null, 2])
                .toObject(['first']))
                .toEqual({
                    first: null
                });

            expect(state
                .setKeys(['first'])
                .toObject())
                .toEqual({
                    first: null
                });
        });

        it('should not be returns value if no this value', function () {
            expect(state
                .setState(1, [null])
                .toObject(['first', 'second']))
                .toEqual({
                    first: null
                });

            expect(state
                .setKeys(['first', 'second'])
                .toObject())
                .toEqual({
                    first: null
                });
        });

        it('should call a method toObject if any', function () {
            var object = {
                toObject: function () {
                    return false;
                }
            };

            expect(state
                .setState(1, [object])
                .toObject(['first']))
                .toEqual({
                    first: false
                });
        });

        it('should return latest value if there are duplicate keys', function () {
            expect(state
                .setState(1, [1, 2])
                .toObject(['1', '1']))
                .toEqual({
                    1: 2
                });
        });
    });

    describe('setKeys', function () {
        it('should set keys in keys property', function () {
            var keys = [];

            expect(state.setKeys(keys).keys).toBe(keys);
        });

        it('should set an empty array in keys property if the argument is not a array', function () {
            expect(state.setKeys({}).keys).toEqual([]);
            expect(state.setKeys(function(){}).keys).toEqual([]);
            expect(state.setKeys(undefined).keys).toEqual([]);
            expect(state.setKeys(1).keys).toEqual([]);
            expect(state.setKeys().keys).toEqual([]);
        });
    });

    it('toJSON', function () {
        expect(new State().toJSON()).toEqual({});
        expect(new State().setState(1, [1]).toJSON()).toEqual({});
        expect(new State().setKeys([1]).toJSON()).toEqual({});
        expect(new State().setState(1, null).setKeys([1]).toJSON()).toEqual({1:null});
    });
});
