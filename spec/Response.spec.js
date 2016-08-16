describe('Response:', function () {
    var Response = require('../Response');
    var State = Response.State;
    var resp;
    var Const;
    var listener;
    var arg;
    var ctx;

    function getConst(sp) {
        function Const() {
        }

        Response.create(Const, sp);

        return Const;
    }

    function checkProperties() {
        expect(resp.state).toBe('pending');
        expect(resp.keys).toEqual([]);
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
        arg = {};
        ctx = {};
    });

    it('check exports', function () {
        expect(typeof Response).toBe('function');

        expect(Response.STATE_PENDING).toBe('pending');
        expect(Response.STATE_RESOLVED).toBe('resolve');
        expect(Response.STATE_REJECTED).toBe('error');
        expect(Response.EVENT_PROGRESS).toBe('progress');
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
            expect(resp.destroy().isPending()).toBeFalsy();
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

            it('Do not should wrap object of custom error', function () {
                function MyErr(msg) {
                    Error.call(this, msg);
                }
                MyErr.prototype = new Error();

                resp
                    .onReject(function (error) {
                        expect(error instanceof MyErr).toBeTruthy();
                        expect(this).toBe(ctx);
                    }, ctx)
                    .reject(new MyErr('error'))
                    .reject('error')
                    .onReject(listener, ctx);
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

            it('on any', function () {
                resp
                    .any(listener, ctx)
                    .resolve()
                    .reject('error')
                    .setState(1)
                    .pending(1)
                    .reject('error')
                    .pending(1);

                expect(listener.calls.count()).toBe(1);
            });

            it('on a several any', function () {
                var listener2 = jasmine.createSpy();

                resp
                    .any(listener, ctx)
                    .any(listener2, ctx)
                    .resolve();

                expect(listener2.calls.count()).toBe(1);
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

    describe('fork', function () {
        it('should return a new response', function () {
            expect(Response.isResponse(resp.fork())).toBeTruthy();
        });

        it('should subscribe a new response', function () {
            var resp2 = resp.fork();

            resp.resolve();

            expect(resp2.isResolved()).toBeTruthy();

            resp.reject('error');

            expect(resp2.isRejected()).toBeTruthy();

            resp.setState(1);

            expect(resp2.isRejected()).toBeTruthy();
        });

        it('new response don`t modify a parent', function () {
            var resp2 = resp.fork();

            resp2.resolve();

            expect(resp.isPending()).toBeTruthy();
        });
    });

    describe('map', function () {
        it('should invoke listener if state is resolved', function () {
            resp
                .resolve(arg)
                .map(listener);

            expect(listener).toHaveBeenCalledWith(arg);
        });

        it('default context must be a response', function () {
            resp
                .resolve(arg)
                .map(listener);

            expect(listener.calls.mostRecent().object).toBe(resp);
        });

        it('call with custom context', function () {
            resp
                .resolve(arg)
                .map(listener, ctx);

            expect(listener.calls.mostRecent().object).toBe(ctx);
        });

        it('should called listener only on resolve', function () {
            resp.map(listener, ctx);

            expect(listener).not.toHaveBeenCalled();

            resp.reject('error');

            expect(listener).not.toHaveBeenCalled();

            resp.pending();

            expect(listener).not.toHaveBeenCalled();

            resp.resolve();

            expect(listener).toHaveBeenCalled();
        });

        it('should reject if listener throw exception', function () {
            var error = new Error('error');
            var onMap = function () {
                throw error;
            };

            resp
                .map(onMap)
                .onReject(listener)
                .resolve();

            expect(listener).toHaveBeenCalledWith(error);
            expect(resp.isRejected()).toBeTruthy();

            resp
                .resolve()
                .map(onMap);

            expect(listener).toHaveBeenCalledWith(error);
            expect(resp.isRejected()).toBeTruthy();
        });
    });

    describe('getResult', function () {
        it('should return undefined if rejected', function () {
            expect(resp.setState(1, [2]).getResult()).toBe(2);
            expect(resp.reject('error').getResult()).toBeUndefined();
        });

        it('should return result by key', function () {
            resp
                .setKeys(['key1', 'key2'])
                .resolve(1, 2);

            expect(resp.getResult('key1')).toBe(1);
            expect(resp.getResult('key2')).toBe(2);
        });

        it('should called toObject when return by key', function () {
            resp
                .setKeys(['1'])
                .resolve({toObject: listener})
                .getResult('1');

            expect(listener).toHaveBeenCalled();
        });

        it('should return first result if keys is not defined', function () {
            expect(resp.resolve(1, 2).getResult()).toBe(1);
        });

        it('should called toObject for first result', function () {
            resp.resolve({
                toObject: listener
            }).getResult();

            expect(listener).toHaveBeenCalled();
        });

        it('should return results by default keys', function () {
            resp
                .setKeys(['key1', 'key2'])
                .resolve(1, 2);

            expect(resp.getResult()).toEqual({
                key1: 1,
                key2: 2
            });
        });

        it('should called toObject for all results', function () {
            resp
                .setKeys(['key1', 'key2'])
                .resolve({toObject: listener}, {toObject: listener})
                .getResult();

            expect(listener.calls.count()).toBe(2);
        });

        it('should return results by custom keys', function () {
            resp
                .setKeys(['key1', 'key2'])
                .resolve(1, 2);

            expect(resp.getResult(['key3', 'key4'])).toEqual({
                key3: 1,
                key4: 2
            });
        });
    });

    describe('getReason', function () {
        it('should return undefined if not rejected', function () {
            expect(resp.getReason()).toBeUndefined();
            expect(resp.resolve().getReason()).toBeUndefined();
        });

        it('should return error if rejected', function () {
            expect(resp.reject('error').getReason()).toEqual(new Error('error'));
            expect(resp.getReason()).toBe(resp.stateData[0]);
        });
    });
});
