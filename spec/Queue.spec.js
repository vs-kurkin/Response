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
        expect(queue.items).toEqual([]);
        expect(queue.item).toBeNull();
        expect(queue.isStrict).toBeFalsy();
        expect(queue.isStarted).toBeFalsy();
        expect(queue.isQueue).toBeTruthy();
    }

    function checkQueue(state, stateData, items, item, isStarted) {
        expect(queue.state).toBe(state);
        expect(queue.stateData).toEqual(stateData);
        expect(queue.items).toEqual(items);
        expect(queue.item).toBe(item);
        expect(queue.isStarted).toBe(isStarted);
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

        expect(Queue.EVENT_START).toBe('start');
        expect(Queue.EVENT_STOP).toBe('stop');
        expect(Queue.EVENT_NEXT_ITEM).toBe('nextItem');
    });

    it('check constructor: prototype', checkPrototype);

    describe('check instance:', function () {
        it('inherit', checkInherit);
        it('properties', checkProperties);
        it('type', checkType);

        it('set items', function () {
            var items = [1, 2, 3];

            expect(new Queue(items).items).toBe(items);
        });

        it('set empty items', function () {
            var items = [];

            expect(new Queue(items).items).toBe(items);
        });

        it('set invalid items', function () {
            expect(new Queue(1).items).toEqual([]);
            expect(new Queue('1').items).toEqual([]);
            expect(new Queue({}).items).toEqual([]);
            expect(new Queue(null).items).toEqual([]);
            expect(new Queue(undefined).items).toEqual([]);
            expect(new Queue(function () {
            }).items).toEqual([]);
        });
    });

    describe('check inheritance for', function () {
        beforeEach(function () {
            Const = function (items, start) {
                Queue.call(this, items, start);
            };

            Queue.create(Const, true);

            queue = new Const();
        });

        describe('constructor:', function () {
            it('inherit', checkPrototype);

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

    describe('items', function () {
        it('result of the queue must match items', function () {
            expect(new Queue([1, function () {
                return 2;
            }, {}], true).stateData).toEqual([1, 2, {}]);
        });

        it('the execution order must match the items', function () {
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

        it('queue should be wait if function returned pending response object', function () {
            var r = new Response();
            queue = new Queue([function () {
                return r;
            }], true);

            expect(queue.state).toBe('pending');

            r.resolve();

            expect(queue.state).toBe('resolve');
        });

        it('queue should not be rejected if a function has thrown an exception', function () {
            queue = new Queue([function () {
                throw 'error';
            }])
                .start();

            checkQueue('resolve', [new Error('error')], [], null, false);
        });

        it('strict queue should be rejected if a function has thrown an exception', function () {
            queue = new Queue([function () {
                throw 'error';
            }, listener])
                .strict()
                .start();

            checkQueue('error', [new Error('error')], [], null, false);
            expect(listener).not.toHaveBeenCalled();
        });

        it('check items as response', function () {
            var r1 = new Response();
            var r2 = new Response();
            var r3 = new Response().resolve();

            queue = new Queue([r1, r2, r3], true);

            checkQueue('pending', [r1], [r2, r3], r1, true);

            r1.resolve();

            checkQueue('pending', [r1, r2], [r3], r2, true);

            r2.resolve();

            checkQueue('resolve', [r1, r2, r3], [], null, false);
        });

        it('strict queue should be rejected if item is rejected', function () {
            queue = new Queue([new Response().reject('error')])
                .on('error', listener)
                .on('stop', listener)
                .strict()
                .start();

            checkQueue('error', [new Error('error')], [], null, false);
            expect(listener.calls.count()).toBe(2);
        });

        it('push in items', function () {
            queue = new Queue([0]).push(1);

            expect(queue.items).toEqual([0, 1]);

            queue.start();

            expect(queue.stateData).toEqual([0, 1]);
        });

        it('push in items with key', function () {
            var i0 = 0;
            var i1 = 1;
            var i2 = function name() {
            };
            var i3 = {name: 'name'};

            queue = new Queue([i0])
                .push(i1, '1')
                .push(i2)
                .push(i2, 'value')
                .push(i3)
                .push(i3, 'value');

            expect(queue.keys).toEqual([undefined, '1', 'name', 'value', 'name', 'value']);
            expect(queue.items).toEqual([i0, i1, i2, i2, i3, i3]);
        });

        it('order of the keys by dynamic addition', function () {
            var q = new Queue();

            queue = new Queue()
                .push(1, 'a')
                .push(function b () {
                    expect(this.keys).toEqual(['a', 'b', 'c']);

                    this.push(q, 'd');

                    expect(this.keys).toEqual(['a', 'b', 'c', 'd']);
                    expect(this.keys.length).toBe(4);

                    return q;
                })
                .push(3, 'c')
                .start();

            q.resolve();

            expect(queue.keys).toEqual(['a', 'b', 'c', 'd']);
        });

        it('dynamic push in items', function () {
            queue = new Queue([{
                    name: 'key0'
                }])
                .push(function key1 () {
                    this.push(listener, 'key3');
                })
                .push(function key2 () {
                    this
                        .push(listener, 'key4')
                        .push(listener, 'key5');
                })
                .start();

            expect(listener.calls.count()).toBe(3);
            expect(queue.keys).toEqual([undefined, 'key1', 'key2', 'key3', 'key4', 'key5']);
        });
    });

    it('set strict', function () {
        expect(queue.isStrict).toBeFalsy();
        expect(queue.strict()).toBe(queue);
        expect(queue.isStrict).toBeTruthy();
        expect(queue.strict(false).isStrict).toBeFalsy();
        expect(queue.strict(true).isStrict).toBeTruthy();
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

        it('on "nextItem" event (mould not be called if items is empty)', function () {
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
                .push(1)
                .push(2)
                .push(3)
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

        it('on "itemRejected" event should not be fired if all items has resolved', function () {
            queue
                .push(1)
                .push(function () {})
                .push((new Response()).resolve())
                .onItemRejected(listener)
                .start();

            queue.onResolve(function () {
                expect(listener.calls.count()).toBe(0);
            });
        });

        it('on "itemRejected" event should be fired with an error as argument', function () {
            var error = new Error();

            queue
                .push(function () {
                    throw error;
                })
                .onItemRejected(function (_error) {
                    expect(_error).toBe(error);
                })
                .start();
        });

        it('on "itemRejected" event should fire for rejected Response', function () {
            var resp = new Response();
            resp.reject(new Error());

            queue
                .push(resp)
                .onItemRejected(listener)
                .start();

            queue.onResolve(function () {
                expect(listener.calls.count()).toBe(1);
            });
        });

        it('on "itemRejected" event should fire for rejected function', function () {
            queue
                .push(function () {
                    throw new Error();
                })
                .onItemRejected(listener)
                .start();

            queue.onResolve(function () {
                expect(listener.calls.count()).toBe(1);
            });
        });

        it('on "itemRejected" event should fire once for each rejected item', function () {
            function failingFn () {
                throw new Error();
            }

            queue
                .push(failingFn)
                .push((new Response()).reject(new Error()))
                .push(2)
                .onItemRejected(listener)
                .onResolve(function () {
                    expect(listener.calls.count()).toBe(2);
                })
                .start();
        });

        it('on "itemRejected" should not fire if function has returned an Error object', function () {
            queue
                .push(function () {
                    return new Error();
                })
                .onItemRejected(listener)
                .onResolve(function () {
                    expect(listener.calls.count()).toBe(0);
                })
                .start();
        });

        it('on "itemRejected" should be fired before strict queue reject (function)', function () {
            var onItemRejectedCalled = false;
            var onRejectedCalled = false;

            queue
                .strict()
                .push(function () {
                    throw new Error();
                })
                .onItemRejected(function () {
                    onItemRejectedCalled = true;
                    expect(onRejectedCalled).toBe(false);
                })
                .onReject(function () {
                    onRejectedCalled = true;
                    expect(onItemRejectedCalled).toBe(true);
                })
                .start();
        });

        it('on "itemRejected" should be fired before strict queue reject (Response)', function () {
            var onItemRejectedCalled = false;
            var onRejectedCalled = false;

            queue
                .strict()
                .push((new Response()).reject(new Error()))
                .onItemRejected(function () {
                    onItemRejectedCalled = true;
                    expect(onRejectedCalled).toBe(false);
                })
                .onReject(function () {
                    onRejectedCalled = true;
                    expect(onItemRejectedCalled).toBe(true);
                })
                .start();
        });
    });

    describe('destroy', function () {
        it('should destroyed items in items and in results', function () {
            var resp0 = new Response();
            var resp1 = new Response().resolve(resp0);
            var resp2 = new Response().resolve();
            var property;

            new Queue([resp1, function () {
                this.destroy(true);

                for (property in resp0) {
                    if (resp0.hasOwnProperty(property)) {
                        expect(resp0[property]).toBeUndefined();
                    }
                }

                for (property in resp1) {
                    if (resp1.hasOwnProperty(property)) {
                        expect(resp1[property]).toBeUndefined();
                    }
                }

                for (property in resp2) {
                    if (resp2.hasOwnProperty(property)) {
                        expect(resp2[property]).toBeUndefined();
                    }
                }
            }, resp2], true);
        });
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

            it('if items is empty, queue should be changed state to "resolve"', function () {
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

            it('if items is empty, queue should be emit "start" and "stop" events', function () {
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

            it('start listener should be called without arguments and with of queue context', function () {
                queue
                    .on('start', listener)
                    .start();

                expect(listener).toHaveBeenCalledWith();
                expect(listener.calls.mostRecent().object).toBe(queue);
            });
        });

        describe('after stopping', function () {
            it('in task, response was resolved', function () {
                var r = new Response();

                queue = new Queue([function () {
                    this.stop();
                    return r;
                }])
                    .start();

                r.resolve();

                checkQueue('pending', [r], [], r, false);

                queue.start();

                checkQueue('resolve', [r], [], null, false);
            });

            it('and response was resolved', function () {
                var r = new Response();

                queue = new Queue([r])
                    .start()
                    .stop();

                r.resolve();

                queue.start();

                checkQueue('resolve', [r], [], null, false);
            });

            it('and response was pending', function () {
                var r = new Response();

                queue = new Queue([r])
                    .start()
                    .stop()
                    .start();

                r.resolve();

                checkQueue('resolve', [r], [], null, false);
            });
        });
    });

    describe('stop queue', function () {
        it('check returns value', function () {
            expect(queue.stop()).toBe(queue);
        });

        it('in items', function () {
            queue = new Queue([function () {
                this.stop();
                return 1;
            }, listener])
                .start();

            checkQueue('pending', [1], [listener], 1, false);
            expect(listener).not.toHaveBeenCalled();

            queue.start();

            checkQueue('resolve', [1, undefined], [], null, false);
            expect(listener).toHaveBeenCalled();
        });

        it('in "start" event listener', function () {
            queue = new Queue([listener])
                .on('start', function () {
                    this.stop();
                })
                .start();

            checkQueue('pending', [], [listener], null, false);
            expect(listener).not.toHaveBeenCalled();

            queue.start();

            checkQueue('pending', [], [listener], null, false);
            expect(listener).not.toHaveBeenCalled();
        });

        it('in "nextItem" event listener', function () {
            queue = new Queue([1, 2])
                .on('stop', listener)
                .on('nextItem', function () {
                    this.stop();
                })
                .start();

            checkQueue('pending', [1], [2], 1, false);

            queue.start();

            checkQueue('pending', [1, 2], [], 2, false);

            queue.start();

            checkQueue('resolve', [1, 2], [], null, false);
            expect(listener.calls.count()).toBe(3);
        });

        it('should not emit "stop" event, if it is stopped', function () {
            queue
                .onStop(listener)
                .stop();

            expect(listener).not.toHaveBeenCalled();
        });

        it('should be stopped on resolve in task', function () {
            queue = new Queue([function () {
                this.resolve();
            }, 2])
                .on('stop', listener)
                .start();

            checkQueue('resolve', [], [], null, false);
            expect(listener).toHaveBeenCalled();
        });

        it('should be stopped on reject in task', function () {
            queue = new Queue([function () {
                this.reject('error');
            }, 2])
                .on('stop', listener)
                .start();

            checkQueue('error', [new Error('error')], [], null, false);
            expect(listener).toHaveBeenCalled();
        });
    });

    describe('current item', function () {
        it('should be previous object', function () {
            var r1 = Response.resolve();
            var r2 = Response.resolve();

            new Queue([r1, function () {
                expect(this.item).toBe(r1);

                return r2;
            }, function () {
                expect(this.item).toBe(r2);
            }], true);
        });

        it('should not pass undefined to next task', function () {
            queue
                .push(function task1 () {

                })
                .push(function task2 () {
                    expect(arguments.length).toBe(0);
                });
        });
    });

    describe('bind', function () {
        it('should run tasks in queue context by default', function () {
            queue
                .push(function () {
                    expect(this).toBe(queue);
                })
                .start();
        });

        it('should run tasks in specified context', function () {
            var context = {};
            queue
                .bind(context)
                .push(function () {
                    expect(this).toBe(context);
                })
                .start();
        });
    });

    it('getResult should be returns result if state is pending', function () {
        new Queue()
            .push(1, 'one')
            .push(function () {
                expect(this.getResult('one')).toBe(1);
                expect(this.getResult()).toEqual({
                    one: 1
                });
            })
            .start();
    });
});
