describe('State:', function () {
    var EE = require('EventEmitter');
    var Response = require('../Response');
    var State = Response.State;
    var state;
    var Const;
    var listener;
    var ctx;

    function checkProperties() {
        expect(state.state).toBeNull();
        expect(state.data).toEqual({});
        expect(state.stateData).toEqual([]);
        expect(state.isState).toBeTruthy();
        expect(state.keys).toBeNull();

        expect(state.EVENT_CHANGE_STATE).toBe('changeState');
        expect(state.STATE_ERROR).toBe('error');
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

                it('changed constants', function () {
                    Const.prototype.EVENT_CHANGE_STATE = 'test1';
                    Const.prototype.STATE_ERROR = 'test2';

                    var lOne = jasmine.createSpy();
                    var lTwo = jasmine.createSpy();

                    new Const()
                        .on('test1', lOne)
                        .on('test1', function () {
                            throw 'error';
                        })
                        .onState('test2', lTwo)
                        .setState(1);

                    expect(lOne).toHaveBeenCalled();
                    expect(lTwo).toHaveBeenCalled();
                });

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
            .on('error', listener)
            .on('event', function () {
                throw 'err';
            });

        state.emit('event');

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
                        .on(state.EVENT_CHANGE_STATE, listener)
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
                expect(state[property]).toBeNull();
            }
        }
    });

    describe('bind', function () {
        it('default context', function () {
            var callback = state.bind(listener);

            expect(callback).not.toBe(listener);

            callback();

            expect(listener.calls.mostRecent().object).toBe(state);
        });

        it('custom context', function () {
            var ctx = {};

            state.bind(listener, ctx)();

            expect(listener.calls.mostRecent().object).toBe(ctx);
        });
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
    });

    describe('toObject', function () {
        it('should be returns undefined if no results', function () {
            expect(state.toObject()).toEqual(undefined);
        });

        it('should be returns empty object if have keys and no results', function () {
            expect(state.toObject(['key'])).toEqual({});
            expect(state.setKeys(['key']).toObject()).toEqual({});
        });

        it('should be returns empty object if no keys and have results', function () {
            expect(state.setState(1, [null, 2]).toObject()).toEqual([null, 2]);
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
    });

    describe('setKeys', function () {
        it('should set keys in keys property', function () {
            var keys = [];

            expect(state.setKeys(keys).keys).toBe(keys);
        });

        it('should set null in keys property if the argument is not a array', function () {
            expect(state.setKeys({}).keys).toBe(null);
            expect(state.setKeys(function(){}).keys).toBe(null);
            expect(state.setKeys(undefined).keys).toBe(null);
            expect(state.setKeys(1).keys).toBe(null);
            expect(state.setKeys().keys).toBe(null);
        });
    });

    it('getByIndex', function () {
        var data = {};

        expect(state.getByIndex()).toBeUndefined();
        expect(state.getByIndex(0)).toBeUndefined();
        expect(state.getByIndex(1)).toBeUndefined();

        state.setState(1, [data]);

        expect(state.getByIndex(0)).toBe(data);
        expect(state.getByIndex('0')).toBe(data);
        expect(state.getByIndex(1)).toBeUndefined();
        expect(state.getByIndex({})).toBeUndefined();
        expect(state.getByIndex()).toBeUndefined();
    });

    it('getByKey', function () {
        var data = {};
        var key;

        expect(state.getByKey()).toBeUndefined();
        expect(state.setKeys([]).getByKey()).toBeUndefined();
        expect(state.setKeys([]).getByKey(0)).toBeUndefined();

        state.setState(1, [data]);

        expect(state.setKeys(['first']).getByKey('first')).toBe(data);
        expect(state.setKeys([0]).getByKey(0)).toBe(data);
        expect(state.setKeys([key = {}]).getByKey(key)).toBe(data);
        expect(state.setKeys([key = []]).getByKey(key)).toBe(data);
        expect(state.setKeys([key = function () {}]).getByKey(key)).toBe(data);
    });

    it('toJSON', function () {
        expect(new State().toJSON()).toBeUndefined();
        expect(new State().setState(1, [1]).toJSON()).toEqual(1);
        expect(new State().setKeys([1]).toJSON()).toEqual({});
        expect(new State().setState(1, null).setKeys([1]).toJSON()).toEqual({1:null});
    });
});
