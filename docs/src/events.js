/**
 * Get a set of target objects dynamically.
 * @callback module:@lumjs/events~GetTargets
 * @this module:@lumjs/events.Registry
 * @param {module:@lumjs/events.Status} [status]
 * This will be a Status object if the callback was called from `emit()`.
 * If it was called from the Registry constructor, this will undefined.
 * @returns {Set|Array|Iterable} Target objects; `Set` is the preferred
 * return value, with `Array` as second choice.
 * 
 * Technically any kind of iterable object will work, but some functionality
 * will be limited or unavailable if it's not a `Set` or `Array`.
 */

/**
 * The specified handler used by an event Listener.
 * @typedef {(module:@lumjs/events~HandlerFn|module:@lumjs/events~HandlerObj)} module:@lumjs/events~Handler
 */

/**
 * An event handler callback function.
 * 
 * The value of `this` depends on the context:
 * - If the callback is the *handler*, `this` will be `event.target`
 * - If the callback is a `handleEvent()` method, `this` will be the
 *   {@link module:@lumjs/events~HandlerObj} object.
 * 
 * All assuming of course that the callback is not a closure or bound.
 *
 * @callback module:@lumjs/events~HandlerFn
 * @param {module:@lumjs/events.Event} event - The emitted event
 * @returns {void}
 */

/**
 * An event handler object instance
 * @typedef {object} module:@lumjs/events~HandlerObj
 * @prop {module:@lumjs/events~HandlerFn} handleEvent - Handler method
 */

/**
 * Callback when unregistering a target
 * @callback module:@lumjs/events~UnregisterFn
 * @this module:@lumjs/events.Registry
 * @param {object} target - The target object being unregistered
 * @param {object} pmap - TODO: document schema
 * @param {module:@lumjs/events.Registry} `this`
 * @returns {void} 
 */

/**
 * Setup function for Event objects
 * @callback module:@lumjs/events~SetupEvent
 * @this module:@lumjs/events.Listener
 * @param {module:@lumjs/events.Event}
 * @returns {void}
 */

/**
 * Setup function for Listener instances
 * @callback module:@lumjs/events~SetupListener
 * @this module:@lumjs/events.Registry
 * @param {module:@lumjs/events.Listener}
 * @returns {void}
 */
