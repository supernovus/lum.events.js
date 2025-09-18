'use strict';

/**
 * Emit process status info
 * @alias module:@lumjs/events.Status
 * @prop {Set.<string>} eventTypes - Event types being emitted
 * @prop {Set.<string>} eventNames - Alias of `eventTypes`
 * @prop {Set.<object>} targets - From registry.getTargets()
 * @prop {Array} args - Arguments passed to emit().
 * @prop {bool} multiMatch - `registry.options.multiMatch`
 * @prop {Set} onceRemoved - Any `Listener` that had the `once` rule set;
 * will be removed from this registry at the end of the emit process.
 * @prop {bool} stopEmitting - If an event changes this to `true`,
 * the emit process will end with no further events being emitted.
 * @prop {module:@lumjs/events.Event[]} emitted - Emitted events;
 * added after each new Event is emitted from the Listener.
 * @prop {Set.<module:@lumjs/events.Listener>} [targetListeners]
 * A set of Listener instances that have already been seen for the
 * current target. This property only exists in the status object as
 * it's being used to emit Event objects (so is available to handler
 * callbacks), but NOT in the final status object returned by emit().
 * @prop {(undefined|module:@lumjs/events.Status)} prevEmit
 * The previous emit Status object. Only used on stateful event types.
 * This property will be removed from a Status object when it is
 * assigned as the `prevEmit` property on a new Status object.
 * @prop {module:@lumjs/events.Registry} registry 
 */
class LumEventStatus
{
  /**
   * Internal constructor
   * @private
   * @param {module:@lumjs/events.Registry} reg - Registry
   * @param {mixed} ets - Event type(s)
   * @param {array} args - Arguments passed to emit()
   */
  constructor(reg, ets, args)
  {
    this.eventNames = this.eventTypes = reg.getEventTypes(ets);

    this.registry     = reg;
    this.multiMatch   = reg.options.multiMatch;
    this.onceRemoved  = new Set();
    this.stopEmitting = false;
    this.emitted      = [];

    if (args.length === 1 && args[0] instanceof LumEventStatus)
    {
      this.args = args[0].args;
      this.prevEmit = args[0];
    }
    else
    {
      this.args = args;
    }
  }

  getEventData(type)
  {
    let reg = this.registry;
    
    if (!type)
    { // Get data for all types.
      let data = new Map();
      for (let et of this.eventTypes)
      {
        if (reg.typeDataFor.has(et))
        {
          data.set(et, reg.typeDataFor.get(et));
        }
      }
      return data;
    }

    return reg.typeDataFor.get(et);
  }

}

module.exports = LumEventStatus;
