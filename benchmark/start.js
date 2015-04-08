var Benchmark = require('benchmark');
var oldResponse = require('Response');
var Response = require('../Response');

var or = new oldResponse();
var r = new Response();

var suits = [{
    name: '#destroy()',
    Old: function () {
        new oldResponse().destroy();
    },
    New: function () {
        new Response().destroy();
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
        .add('Old', suit.Old)
        .add('New', suit.New)
        .on('start', onStart)
        .on('cycle', onCycle)
        .on('complete', onComplete)
        .run();
}
