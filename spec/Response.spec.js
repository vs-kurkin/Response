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

    function checkResponseProperties(resp) {
        // State
        expect(resp.hasOwnProperty('state')).toBeTruthy();
        expect(resp.hasOwnProperty('data')).toBeTruthy();
        expect(resp.data).toEqual({});
        expect(resp.stateData).toEqual([]);

        expect(resp.context).toBeNull();
        expect(resp.callback).toBeNull();
        expect(resp.keys).toBeNull();
    }

    beforeEach(function () {
        resp = new Response();
        listener = jasmine.createSpy();
    });

    it('check exports', function () {
        expect(typeof Response).toBe('function');
        expect(typeof Response.State).toBe('function');
        expect(typeof Response.Queue).toBe('function');
    });

    it('inherit', function () {
        expect(Response.prototype instanceof EE);
        expect(Response.prototype instanceof State);
        expect(resp instanceof EE);
        expect(resp instanceof State);
        expect(resp instanceof Response);
    });

    describe('instance', function () {
        it('check properties', function () {
            checkResponseProperties(resp);
        });

        it('constructor can not be called in another context object', function () {
            expect(function () {
                Response.call({});
            }).toThrow();
        });

        it('check constants', function () {
            expect(resp.STATE_PENDING).toBe('pending');
            expect(resp.STATE_RESOLVED).toBe('resolve');
            expect(resp.STATE_REJECTED).toBe('error');
            expect(resp.EVENT_PROGRESS).toBe('progress');
        });

        it('check inherited constants', function () {
            Const = getConst();
            Const.prototype.STATE_PENDING = 'test1';
            Const.prototype.STATE_RESOLVED = 'test2';
            Const.prototype.STATE_REJECTED = 'test3';
            Const.prototype.EVENT_PROGRESS = 'test4';

            new Const()
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

        it('set initial state', function () {
            expect(resp.state).toBe('pending');
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

    describe('.isResponse', function () {
        it('check invalid arguments', function () {
            expect(Response.isResponse()).toBeFalsy();
            expect(Response.isResponse(null)).toBeFalsy();
            expect(Response.isResponse(1)).toBeFalsy();
            expect(Response.isResponse('')).toBeFalsy();
            expect(Response.isResponse({})).toBeFalsy();
            expect(Response.isResponse(function () {
            })).toBeFalsy();
        });

        it('check instance', function () {
            expect(resp.isResponse).toBeTruthy();
            expect(Response.isResponse(resp)).toBeTruthy();
            expect(State.isState(resp)).toBeTruthy();
        });

        it('check object', function () {
            expect(Response.isResponse({
                isResponse: true
            })).toBeTruthy();
        });

        it('check inherited object', function () {
            Const = getConst();
            resp = new Const();

            expect(resp.isResponse).toBeTruthy();
            expect(Response.isResponse(resp)).toBeTruthy();
            expect(State.isState(resp)).toBeTruthy();
        });
    });

    describe('.create', function () {
        it('check created object', function () {
            var obj = Response.create();

            expect(obj instanceof Response);
            expect(obj).not.toEqual(Response.prototype);
            expect(obj.hasOwnProperty('constructor')).toBeFalsy();
            expect(obj.constructor).toBe(Response);

            obj.constructor = Response;

            expect(obj).toEqual(Response.prototype);

            expect(obj === Response.prototype).toBeFalsy();
            expect(obj.data).toBeNull();
            expect(obj.stateData).toBeNull();
        });

        it('check object as prototype', function () {
            function Const() {
            }

            var proto = Response.create(Const);

            expect(Const.prototype).toBe(proto);
            expect(proto.hasOwnProperty('constructor')).toBeTruthy();
            expect(proto.constructor).toBe(Const);
        });

        it('check constructor with static methods', function () {
            Const = getConst(true);

            for (var name in Const) {
                if (Const.hasOwnProperty(name)) {
                    expect(Const[name]).toBe(Response[name]);
                }
            }
        });
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
            expect(listener.calls.mostRecent().object).toBe(ctx);
        });

        describe('pending', function () {
            it('should be emits event "pending"', function () {
                resp
                    .on('pending', listener, ctx)
                    .setState(1)
                    .pending();

                expect(listener).toHaveBeenCalled();
            });

            it('should be change state to "pending"', function () {
                resp
                    .onState('pending', listener, ctx)
                    .setState(1)
                    .pending();

                expect(resp.state).toBe('pending');
                expect(listener).toHaveBeenCalled();
            });

            it('(shorthand)', function () {
                resp
                    .onPending(listener, ctx)
                    .setState(1)
                    .pending();

                expect(resp.state).toBe('pending');
                expect(listener).toHaveBeenCalled();
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
            it('from static method', function () {
                resp = Response
                    .resolve(1, null, arg)
                    .onResolve(listener, ctx);

                expect(resp.state).toBe('resolve');
                expect(listener).toHaveBeenCalledWith(1, null, arg);
            });

            it('should be emits event "resolve"', function () {
                resp
                    .on('resolve', listener, ctx)
                    .resolve(1, null, arg);

                expect(listener).toHaveBeenCalledWith(1, null, arg);
            });

            it('should be change state to "resolve"', function () {
                resp
                    .onState('resolve', listener, ctx)
                    .resolve(1, null, arg);

                expect(resp.state).toBe('resolve');
                expect(listener).toHaveBeenCalledWith(1, null, arg);
            });

            it('(shorthand)', function () {
                resp
                    .onResolve(listener, ctx)
                    .resolve(1, null, arg);

                expect(resp.state).toBe('resolve');
                expect(listener).toHaveBeenCalledWith(1, null, arg);
            });

            it('should call the handler once', function () {
                resp
                    .onResolve(listener, ctx)
                    .resolve()
                    .pending()
                    .resolve();

                expect(listener.calls.count()).toBe(1);
            });
        });

        describe('reject', function () {
            it('from static method', function () {
                resp = Response
                    .reject('error')
                    .onReject(listener, ctx);

                expect(resp.state).toBe('error');
                expect(listener).toHaveBeenCalledWith(new Error('error'));
            });

            it('should be emits event "error"', function () {
                resp
                    .on('error', listener, ctx)
                    .reject('error');

                expect(listener).toHaveBeenCalledWith(new Error('error'));
            });

            it('should be change state to "error"', function () {
                resp
                    .onState('error', listener, ctx)
                    .reject('error');

                expect(resp.state).toBe('error');
                expect(listener).toHaveBeenCalledWith(new Error('error'));
            });

            it('(shorthand)', function () {
                resp
                    .onReject(listener, ctx)
                    .reject('error');

                expect(resp.state).toBe('error');
                expect(listener).toHaveBeenCalledWith(new Error('error'));
            });

            it('should call the handler once', function () {
                resp
                    .onReject(listener, ctx)
                    .reject('error')
                    .pending()
                    .reject('error');

                expect(listener.calls.count()).toBe(1);
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
                    .reject('error');

                expect(listener.calls.count()).toBe(3);
            });

            it('on always', function () {
                resp
                    .always(listener, ctx)
                    .resolve()
                    .reject('error')
                    .setState(1)
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
});
