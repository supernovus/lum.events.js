'use strict';

const {AbstractError} = require('@lumjs/core');

// Base class for internal event classes.
class LumEventInternalClass
{
  // Override this in each class
  static get reservedProps()
  {
    throw new AbstractError('reservedProps');
  }

  static get classProps()
  {
    return [
      ...Object.getOwnPropertyNames(this.prototype),
      ...this.reservedProps,
    ];
  }
}

module.exports = LumEventInternalClass;
