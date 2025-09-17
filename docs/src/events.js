/**
 * Get a set of target objects dynamically.
 * @callback module:@lumjs/events~GetTargets
 * @this module:@lumjs/events.Registry
 * @param {module:@lumjs/events~Status} [status]
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
 * Emit process status info
 * @typedef {object} module:@lumjs/events~Status
 * @prop {Set.<string>} eventTypes - Event types being triggered
 * @prop {Set.<string>} eventNames - Alias of `eventTypes`
 * @prop {Set.<object>} targets - From `registry.getTargets()`
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
 * callbacks), but NOT in the final status object returned by `emit()`.
 * @prop {module:@lumjs/events.Registry} registry 
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

/**
 * Event metadata and advanced options.
 * @typedef {object} module:@lumjs/events~EventData
 * 
 * @prop {(string|symbol)} type - The event type the data is for.
 * 
 * @prop {boolean} oneTime - A one-time event?
 * 
 * If true, then any event listeners added with this event type/name 
 * will be treated as if they were added with the `once()` method 
 * (or had the `once` option set).
 * 
 * If not explicitly set when registering event options, the default
 * value for this will be the value of the `stateful` getter property.
 * 
 * So by default stateful events are also one-time events.
 * In order to create repeatable stateful events, you MUST explicitly
 * set `oneTime` to false when registering the event options.
 * 
 * @prop {number} keepState - Max data items to save for a stateful event.
 * 
 * If this is `0` or less, the event type will be non-stateful (default).
 * 
 * If this is above `0`, when the event type is emitted, the Event object
 * will be saved in the `stateData` property, and when new handlers are
 * added, they will be emitted immediately using the newest state data.
 * When the `stateData.length` reaches this value, the oldest items will
 * be removed when adding new items.
 * 
 * If not specified when registering event options, the default is `0`.
 * 
 * @prop {boolean} stateful - A getter using `keepState > 0` as its test.
 * 
 * @prop {(module:@lumjs/events~Event[]|undefined)} stateData
 * 
 * When a stateful event is emitted, the Event generated will be added to
 * the top of this array, so the most recent will always be `stateData[0]`.
 * 
 * This property will be undefined for non-stateful events.
 * 
 */
