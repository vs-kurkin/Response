describe('Response:', function () {
    var EE = require('EventEmitter');
    var Response = require('../Response');
    var State = Response.State;
    var resp;
    var Const;
    var listener;

    function getConst(sp) {
        function Const() {
        }

        Response.create(Const, sp);

        return Const;
    }

    function checkProperties() {
        expect(resp.state).toBe('pending');
        expect(resp.context).toBeNull();
        expect(typeof resp.callback).toBe('function');
        expect(resp.keys).toBeNull();

        expect(resp.STATE_PENDING).toBe('pending');
        expect(resp.STATE_RESOLVED).toBe('resolve');
        expect(resp.STATE_REJECTED).toBe('error');
        expect(resp.EVENT_PROGRESS).toBe('progress');
    }

    function checkInherit () {
        expect(resp instanceof Const).toBeTruthy();
    }

    function checkPrototype() {
        expect(Const.prototype instanceof State).toBeTruthy();
        expect(Const.prototype.hasOwnProperty('constructor')).toBeTruthy();
        expect(Const.prototype.constructor).toBe(Const);
    }

    function checkType () {
        expect(State.isState(resp)).toBeTruthy();
        expect(Response.isResponse(resp)).toBeTruthy();
    }

    beforeEach(function () {
        Const = Response;
        resp = new Response();
        listener = jasmine.createSpy();
    });

    it('check exports', function () {
        expect(typeof Response).toBe('function');
    });

    it('check constructor: prototype', checkPrototype);

    describe('check instance:', function () {
        it('inherit', checkInherit);
        it('properties', checkProperties);
        it('type', checkType);
    });

    describe('check inheritance for', function () {
        beforeEach(function () {
            Const = function () {
                Response.call(this);
            };

            Response.create(Const, true);

            resp = new Const();
        });

        describe('constructor:', function () {
            describe('prototype', function () {
                it('inherit', checkPrototype);
            });

            it('changed constants', function () {
                Const = getConst();
                Const.prototype.STATE_PENDING = 'test1';
                Const.prototype.STATE_RESOLVED = 'test2';
                Const.prototype.STATE_REJECTED = 'test3';
                Const.prototype.EVENT_PROGRESS = 'test4';

                resp
                    .onPending(listener)
                    .onResolve(listener)
                    .onReject(listener)
                    .onProgress(listener)
                    .resolve()
                    .reject(1)
                    .pending()
                    .progress(2);

                expect(listener.calls.count()).toBe(4);
            });

            it('static methods', function () {
                for (var name in Const) {
                    if (Const.hasOwnProperty(name)) {
                        expect(Const[name]).toBe(Response[name]);
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

    describe('isResponse', function () {
        it('check invalid arguments', function () {
            expect(Response.isResponse()).toBeFalsy();
            expect(Response.isResponse(null)).toBeFalsy();
            expect(Response.isResponse(1)).toBeFalsy();
            expect(Response.isResponse('')).toBeFalsy();
            expect(Response.isResponse({})).toBeFalsy();
            expect(Response.isResponse(new State())).toBeFalsy();
            expect(Response.isResponse(function () {
            })).toBeFalsy();
        });

        it('check object', function () {
            expect(Response.isResponse({
                isResponse: true
            })).toBeTruthy();
        });
    });

    it('check compatible', function () {
        expect(Response.isCompatible(resp)).toBeTruthy();
        expect(Response.isCompatible({
            then: function () {
            }
        })).toBeTruthy();
        expect(Response.isCompatible(1)).toBeFalsy();
        expect(Response.isCompatible('1')).toBeFalsy();
        expect(Response.isCompatible({})).toBeFalsy();
        expect(Response.isCompatible([])).toBeFalsy();
        expect(Response.isCompatible(function () {
        })).toBeFalsy();
        expect(Response.isCompatible(new State())).toBeFalsy();
    });

    it('check created object', function () {
        resp = Response.create();

        checkInherit();

        expect(resp.hasOwnProperty('constructor')).toBeFalsy();
        expect(resp.constructor).toBe(Response);

        expect(resp === Response.prototype).toBeFalsy();
    });

    describe('check state', function () {
        it('via isPending', function () {
            expect(resp.isPending()).toBeTruthy();
            expect(resp.resolve().isPending()).toBeFalsy();
            expect(resp.reject().isPending()).toBeFalsy();
            expect(resp.setState(1).isPending()).toBeTruthy();
        });

        it('via isResolved', function () {
            expect(resp.isResolved()).toBeFalsy();
            expect(resp.resolve().isResolved()).toBeTruthy();
            expect(resp.reject().isResolved()).toBeFalsy();
            expect(resp.setState(1).isResolved()).toBeFalsy();
        });

        it('via isRejected', function () {
            expect(resp.isRejected()).toBeFalsy();
            expect(resp.resolve().isRejected()).toBeFalsy();
            expect(resp.reject().isRejected()).toBeTruthy();
            expect(resp.setState(1).isRejected()).toBeFalsy();
        });

        it('via is', function () {
            expect(resp.is('pending')).toBeTruthy();
            expect(resp.resolve().is('resolve')).toBeTruthy();
            expect(resp.reject().is('error')).toBeTruthy();
            expect(resp.setState(1).is(1)).toBeTruthy();
        });
    });

    describe('set state', function () {
        var arg;
        var ctx;

        beforeEach(function () {
            arg = {};
            ctx = {};
        });

        afterEach(function () {
            expect(listener).toHaveBeenCalled();
            expect(listener.calls.mostRecent().object).toBe(ctx);
        });

        describe('pending', function () {
            it('should be emits event "pending"', function () {
                resp
                    .on('pending', listener, ctx)
                    .setState(1)
                    .pending();

            });

            it('should be change state to "pending"', function () {
                resp
                    .onState('pending', listener, ctx)
                    .setState(1)
                    .pending();

                expect(resp.state).toBe('pending');
            });

            it('(shorthand)', function () {
                resp
                    .onPending(listener, ctx)
                    .setState(1)
                    .pending();

                expect(resp.state).toBe('pending');
            });

            it('should call the handler once', function () {
                resp
                    .onPending(listener, ctx)
                    .resolve()
                    .pending();

                expect(listener.calls.count()).toBe(1);
            });
        });

        describe('resolve', function () {
            afterEach(function () {
                expect(resp.state).toBe('resolve');
                expect(listener).toHaveBeenCalledWith(1, null, arg);
            });

            it('from static method', function () {
                resp = Response
                    .resolve(1, null, arg)
                    .onResolve(listener, ctx);
            });

            it('should be emits event "resolve"', function () {
                resp
                    .on('resolve', listener, ctx)
                    .resolve(1, null, arg);
            });

            it('should be change state to "resolve"', function () {
                resp
                    .onState('resolve', listener, ctx)
                    .resolve(1, null, arg);
            });

            it('should be change state to "resolve" after call', function () {
                resp
                    .resolve(1, null, arg)
                    .onState('resolve', listener, ctx);
            });

            it('(shorthand)', function () {
                resp
                    .onResolve(listener, ctx)
                    .resolve(1, null, arg);
            });

            it('(shorthand, after call)', function () {
                resp
                    .resolve(1, null, arg)
                    .onResolve(listener, ctx);
            });

            it('should call the handler once', function () {
                resp
                    .onResolve(listener, ctx)
                    .resolve(1, null, arg)
                    .pending()
                    .resolve();

                expect(listener.calls.count()).toBe(1);
            });

            it('blank call should not clean state data', function () {
                resp.onResolve(listener, ctx).resolve(1, null, arg).resolve();

                expect(resp.stateData).toEqual([1, null, arg]);
            });

            it('not a blank call should change state data', function () {
                resp.onResolve(listener, ctx).resolve(1, null, arg).resolve(1);

                expect(resp.stateData).toEqual([1]);
            });
        });

        describe('reject', function () {
            afterEach(function () {
                expect(resp.state).toBe('error');
                expect(listener).toHaveBeenCalledWith(new Error('error'));
            });

            it('from static method', function () {
                resp = Response
                    .reject('error')
                    .onReject(listener, ctx);
            });

            it('should be emits event "error"', function () {
                resp
                    .on('error', listener, ctx)
                    .reject('error');
            });

            it('should be change state to "error"', function () {
                resp
                    .onState('error', listener, ctx)
                    .reject('error');
            });

            it('should be change state to "error" after call', function () {
                resp
                    .reject('error')
                    .onState('error', listener, ctx);
            });

            it('(shorthand)', function () {
                resp
                    .onReject(listener, ctx)
                    .reject('error');
            });

            it('(shorthand, after call)', function () {
                resp
                    .reject('error')
                    .onReject(listener, ctx);
            });

            it('should call the handler once', function () {
                resp
                    .onReject(listener, ctx)
                    .reject('error')
                    .pending()
                    .reject('error');

                expect(listener.calls.count()).toBe(1);
            });

            it('blank call should not clean state data', function () {
                resp.onReject(listener, ctx).reject('error').reject();

                expect(resp.stateData).toEqual([new Error('error')]);
            });

            it('not a blank call should change state data', function () {
                resp.onReject(listener, ctx).reject('error').reject(1);

                expect(resp.stateData).toEqual([new Error(1)]);
            });
        });

        describe('subscribe', function () {
            it('on then (only resolve)', function () {
                resp
                    .then(listener, null, null, ctx)
                    .progress(1)
                    .resolve()
                    .reject('error');

                expect(listener.calls.count()).toBe(1);
            });

            it('on then (resolve and reject)', function () {
                resp
                    .then(listener, listener, null, ctx)
                    .progress(1)
                    .resolve()
                    .reject('error');

                expect(listener.calls.count()).toBe(2);
            });

            it('on then (all)', function () {
                resp
                    .then(listener, listener, listener, ctx)
                    .progress(1)
                    .resolve()
                    .reject('error')
                    .resolve()
                    .reject('error');

                expect(listener.calls.count()).toBe(3);
            });

            it('on then (all, default context)', function () {
                resp
                    .then(listener, listener, listener)
                    .progress(1)
                    .resolve()
                    .reject('error');

                ctx = resp;

                expect(listener.calls.count()).toBe(3);
            });

            it('on always', function () {
                resp
                    .always(listener, ctx)
                    .resolve()
                    .reject('error')
                    .setState(1)
                    .pending(1)
                    .reject('error')
                    .pending(1);

                expect(listener.calls.count()).toBe(2);
            });

            describe('on progress', function () {
                it('event', function () {
                    resp
                        .on('progress', listener, ctx)
                        .onProgress(listener, ctx)
                        .progress(arg);

                    expect(listener.calls.count()).toBe(2);
                });

                it('(check data)', function () {
                    resp
                        .onProgress(listener, ctx)
                        .progress(arg, 123);

                    expect(listener).toHaveBeenCalledWith(arg);
                });

                it('(should be emitted if resp is pending)', function () {
                    resp
                        .onProgress(listener, ctx)
                        .resolve()
                        .progress(arg)
                        .reject('error')
                        .progress(arg)
                        .pending()
                        .progress(arg)
                        .setState(1)
                        .progress(arg)
                        .progress(arg);

                    expect(listener.calls.count()).toBe(3);
                });
            });

            it('via notify', function () {
                var listener2 = new Response()
                    .then(listener, listener, listener, ctx);

                resp
                    .notify(listener2)
                    .progress(1)
                    .resolve()
                    .reject(1)
                    .resolve()
                    .reject(1);

                expect(listener.calls.count()).toBe(3);
            });

            it('via listen', function () {
                var resp2 = new Response();

                resp
                    .then(listener, listener, listener, ctx)
                    .listen(resp2);

                resp2
                    .progress(1)
                    .resolve()
                    .reject(1)
                    .resolve()
                    .reject(1);

                expect(listener.calls.count()).toBe(3);
            });

            it('via constructor', function () {
                new Response(resp)
                    .then(listener, listener, listener, ctx);

                resp
                    .progress(1)
                    .resolve()
                    .reject(1);

                expect(listener.calls.count()).toBe(3);
            });

            describe('via done', function () {
                it('before change state', function () {
                    Const = getConst();
                    Const.prototype.destroy = listener;

                    ctx = resp = new Const().done().resolve();
                });

                it('after change state', function () {
                    Const = getConst();
                    Const.prototype.destroy = listener;

                    ctx = resp = new Const().resolve().done();
                });
            });
        });
    });

    describe('integration:', function () {
        it('check inherited callback', function () {
            function callback (){}

            Const = getConst();
            Const.prototype.callback = callback;

            expect(new Const().callback).toBe(callback);
        });

        it('call default callback with first argument should be change state to "error"', function () {
            resp.callback(1);

            expect(resp.state).toBe('error');
            expect(resp.stateData).toEqual([new Error(1)]);
        });

        it('call default callback without first argument should be change state to "resolve"', function () {
            resp.callback();

            expect(resp.state).toBe('resolve');
            expect(resp.stateData).toEqual([]);
        });

        it('call default callback with null first argument should be change state to "resolve"', function () {
            resp.callback(null);

            expect(resp.state).toBe('resolve');
            expect(resp.stateData).toEqual([]);
        });

        it('check arguments of default callback', function () {
            resp.callback(null, 1, {}, '1');

            expect(resp.state).toBe('resolve');
            expect(resp.stateData).toEqual([1, {}, '1']);
        });

        describe('make', function () {
            var ctx = {};

            it('callback (check returns value)', function () {
                expect(resp.makeCallback()).toBe(resp);
            });

            it('default callback', function () {
                resp.callback = listener;

                resp
                    .makeCallback()
                    .callback();

                expect(resp.callback).not.toBe(listener);
                expect(listener).toHaveBeenCalled();
            });

            it('default callback with custom context', function () {
                resp.callback = listener;

                resp
                    .makeCallback(null, ctx)
                    .callback();

                expect(listener.calls.mostRecent().object).toBe(ctx);
            });

            it('custom callback', function () {
                resp
                    .makeCallback(listener)
                    .callback();

                expect(resp.callback).not.toBe(listener);
                expect(listener.calls.mostRecent().object).toBe(resp);
            });

            it('custom callback with custom context', function () {
                resp
                    .makeCallback(listener, ctx)
                    .callback();

                expect(listener.calls.mostRecent().object).toBe(ctx);
            });
        });

        describe('invoke', function () {
            it('without arguments', function () {
                resp.invoke(listener);

                expect(listener).toHaveBeenCalledWith();
            });

            it('with one argument', function () {
                resp.invoke(listener, 1);

                expect(listener).toHaveBeenCalledWith(1);
            });

            it('with several arguments', function () {
                resp.invoke(listener, 1, {}, []);

                expect(listener).toHaveBeenCalledWith(1, {}, []);
            });

            it('should be returns of the method result', function () {
                expect(resp.invoke(function () {
                    return listener;
                })).toBe(listener);
            });

            it('should be change state to "error" if first argument is not a function or string', function () {
                expect(resp.invoke().state).toBe('error');
                expect(resp.invoke(1).state).toBe('error');
                expect(resp.invoke({}).state).toBe('error');
                expect(resp.invoke([]).state).toBe('error');
            });

            it('should be change state to "error" if function throw exception', function () {
                resp.invoke(function () {
                    throw 'error';
                });

                expect(resp.state).toBe('error');
                expect(resp.stateData).toEqual([new Error('error')]);
            });

            it('should be change state to "pending" if it resolve or reject', function () {
                resp
                    .onPending(listener)
                    .resolve()
                    .invoke(function () {});

                expect(listener).toHaveBeenCalledWith();
            });

            it('should not be change state if it does not resolve or reject', function () {
                resp
                    .setState(1)
                    .onPending(listener)
                    .invoke(function () {});

                expect(listener).not.toHaveBeenCalled();
            });

            describe('method with string', function () {
                var ctx;

                beforeEach(function () {
                    ctx = {
                        method: listener
                    };
                });

                it('should be change state to "error" if context is not defined', function () {
                    resp.invoke('name');

                    expect(resp.state).toBe('error');
                });

                it('should be change state to "error" if method is not defined', function () {
                    resp
                        .setContext(ctx)
                        .invoke('name');

                    expect(resp.state).toBe('error');
                });

                it('should be called in custom context', function () {
                    resp
                        .setContext(ctx)
                        .invoke('method');

                    expect(listener.calls.mostRecent().object).toBe(ctx);
                });

                it('should be called in custom context with arguments', function () {
                    resp
                        .setContext(ctx)
                        .invoke('method', 1, {}, null);

                    expect(listener.calls.mostRecent().object).toBe(ctx);
                    expect(listener).toHaveBeenCalledWith(1, {}, null);
                });
            });

            describe('via static method', function () {
                it('without arguments', function () {
                    Const = getConst(true);
                    Const.prototype.invoke = listener;
                    Const.invoke();

                    expect(listener).toHaveBeenCalledWith();
                    expect(listener.calls.mostRecent().object instanceof Const).toBeTruthy();
                });

                it('with arguments', function () {
                    function callback() {
                    }

                    Const = getConst(true);
                    Const.prototype.invoke = listener;

                    Const.invoke('name', 1, null);
                    expect(listener).toHaveBeenCalledWith('name', 1, null);

                    Const.invoke(callback, 1, null);
                    expect(listener).toHaveBeenCalledWith(callback, 1, null);

                    expect(listener.calls.count()).toBe(2);
                });

                it('should be returns of the method result', function () {
                    expect(Response.invoke(function () {
                        return listener;
                    })).toBe(listener);
                });
            });

            describe('context', function () {
                var ctx = {};

                it('set', function () {
                    resp.setContext(ctx);

                    expect(resp.context).toBe(ctx);
                });

                it('should not be replace if not defined', function () {
                    resp
                        .setContext(ctx)
                        .setContext();

                    expect(resp.context).toBe(ctx);
                });
            });
        });
    });
});
