"use strict";

const {SY,F,isObj} = require('@lumjs/core/types');

/**
 * An Event object to emit to handler callbacks.
 * 
 * @prop {module:@lumjs/events.Listener} eventListener
 * The event Listener instance this event was emitted from.
 * @prop {(string|Symbol)} type - The event type that was emitted.
 * @prop {string} name - The event name that was emitted;
 * if `type` is a string this will be the same value,
 * for a Symbol type this will be the `type.description` value.
 * In the unlikely scenario the symbol has no description,
 * a special value of "‽" will be used. Just name your damn symbols!
 * @prop {object} target - Target object for this event.
 * @prop {Array} args - Arguments passed to `emit()`
 * @prop {object} options - Composes options from the
 * Registry and the Listener. Listener options take priority.
 * @prop {?object} data 
 * If `args[0]` is any kind of `object` other than another Event 
 * instance, it will be used as the `data` property. 
 * If `args[0]` is not an `object`, this property will be `null`.
 * @prop {module:@lumjs/events.Event} origEvent
 * Unless `this.prevEvent` is set, this should always be
 * a reference to `this` instance itself.
 * @prop {?module:@lumjs/events.Event} prevEvent
 * If `args[0]` is another Event instance this property
 * will be set with its value, as well as the following
 * changes to the default behavior:
 * 
 * - `this.data` will be set to `prevEvent.data`.
 * - `this.origEvent` will be set to `prevEvent.origEvent`
 * - `args.shift()` to remove `prevData` from args.
 * 
 * @prop {module:@lumjs/events~Status} emitStatus
 * 
 * @prop {(module:@lumjs/events.TypeData|undefined)} typeData
 * If there is event type metadata or options found in the Registry
 * for the `type` value, then it this property will be that object.
 * 
 * See {@link module:@lumjs/events.Registry#set} for more details.
 * 
 * @alias module:@lumjs/events.Event
 */
class LumEvent 
{
  /**
   * Create a new Event instance; should not be called directly.
   * @protected
   * @param {module:@lumjs/events.Listener} listener 
   * @param {object} target 
   * @param {(string|Symbol)} type 
   * @param {Array} args 
   * @param {object} status
   */
  constructor(listener, target, type, args, status)
  {
    const reg = listener.registry;
    const etd = this.typeData = reg.typeDataFor.get(type);
    this.eventListener = listener;
    this.args = args;
    this.target = target;
    this.type = type;
    this.name = (typeof type === SY) ? (type.description ?? '‽') : type;
    this.emitStatus = status;
    this.options = Object.assign({},
      reg.options,
      etd?.options,
      listener.options,
      status.options);

    this.data = null;
    this.prevEvent = null;
    this.origEvent = this;

    if (isObj(args[0]))
    { // The first argument is an object.
      const ao = args[0];
      if (ao instanceof LumEvent)
      { // A previous event.
        this.prevEvent = ao;
        this.origEvent = ao.origEvent;
        this.data      = ao.data;
        args.shift(); // Remove the event argument.
        
      }
      else
      { // Use it as a data object.
        this.data = ao;
      }
    }

    if (typeof this.options.setupEvent === F)
    {
      this.options.setupEvent.call(listener, this);
    }

  }
}

module.exports = LumEvent;
