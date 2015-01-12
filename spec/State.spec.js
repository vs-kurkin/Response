describe('State', function () {
    var EE = require('EventEmitter');
    var Response = require('../Response');
    var State = Response.State;
    var state;

    function getState() {
        return new State();
    }

    function checkStateProperties (state) {
        expect(state.hasOwnProperty('state')).toBeTruthy();
        expect(state.hasOwnProperty('data')).toBeTruthy();
        expect(state.data).toEqual({});
        expect(state.stateData).toEqual([]);
    }

    it('check exports', function () {
        expect(typeof State).toBe('function');
    });

    it('inherit', function () {
        expect(State.prototype instanceof EE);
        expect((new State) instanceof EE);
        expect((new State) instanceof State);
    });

    describe('instance', function () {
        it('check properties', function () {
            checkStateProperties(getState());
        });

        it('constructor may be called with any object', function () {
            var obj = {};
            var res = State.call(obj);

            expect(obj).toBe(res);

            checkStateProperties(obj);
        });

        it('check constants', function () {
            state = getState();

            expect(state.EVENT_CHANGE_STATE).toBe('changeState');
            expect(state.STATE_ERROR).toBe('error');
        });

        it('set initial state', function () {
            expect(getState().state).toBeNull();
            expect(new State(undefined).state).toBeUndefined();
            expect(new State(0).state).toBe(0);
            expect(new State(1).state).toBe(1);
            expect(new State('').state).toBe('');
            expect(new State('str').state).toBe('str');
            expect(new State({a:1}).state).toEqual({a:1});
        });

        it('set inherited state', function () {
            function Const(){}
            State.create(Const);
            Const.prototype.state = 1;

            expect(new Const().state).toBe(1);
        });
    });

    describe('.isState', function () {
        it('check invalid arguments', function () {
            expect(State.isState()).toBeFalsy();
            expect(State.isState(null)).toBeFalsy();
            expect(State.isState(1)).toBeFalsy();
            expect(State.isState('')).toBeFalsy();
            expect(State.isState({})).toBeFalsy();
        });

        it('check instance', function () {
            expect(State.isState(getState())).toBeTruthy();
        });

        it('check object', function () {
            expect(State.isState({
                isState: true
            })).toBeTruthy();
        });

        it('check inherited object', function () {
            function Const () {}
            Const.prototype = getState();

            expect(State.isState(new Const())).toBeTruthy();
        });
    });

    describe('.create', function () {
        it('check created object', function () {
            var obj = State.create();

            expect(obj instanceof State);
            expect(obj).not.toEqual(State.prototype);
            expect(obj.hasOwnProperty('constructor')).toBeFalsy();
            expect(obj.constructor).toBe(State);

            obj.constructor = State;

            expect(obj).toEqual(State.prototype);

            expect(obj === State.prototype).toBeFalsy();
            expect(obj.data).toBeNull();
            expect(obj.stateData).toBeNull();
        });

        it('check object as prototype', function () {
            function Const () {}
            var obj = State.create(Const);

            expect(Const.prototype).toBe(obj);
            expect(obj.hasOwnProperty('constructor')).toBeTruthy();
            expect(obj.constructor).toBe(Const);
        });

        it('check constructor with static methods', function () {
            function Const () {}

            State.create(Const, true);

            expect(Const.create).toBe(State.create);
            expect(Const.isState).toBe(State.isState);
        });
    });

    it('throw error in listener should be set state "error"', function () {
        state = getState();
        var errorListener = jasmine.createSpy();

        state
            .on('error', errorListener)
            .on('event', function () {
                throw 'err';
            });

        state.emit('event');

        expect(state.state).toBe('error');
        expect(errorListener).toHaveBeenCalledWith('err');
    });

    describe('set state', function () {
        function checkState (object, state) {
            object.setState(state);
            expect(object.state).toBe(state);
            expect(object.is(state)).toBeTruthy();
        }

        it('check settled state', function () {
            var state = new State(0);

            checkState(state, 1);
            checkState(state, '');
            checkState(state, {});
            checkState(state, null);
            checkState(state, undefined);
        });

        describe('subscribe', function () {
            it('event listener', function () {
                state = getState();
                var listener = jasmine.createSpy();

                state
                    .on(1, listener)
                    .setState(1);

                expect(listener).toHaveBeenCalled();
            });

            it('before change state', function () {
                state = getState();
                var listener = jasmine.createSpy();

                state
                    .onState(1, listener)
                    .setState(1);

                expect(listener).toHaveBeenCalled();
            });

            it('after change state', function () {
                state = getState();
                var listener = jasmine.createSpy();

                state
                    .setState(1)
                    .onState(1, listener);

                expect(listener).toHaveBeenCalled();
            });

            it('once listener', function () {
                state = getState();
                var listener = jasmine.createSpy();

                state
                    .onceState(1, listener)
                    .setState(1)
                    .setState(2)
                    .setState(1);

                expect(listener.calls.count()).toBe(1);
            });

            it('check context listener', function () {
                state = getState();
                var lOne = jasmine.createSpy();
                var lTwo = jasmine.createSpy();
                var lThree = jasmine.createSpy();
                var ctx = {};

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
                state = getState();
                var lOne = jasmine.createSpy();
                var lTwo = jasmine.createSpy();
                var lThree = jasmine.createSpy();
                var ctx = {};

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
                state = getState();
                var emitter = new EE();
                var listener = jasmine.createSpy();

                state.onState(1, emitter);
                emitter.on(1, listener);

                state.setState(1, [1,2]);

                expect(listener).toHaveBeenCalledWith(1, 2);
            });

            describe('on change any state', function () {
                it('subscription', function () {
                    state = getState();
                    var listener = jasmine.createSpy();
                    var ctx = {};

                    state
                        .on(state.EVENT_CHANGE_STATE, listener)
                        .onChangeState(listener, ctx)
                        .setState(1)
                        .setState(2);

                    expect(listener.calls.mostRecent().object).toBe(ctx);
                    expect(listener.calls.count()).toBe(4);
                });

                it('unsubscription', function () {
                    state = getState();
                    var listener = jasmine.createSpy();

                    state
                        .onChangeState(listener)
                        .setState(1)
                        .offChangeState(listener)
                        .setState(2);

                    expect(listener.calls.count()).toBe(1);
                });

                it('unsubscription of all listeners', function () {
                    state = getState();
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
            state = getState();
            var listener = jasmine.createSpy();

            state
                .onState(1, listener)
                .setState(1)
                .setState(1);

            expect(listener.calls.count()).toBe(1);
        });

        it('second listener should not be called if the status well be changed', function () {
            state = getState();
            var listener = jasmine.createSpy();

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
        it('change', function () {
            state = getState();
            var data = [1, {}, null];

            state.setState(1, data);

            expect(state.stateData).toBe(data);
        });

        it('change in listener', function () {
            state = getState();
            var listener = jasmine.createSpy();
            var data = [1, {}, null];

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
            state = getState();
            var listener = jasmine.createSpy();
            var data = [1, {}, null];

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
            state = getState();
            var listener = jasmine.createSpy();
            var data = [1, {}, null];

            state
                .setState(1, data)
                .onState(1, function () {
                    this.setState(1);
                })
                .onState(1, listener);

            expect(state.stateData).toBe(data);
        });
    });

    describe('data', function () {
        it('witch prototype', function () {
            function Const() {}

            var data = {
                a: 1
            };

            State.create(Const);
            Const.prototype.data = data;

            expect(new Const().data).toBe(data);
        });

        it('set by key', function () {
            state = getState();
            state
                .setData('key1', 'val1')
                .setData('key2', 2)
                .setData('key3', {a:1})
                .setData('key4');

            expect(state.data).toEqual({
                key1: 'val1',
                key2: 2,
                key3: {a:1},
                key4: undefined
            });
        });

        it('get by key', function () {
            var data3 = {a:1};

            state = getState();
            state
                .setData('key1', 'val1')
                .setData('key2', 2)
                .setData('key3', data3)
                .setData('key4');

            expect(state.getData('key1')).toBe('val1');
            expect(state.getData('key2')).toBe(2);
            expect(state.getData('key3')).toBe(data3);
            expect(state.getData('key4')).toBeUndefined();
            expect(state.getData('key5')).toBeUndefined();
        });

        it('get all', function () {
            state = getState();
            state
                .setData('key1', 'val1')
                .setData('key2', 2)
                .setData('key3', {a:1})
                .setData('key4');

            expect(state.getData()).toBe(state.data);
        });
    });

    it('destroy', function () {
        state = getState();
        state
            .on(1, function(){})
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
});
