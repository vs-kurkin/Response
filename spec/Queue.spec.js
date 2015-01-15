describe('Queue:', function () {
    var EE = require('EventEmitter');
    var Response = require('../Response');
    var State = Response.State;
    var Queue = Response.Queue;
    var queue;
    var Const;
    var listener;

    function checkProperties() {
        // Queue
        expect(queue.stack).toEqual([]);
        expect(queue.item).toBeNull();
        expect(queue.isStrict).toBeFalsy();
        expect(queue.isStarted).toBeFalsy();
        expect(queue.isQueue).toBeTruthy();

        expect(queue.EVENT_START).toBe('start');
        expect(queue.EVENT_STOP).toBe('stop');
        expect(queue.EVENT_NEXT_ITEM).toBe('nextItem');
    }

    function checkInherit() {
        expect(queue instanceof Const).toBeTruthy();
    }

    function checkPrototype() {
        expect(Const.prototype instanceof Response).toBeTruthy();
        expect(Const.prototype.hasOwnProperty('constructor')).toBeTruthy();
        expect(Const.prototype.constructor).toBe(Const);
    }

    function checkType() {
        expect(State.isState(queue)).toBeTruthy();
        expect(Response.isResponse(queue)).toBeTruthy();
        expect(Queue.isQueue(queue)).toBeTruthy();
    }

    beforeEach(function () {
        Const = Queue;
        queue = new Queue();
        listener = jasmine.createSpy();
    });

    it('check exports', function () {
        expect(typeof Queue).toBe('function');
        expect(typeof Response.queue).toBe('function');
        expect(typeof Response.strictQueue).toBe('function');
    });

    it('check constructor: prototype', checkPrototype);

    describe('check instance:', function () {
        it('inherit', checkInherit);
        it('properties', checkProperties);
        it('type', checkType);

        it('set stack', function () {
            var stack = [1, 2, 3];

            expect(new Queue(stack).stack).toBe(stack);
        });

        it('set empty stack', function () {
            var stack = [];

            expect(new Queue(stack).stack).toBe(stack);
        });

        it('set invalid stack', function () {
            expect(new Queue(1).stack).toEqual([]);
            expect(new Queue('1').stack).toEqual([]);
            expect(new Queue({}).stack).toEqual([]);
            expect(new Queue(null).stack).toEqual([]);
            expect(new Queue(undefined).stack).toEqual([]);
            expect(new Queue(function () {
            }).stack).toEqual([]);
        });
    });

    describe('check inheritance for', function () {
        beforeEach(function () {
            Const = function (stack, start) {
                Queue.call(this, stack, start);
            };

            Queue.create(Const, true);

            queue = new Const();
        });

        describe('constructor:', function () {
            describe('prototype', function () {
                it('inherit', checkPrototype);

                it('changed constants', function () {
                    Const.prototype.EVENT_START = 'test1';
                    Const.prototype.EVENT_STOP = 'test2';
                    Const.prototype.EVENT_NEXT_ITEM = 'test3';

                    new Const([1])
                        .onStart(listener)
                        .onStop(listener)
                        .onNextItem(listener)
                        .start();

                    expect(listener.calls.count()).toBe(3);
                });
            });

            it('static methods', function () {
                for (var name in Const) {
                    if (Const.hasOwnProperty(name)) {
                        expect(Const[name]).toBe(Queue[name]);
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

    describe('isQueue', function () {
        it('check invalid arguments', function () {
            expect(Queue.isQueue()).toBeFalsy();
            expect(Queue.isQueue(null)).toBeFalsy();
            expect(Queue.isQueue(1)).toBeFalsy();
            expect(Queue.isQueue('')).toBeFalsy();
            expect(Queue.isQueue({})).toBeFalsy();
            expect(Queue.isQueue(new State())).toBeFalsy();
            expect(Queue.isQueue(new Response())).toBeFalsy();
            expect(Queue.isQueue(function () {
            })).toBeFalsy();
        });

        it('check object', function () {
            expect(Queue.isQueue({
                isQueue: true
            })).toBeTruthy();
        });
    });

    it('check created object', function () {
        queue = Queue.create();

        checkInherit();

        expect(queue.hasOwnProperty('constructor')).toBeFalsy();
        expect(queue.constructor).toBe(Queue);

        expect(queue === Queue.prototype).toBeFalsy();
    });

    it('create queue via static method', function () {
        queue = Response.queue(1, {}, listener);

        expect(Queue.isQueue(queue)).toBeTruthy();
        expect(queue.stack).toEqual([1, {}, listener]);
        expect(queue.state).toBe('pending');
        expect(queue.isStrict).toBeFalsy();
    });

    it('create strict queue via static method', function () {
        queue = Response.strictQueue(1, {}, listener);

        expect(Queue.isQueue(queue)).toBeTruthy();
        expect(queue.stack).toEqual([1, {}, listener]);
        expect(queue.state).toBe('pending');
        expect(queue.isStrict).toBeTruthy();
    });

    describe('start queue', function () {
        describe('via constructor:', function () {
            it('if queue is not started, state should be is "pending"', function () {
                expect(new Queue([listener]).state).toBe('pending');
                expect(new Queue([listener], 1).state).toBe('pending');
                expect(new Queue([listener], '1').state).toBe('pending');
                expect(new Queue([listener], false).state).toBe('pending');
                expect(new Queue([listener], null).state).toBe('pending');
                expect(new Queue([listener], {}).state).toBe('pending');
                expect(new Queue([listener], []).state).toBe('pending');
                expect(new Queue([listener], function () {
                }).state).toBe('pending');

                expect(listener).not.toHaveBeenCalled();
            });

            it('if stack is empty, queue should be changed state to "resolve"', function () {
                expect(new Queue([], true).state).toBe('resolve');
            });
        });

        describe('via start method:', function () {
            it('check returns value', function () {
                expect(queue.start()).toBe(queue);
            });

            it('queue should be changed state to "resolve" at completion', function () {
                expect(new Queue().start().state).toBe('resolve');
                expect(new Queue([1]).start().state).toBe('resolve');
            });

            it('should be emit "start" and "stop" events', function () {
                new Queue([1])
                    .on('start', listener)
                    .on('stop', listener)
                    .start();

                expect(listener.calls.count()).toBe(2);
            });

            it('if stack is empty, queue should be emit "start" and "stop" events', function () {
                queue
                    .on('start', listener)
                    .on('stop', listener)
                    .start();

                expect(listener.calls.count()).toBe(2);
            });

            it('if state of queue is "resolve" or "error", it should not starts', function () {
                expect(new Queue([listener])
                    .resolve()
                    .start()
                    .state).toBe('resolve');

                expect(new Queue([listener])
                    .reject(1)
                    .start()
                    .state).toBe('error');

                expect(listener).not.toHaveBeenCalled();
                expect(listener.calls.count()).toBe(0);
            });

            it('repeated call "start" does not have to run queue', function () {
                new Queue([function () {
                    this.start();
                }])
                    .on('start', listener)
                    .start();

                expect(listener.calls.count()).toBe(1);
            });

            it('start queue after stopping', function () {
                queue = new Queue([function () {
                    this.stop();
                    return 1;
                }, listener], true);

                expect(listener).not.toHaveBeenCalled();
                expect(queue.isStarted).toBe(false);
                expect(queue.item).toBe(1);
                expect(queue.stateData).toEqual([1]);
                expect(queue.stack).toEqual([listener]);
                expect(queue.state).toBe('pending');

                queue.start();

                expect(listener.calls.count()).toBe(1);
                expect(queue.state).toBe('resolve');
            });

            it('start listener should be called without arguments and  with of queue context', function () {
                queue
                    .on('start', listener)
                    .start();

                expect(listener).toHaveBeenCalledWith();
                expect(listener.calls.mostRecent().object).toBe(queue);
            });
        });

        describe('stop queue', function () {
            it('check returns value', function () {
                expect(queue.stop()).toBe(queue);
            });

            it('in stack item', function () {
                new Queue([function () {
                    this.stop();
                }, listener], true);

                expect(listener).not.toHaveBeenCalled();
            });

            it('in "start" event listener', function () {
                queue = new Queue([listener])
                    .on('start', function () {
                        this.stop();
                    })
                    .start();

                expect(listener).not.toHaveBeenCalled();
                expect(queue.isStarted).toBe(false);
                expect(queue.item).toBe(null);
                expect(queue.stateData).toEqual([]);
                expect(queue.stack).toEqual([listener]);
                expect(queue.state).toBe('pending');
            });

            it('in "nextItem" event listener', function () {
                queue = new Queue([1, 2])
                    .on('stop', listener)
                    .on('nextItem', function () {
                        this.stop();
                    })
                    .start();

                expect(listener).toHaveBeenCalled();
                expect(queue.isStarted).toBe(false);
                expect(queue.item).toBe(1);
                expect(queue.stateData).toEqual([1]);
                expect(queue.stack).toEqual([2]);
                expect(queue.state).toBe('pending');
            });

            it('queue should not emit "stop" event, if it is  stopped', function () {
                queue
                    .onStop(listener)
                    .stop();

                expect(listener).not.toHaveBeenCalled();
            });

            it('queue should be stopped on resolve or reject', function () {
                new Queue([function () {
                    this.resolve();
                }, 2])
                    .on('stop', listener)
                    .start();

                expect(listener).toHaveBeenCalled();
                expect(queue.stateData).toEqual([]);
                expect(queue.stack).toEqual([]);
                expect(queue.item).toBeNull();
            });
        });

        describe('stack', function () {
            it('result of the queue must match stack', function () {
                expect(new Queue([1, function () {
                    return 2;
                }, {}], true).stateData).toEqual([1, 2, {}]);
            });

            it('the execution order must match the stack', function () {
                var callStack = [];

                function i1() {
                    callStack.push(1);
                }

                function i2() {
                    callStack.push(2);
                }

                function i3() {
                    callStack.push(3);
                }

                new Queue([i1, i2, i3], true);

                expect(callStack).toEqual([1, 2, 3]);
            });

            it('queue should not be rejected if a function has thrown an exception', function () {
                queue = new Queue([function () {
                    throw 'error';
                }], true);

                expect(queue.state).toBe('resolve');
                expect(queue.stateData).toEqual([new Error('error')]);
            });

            it('strict queue should be rejected if a function has thrown an exception', function () {
                queue = new Queue([function () {
                    throw 'error';
                }, listener])
                    .strict()
                    .start();

                expect(queue.state).toBe('error');
                expect(queue.stateData).toEqual([new Error('error')]);
                expect(listener).not.toHaveBeenCalled();
            });

            it('check items as response', function () {
                var r1 = new Response();
                var r2 = new Response();
                var r3 = new Response().resolve();

                queue = new Queue([r1, r2, r3], true);

                expect(queue.stack).toEqual([r2, r3]);
                expect(queue.stateData).toEqual([r1]);
                expect(queue.item).toBe(r1);
                expect(queue.state).toBe('pending');

                r1.resolve();

                expect(queue.stack).toEqual([r3]);
                expect(queue.stateData).toEqual([r1, r2]);
                expect(queue.item).toBe(r2);
                expect(queue.state).toBe('pending');

                r2.resolve();

                expect(queue.stack).toEqual([]);
                expect(queue.stateData).toEqual([r1, r2, r3]);
                expect(queue.item).toBeNull();
                expect(queue.state).toBe('resolve');
            });

            it('strict queue should be rejected if item is rejected', function () {
                queue = new Queue([new Response().reject('error')])
                    .on('error', listener)
                    .on('stop', listener)
                    .strict()
                    .start();

                expect(queue.state).toBe('error');
                expect(queue.stateData).toEqual([new Error('error')]);
                expect(queue.item).toBeNull();
                expect(listener.calls.count()).toBe(2);
            });

            it('push in stack', function () {
                queue = new Queue([0]).push(1, null, {});

                expect(queue.stack).toEqual([0, 1, null, {}]);

                queue.start();

                expect(queue.stateData).toEqual([0, 1, null, {}]);
            });

            it('dynamic push in stack', function () {
                queue = new Queue([function () {
                    this.push(listener);
                }], true);

                expect(listener.calls.count()).toBe(1);
            });
        });

        it('set strict', function () {
            expect(queue.isStrict).toBeFalsy();
            expect(queue.strict()).toBe(queue);
            expect(queue.isStrict).toBeTruthy();
            expect(queue.strict(false).isStrict).toBeFalsy();
            expect(queue.strict(true)).toBeTruthy();
        });

        describe('subscribe', function () {
            var ctx = {};

            it('on "start" event', function () {
                expect(queue.onStart(listener)).toBe(queue);

                queue.start();

                expect(listener.calls.mostRecent().object).toBe(queue);
            });

            it('on "start" event (custom context)', function () {
                queue.onStart(listener, ctx).start();

                expect(listener.calls.mostRecent().object).toBe(ctx);
            });

            it('on "stop" event', function () {
                expect(queue.onStop(listener)).toBe(queue);

                queue.start();

                expect(listener.calls.mostRecent().object).toBe(queue);
            });

            it('on "stop" event (custom context)', function () {
                queue.onStop(listener, ctx).start();

                expect(listener.calls.mostRecent().object).toBe(ctx);
            });

            it('on "nextItem" event (mould not be called if stack is empty)', function () {
                expect(queue.onNextItem(listener)).toBe(queue);

                queue.start();

                expect(listener.calls.count()).toBe(0);
            });

            it('on "nextItem" event should be called with current item in argument', function () {
                queue
                    .push(1)
                    .onNextItem(function (item) {
                        expect(item).toBe(this.item);
                    })
                    .start();
            });

            it('event "nextItem" should be called on every item', function () {
                queue
                    .push(1, 2, 3)
                    .onNextItem(listener)
                    .start();

                expect(listener.calls.count()).toBe(3);
            });

            it('on "nextItem" event (custom context)', function () {
                queue
                    .push(1)
                    .onNextItem(listener, ctx)
                    .start();

                expect(listener.calls.mostRecent().object).toBe(ctx);
            });
        });

        it('destroy items', function () {
            var resp1 = new Response().resolve();
            var resp2 = new Response().resolve();
            var property;

            new Queue([resp1, resp2], true).destroyItems();

            for (property in resp1) {
                if (resp1.hasOwnProperty(property)) {
                    expect(resp1[property]).toBeNull();
                }
            }

            for (property in resp2) {
                if (resp2.hasOwnProperty(property)) {
                    expect(resp2[property]).toBeNull();
                }
            }
        });
    });
});
