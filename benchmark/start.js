var Benchmark = require('benchmark');
var oldResponse = require('Response');
var Response = require('../Response');

var or = new oldResponse();
var r = new Response();
var fnc = function () {};
var response;
var queue;

var suits = [{
    name: '#destroy()',
    Old: function () {
        new oldResponse().destroy();
    },
    New: function () {
        new Response().destroy();
    }
}, {
    name: '#onResolve()',
    fn: function () {
        response.onResolve(r);
    },
    Old: {
        onStart: function () {
            r = new oldResponse().onResolve(fnc);
            response = new oldResponse().resolve();
        }
    },
    New: {
        onStart: function () {
            r = new Response().onResolve(fnc);
            response = new Response().resolve();
        }
    }
}, {
    name: '#resolve()',
    fn: function () {
        response.resolve().pending();
    },
    Old: {
        onStart: function () {
            response = new oldResponse().onState('resolve', fnc);
        }
    },
    New: {
        onStart: function () {
            response = new Response().onState('resolve', fnc);
        }
    }
}, {
    name: '#reject()',
    fn: function () {
        response.reject().pending();
    },
    Old: {
        onStart: function () {
            response = new oldResponse().onState('reject', fnc);
        }
    },
    New: {
        onStart: function () {
            response = new Response().onState('reject', fnc);
        }
    }
}, {
    name: '#progress()',
    fn: function () {
        response.progress();
    },
    Old: {
        onStart: function () {
            response = new oldResponse().onProgress(fnc);
        }
    },
    New: {
        onStart: function () {
            response = new Response().onProgress(fnc);
        }
    }
}, {
    name: 'new Queue().start()',
    Old: function () {
        new oldResponse.Queue([fnc, fnc, fnc], true);
    },
    New: function () {
        new Response.Queue([fnc, fnc, fnc], true);
    }
}, {
    name: 'Queue#start()',
    fn: function () {
        queue.start().pending();
    },
    Old: {
        onStart: function () {
            queue = new oldResponse.Queue([fnc, fnc, fnc]).onNextItem(fnc).onResolve(fnc);
        }
    },
    New: {
        onStart: function () {
            queue = new Response.Queue([fnc, fnc, fnc]).onNextItem(fnc).onResolve(fnc);
        }
    }
}];

function onComplete() {
    console.log('\tFastest is "' + this.filter('fastest').pluck('name') + '"\n');
}

function onStart() {
    console.log(this.name + ':');
}

function onCycle(event) {
    console.log('\t' + String(event.target));
}

var length = suits.length;
var index = 0;

while (index < length) {
    var suit = suits[index++];

    new Benchmark.Suite(suit.name)
        .add('Old', suit.fn || suit.Old, suit.Old)
        .add('New', suit.fn || suit.New, suit.New)
        .on('start', onStart)
        .on('cycle', onCycle)
        .on('complete', onComplete)
        .run();
}
