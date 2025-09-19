'use strict';

const Internal = require('./internal');

const RES_PROPS = 
[
  'args', 'emitted', 'eventNames', 'eventTypes', 'multiMatch',
  'onceRemoved', 'process', 'targetListeners',
];

/**
 * Emit process status info
 * @alias module:@lumjs/events.Status
 * @prop {Array} args - Arguments passed to emit().
 * @prop {Set.<string>} eventTypes - Event types being emitted
 * @prop {Set.<string>} eventNames - Alias of `eventTypes`
 * @prop {Set.<object>} targets - From registry.getTargets()
 * @prop {bool} multiMatch - `registry.options.multiMatch`
 * @prop {Set} onceRemoved - Any `Listener` that had the `once` rule set;
 * will be removed from this registry at the end of the emit process.
 * @prop {module:@lumjs/events.Event[]} emitted - Emitted events;
 * added after each new Event is emitted from the Listener.
 * @prop {Set.<module:@lumjs/events.Listener>} [targetListeners]
 * A set of Listener instances that have already been seen for the
 * current target.
 * 
 * This property only exists in the status object as it's being used
 * to emit Event objects (so is available to handler callbacks), 
 * but NOT in the final status object returned by emit().
 * 
 * It's also NOT used when adding new listeners to stateful events.
 * 
 * @prop {object} process - Special processing instructions.
 * 
 * @prop {boolean} process.doneType - If set to true, no more
 * listeners for the current type on the current target will be
 * processed, and emit() will move on to the next type in the
 * current target (after resetting this to `false`).
 * 
 * Has no effect when adding new listeners to stateful events.
 * 
 * @prop {boolean} process.doneTarget - If set to true, no more
 * listeners for the current target will be processed, and emit()
 * will move on to the next target (resetting this to `false`).
 * 
 * @prop {boolean} process.doneEmitting - If set to true, emit() will
 * stop processing all further listeners regardless of target or type.
 * 
 * The usefulness of this one is questionable at best. I'd avoid it.
 * Unlike the other two, this will remain `true` when the emit() process
 * finishes. It will be reset to `false` if a new listener is added to
 * a stateful event type.
 * 
 * This replaces the older `stopEmitting` Status property entirely.
 * 
 * @prop {module:@lumjs/events.Registry} registry 
 */
class LumEventStatus extends Internal
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
    super();
    
    this.eventNames = this.eventTypes = reg.getEventTypes(ets);

    this.args         = args;
    this.registry     = reg;
    this.multiMatch   = reg.options.multiMatch;
    this.onceRemoved  = new Set();
    this.emitted      = [];

    this.process =
    {
      doneType:     false,
      doneTarget:   false,
      doneEmitting: false,
    }
  }

  /**
   * Get event type data.
   * @param {(string|symbol)} [type] Event type to get get data for.
   * 
   * If this is specified, then we will return the TypeData object
   * associated with that type, or undefined if there isn't any data.
   * 
   * If this is omitted, then the return value will be a Map where
   * each key is one of the `this.eventTypes`, and the value is the
   * TypeData object associated with that type. Only types with
   * associated data will be included in the Map.
   * 
   * @returns {(Map|module:@lumjs/events.TypeData|undefined)}
   */
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

  static get reservedProps()
  {
    return RES_PROPS;
  }
}

module.exports = LumEventStatus;
