'use strict';

const {needObj} = require('@lumjs/core/types');

/**
 * Event type metadata and advanced options.
 * 
 * @alias module:@lumjs/events.TypeData
 * 
 * @prop {(string|symbol)} type - The event type the data is for (read-only).
 * 
 * @prop {boolean} stateful - Is this a stateful event type?
 * 
 * If this is true, then when the event is emitted, the emit status will
 * be saved in the `state` property, and when new handlers are added,
 * they will be emitted immediately using the arguments from the previous
 * status. 
 * 
 * @prop {(module:@lumjs/events.Status|undefined)} status
 * 
 * When a stateful event is emitted, the emit status object will be
 * saved here, then when new handlers are added to a stateful event type, 
 * they will be emitted immediately, using the saved emit status.
 * 
 * This property will be undefined if the type hasn't been emitted yet.
 * 
 * @prop {object} options - Event options for this type.
 * 
 * Designed for custom options that you may want to set.
 * 
 */
class LumEventTypeData
{
  constructor(type)
  {
    Object.defineProperty(this, 'type', {value: type, enumerable: true});
    this.options  = {};
    this.stateful = false;
  }

  /**
   * Set properties on this type data instance.
   * Used by [Registry.set()]{@link module:@lumjs/events.Registry#set}.
   * @protected
   * @param {object} props - Properties to set.
   * 
   * A few notes:
   * - You cannot set the `type` property using this.
   * - An `options` property will be merged using Object.assign()
   * 
   * @returns {void}
   * @throws {TypeError} If any type validation tests fail.
   */
  set(props)
  {
    const log = {props, typeData: this};
    needObj(props, {log});
    for (let key in props)
    {
      switch(key)
      {
        case 'type':
          console.error("Cannot overwrite 'type'", log);
          break;
        case 'options':
          Object.assign(this.options, props[key]);
          break;
        default:
          this[key] = props[key];
      }
    }
  }
}

module.exports = LumEventTypeData;
