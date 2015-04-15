Response [![Build Status](https://travis-ci.org/B-Vladi/Response.svg?branch=master)](https://travis-ci.org/B-Vladi/Response)
========
The extensible event-driven stateful interface.

 * State(state)
   * `.isState`
   * `.create`
   * `#EVENT_CHANGE_STATE`
   * `#STATE_ERROR`
   * `#isState`
   * `#state`
   * `#keys`
   * `#data`
   * `#stateData`
   * `#invoke(method, args, context)`
   * `#destroy()`
   * `#destroyStateData()`
   * `#is(state)`
   * `#setState(state, data)`
   * `#onState(state, listener, context)`
   * `#onceState(state, listener, context)`
   * `#onChangeState(listener, context)`
   * `#offChangeState(listener)`
   * `#setData(key, value)`
   * `#getData(key)`
   * `#toObject(keys)`
   * `#getStateData(key)`
   * `#toJSON()`

 * Response(parent)
   * `.State(state)`
   * `.Queue(stack, start)`
   * `.isResponse(object)`
   * `.create(constructor, copyStatic)`
   * `.resolve(results)`
   * `.reject(reason)`
   * `.nodeCallback(error, result)`
   * `#State(state)`
   * `#STATE_PENDING`
   * `#STATE_RESOLVED`
   * `#STATE_REJECTED`
   * `#EVENT_PROGRESS`
   * `#isResponse`
   * `#pending()`
   * `#resolve(results)`
   * `#reject(reason)`
   * `#progress(progress)`
   * `#isPending()`
   * `#isResolved()`
   * `#isRejected()`
   * `#then(onResolve, onReject, onProgress, context)`
   * `#always(listener, context)`
   * `#onPending(listener, context)`
   * `#onResolve(listener, context)`
   * `#notify(parent)`
   * `#listen(response)`
   * `#done()`
   * `#getResult(key)`
   * `#getReason()`
   
 * Queue(stack, start)
   * `.create(constructor, copyStatic)`
   * `.isQueue(object)`
   * `#Response(parent)`
   * `#EVENT_START`
   * `#EVENT_STOP`
   * `#EVENT_NEXT_ITEM`
   * `#isQueue`
   * `#isStrict`
   * `#isStarted`
   * `#item`
   * `#start()`
   * `#stop()`
   * `#push()`
   * `#getResults()`
   * `#getReasons()`
   * `#strict(flag)`
   * `#onStart(listener, context)`
   * `#onStop(listener, context)`
   * `#onNextItem(listener, context)`
