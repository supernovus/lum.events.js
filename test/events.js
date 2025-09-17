// Tests for events module
"use strict";

const plan = 0;
const t = require('@lumjs/tests').new({module, plan});
const Ev = require('../lib/events');
const {U,F,TYPES} = require('../lib/types');

const TV = 
{
  name1: "Santa",
  name2: "Claus",
  name3: "Baby",
  name4: "Jesus",
}

let obj1 = {name: TV.name1};
let obj2 = {name: TV.name3};
let reg1 = Ev.register([obj1,obj2]);

t.isa(reg1, Ev.Registry, 'basic registry instance');
t.is(obj1.events, reg1, 'obj1.events is the registry');
t.isa(obj1.on, F, 'obj1.on() is a function');
t.isa(obj1.emit, F, 'obj1.emit() is a function');
t.is(obj2.events, reg1, 'obj2.events is the registry');

obj1.on('rename', function(e)
{
  t.isa(e, Ev.Event, 'event object passed to handler');
  t.isa(e.eventListener, Ev.Listener, 'e.eventListener is a Listener');
  t.is(e.data, null, 'e.data is null');
  this.name = e.args[0];
});

t.is(obj1.name, TV.name1, 'obj1.name before rename event');
t.is(obj2.name, TV.name3, 'obj2.name before rename event');

reg1.emit('rename', TV.name2);

t.is(obj1.name, TV.name2, 'obj1.name after rename event');
t.is(obj2.name, TV.name2, 'obj2.name after rename event');

// A new registry instance
let reg2 = Ev.register(obj1, {overwrite: true, extend:{emit: 'trigger'}});
t.is(obj1.events, reg2, 'obj1.events is the replacement registry');

reg2.listen('drink', e => e.target.drank = e.args);
obj1.trigger('drink', 'rum', 'coke');

t.isa(obj1.drank, TYPES.ARRAY, 'obj1.drank is an array');
t.is(obj1.drank.length, 2, 'obj1.drank.length is 2');
t.is(obj1.drank[0], 'rum', 'obj1.drank[0] is rum');
t.isa(obj2.drank, U, 'obj2.drank is undefined');

// We didn't overwrite 'emit' so it should be using the old registry!
obj1.emit('rename', TV.name4);

t.is(obj1.name, TV.name4, 'obj1.name after second rename');
t.is(obj2.name, TV.name4, 'obj2.name after second rename');

/**
 * TODO ⇒ tests for:
 * - Using a function for `targets`
 * - The `setupEvent` option
 * - Using an object handler
 * - Any other advanced features
 */

// Finished
t.done();
