"use strict";

const core = require('@lumjs/core');
const {B,N,S,F,SY,isObj,isIterable} = core.types;
const {df} = core.obj;
const Listener = require('./listener');
const RegSym = Symbol('@lumjs/events:registry');
const cp = Object.assign;

const DEF_EXTENDS =
{
  registry: 'events',
  listen:   'on',
  emit:     'emit',
  remove:   null,
  once:     null,
}

const INT_EXTENDS =
{
  listeners: true,
  results:   true,
  onDemand:  false,
}

const DEF_OPTIONS =
{
  delimiter: /\s+/,
  multiMatch: false,
  wildcard: '*',
}

const RES_PROPS =
[
  'eventNames', 'eventTypes', 'targets', 'multiMatch', 'onceRemoved', 
  'stopEmitting', 'emitted', 'targetListeners', 'registry',
]

/**
 * Has a target object been registered with an event registry?
 * @param {object} target 
 * @returns {boolean}
 * @alias module:@lumjs/events.Registry.isRegistered
 */
const isRegistered = target => isObj(target[RegSym]);

/**
 * Get event registry metadata from a target
 * @private
 * @param {object} target - Object to get metadata for
 * @param {boolean} [create=false] Create metadata if it's not found?
 * @returns {(object|undefined)} metadata (TODO: schema docs)
 * @alias module:@lumjs/events.Registry.getMetadata
 */
function getMetadata(target, create=false)
{
  if (isRegistered(target))
  { // Existing registry metadata found
    return target[RegSym];
  }
  else if (create)
  { // Create new metadata
    const exts = Object.keys(DEF_EXTENDS);
    const tpm = 
    {
      r: new Map(),
      p: {},
      x: {},
    }
    for (const ext of exts)
    {
      tpm.x[ext] = [];
    }
    df(target, RegSym, tpm);
    return tpm;
  }
}

function targetsAre(targets)
{
  const isaSet = (targets instanceof Set);
  const isaArr = (!isaSet && Array.isArray(targets));
  const tis =
  {
    set: isaSet,
    array: isaArr,
    handled: (isaSet || isaArr),
  }
  return tis;
}

// Internal class
class LumEventData
{
  constructor(type)
  {
    this.type      = type;
    this.oneTime   = false;
    this.keepState = 0;
  }

  get stateful()
  {
    return this.keepState > 0;
  }
}

/**
 * A class that handles events for target objects
 * 
 * @prop {module:@lumjs/events~GetTargets} getTargets 
 * A constructor-assigned callback method that returns a set of targets.
 * @prop {object} options - Registry-level options
 * @prop {Set.<module:@lumjs/events.Listener>} allListeners
 * All registered event listeners
 * @prop {Map.<(string|symbol),Set.<module:@lumjs/events.Listener>>} listenersFor
 * Each key is a single event name, and the value is a Set of
 * listener objects that handle that event.
 * @prop {Map.<(string|symbol),module:@lumjs/events~EventData>} eventData
 * 
 * @alias module:@lumjs/events.Registry
 */
class LumEventRegistry
{
  /**
   * Create a new registry instance for one or more target objects
   * 
   * @param {(object|module:@lumjs/events~GetTargets)} targets
   * 
   * If this is an `object`, then any kind of `Iterable` may be used
   * to represent multiple targets, while any non-Iterable object will
   * be considered as single target. 
   * 
   * If this is a `function`, it will be called to dynamically get a
   * list of target objects whenever an event is triggered.
   * 
   * If you want to use a `function` as an actual target, you'll need to
   * wrap it in an array or other iterable object.
   * 
   * @param {object} [opts] Options
   * 
   * A _compiled_ version is saved to the `options` property.
   * The compiled version includes a bunch of defaults, and various
   * compose rules (mostly for the `.extend` nested options).
   * 
   * @param {(RegExp|string)} [opts.delimiter=/\s+/] Used to split event names
   * 
   * @param {object} [opts.extend] Options for wrapper methods/properties
   * 
   * The `boolean` options determine if extension methods will be added to
   * certain types of objects (and in some cases, when to do so).
   * 
   * The `?string` options are each the names of properties/methods in the
   * Registry class. If they are set to a `string` then that will be the
   * name used for the wrapper property/method added to objects. If it
   * is explicitly set to `null` it means skip adding a wrapper for that
   * method/property. If it is omitted entirely the default will be used.
   * 
   * @param {boolean} [opts.extend.targets] Extend target objects?
   * 
   * The default will be `true` when `targets` is an `object`, or `false`
   * when `targets` is a `function`.
   * 
   * @param {boolean} [opts.extend.listeners=true] Extend Listener instances?
   * As returned by `makeListener()`, `listen()`, and `once()`
   * @param {boolean} [opts.extend.results=true] Extend `emit()` results?
   * @param {boolean} [opts.extend.onDemand=false] On-demand target setup
   * 
   * If `targets` was a `function` and this is set to `true`, then
   * we'll perform the target setup on every emit() call. The setup process
   * is skipped on any targets that have already been set up, so this
   * is meant for dynamic targets that may change on every call.
   * 
   * @param {?string} [opts.extend.registry="events"] Registry property;
   * only added to `targets`, never to listeners or results which have
   * their own inherent `registry` property already.
   * 
   * @param {?string} [opts.extend.emit="emit"] `emit()` proxy method
   * @param {?string} [opts.extend.listen="on"] `listen()` proxy method
   * @param {?string} [opts.extend.once=null]   `once()` proxy method
   * @param {?string} [opts.extend.remove=null] `remove()` proxy method
   * 
   * The `remove` wrapper method added to Listener instances is slightly
   * different than the one added to other objects, as if you call it
   * with no arguments, it will pass the Listener itself as the argument.
   * 
   * @param {boolean} [opts.multiMatch=false]
   * If a registered listener has multiple event names, and a call
   * to `emit()` also has multiple event names, the value of this
   * option will determine if the same listener will have its
   * handler function called more than once.
   * 
   * If this is `true`, the handler will be called once for every
   * combination of target and event name.
   * 
   * If this is `false` (default), then only the first matching event 
   * name will be called for each target.
   *
   * @param {boolean} [opts.overwrite=false] Overwrite existing properties?
   * 
   * If `true` then when adding wrapper methods, the properties from
   * `opts.extend` will replace any existing ones in each target.
   * 
   * @param {module:@lumjs/events~SetupEvent} [opts.setupEvent]
   * 
   * If this is specified (either here or in individual listeners),
   * it will be called and passed the Event object at the very end of
   * its constructor.
   * 
   * @param {module:@lumjs/events~SetupListener} [opts.setupListener]
   * 
   * If this is specified, it will be called and passed the Listener
   * object at the very end of its constructor.
   * 
   * @param {string} [opts.wildcard='*'] Wildcard event name.
   * 
   * - If you use this in `listen()` the handler will be used regardless
   *   as to what event name was triggered. You can always see which
   *   event name was actually triggered by using `event.name`.
   * - If you use this in `remove()` it calls `removeAll()` to remove all
   *   registered listeners.
   */
  constructor(targets, opts={})
  {
    let defExt; // Default opts.extend.targets value
    if (typeof targets === F)
    { // A dynamic getter method
      this.funTargets = true;
      this.getTargets = targets;
      targets = this.getTargets();
      defExt = false;
    }
    else
    { // Simple getter for a static value
      if (!(targets instanceof Set))
      {
        if (!isIterable(targets))
          targets = [targets];
        targets = new Set(targets);
      }

      this.funTargets = false;
      this.getTargets = () => targets;
      defExt = true;
    }

    // Build composite extend rules
    const extend = cp(
      {targets: defExt}, 
      INT_EXTENDS, 
      DEF_EXTENDS, 
      opts.extend);

    // Now compile the final options
    this.options = cp({}, DEF_OPTIONS, opts, {extend});

    this.allListeners = new Set();
    this.listenersFor = new Map();
    this.eventData    = new Map();

    this.setupTargets(targets);
  } // constructor()

  /**
   * Set up target objects
   * 
   * Always sets the necessary metadata on each target.
   * May also extend the targets with wrapper properties and methods
   * depending on the `options.extend` values set.
   * 
   * Not meant to be called from outside code.
   * @private
   * @param  {Iterable} targets - Targets to extend
   * @returns {module:@lumjs/events.Registry} `this`
   */
  setupTargets(targets)
  {
    const opts = this.options;
    const extOpts = opts.extend;
    const intNames = extOpts.targets ? Object.keys(DEF_EXTENDS) : null;

    for (const target of targets)
    {
      const tps = {}, tpm = getMetadata(target, true);
      if (tpm.r.has(this)) continue; // Already set up with this registry.
      tpm.r.set(this, tps);

      if (extOpts.targets)
      {
        for (const iname of intNames)
        {
          if ((typeof extOpts[iname] === S && extOpts[iname].trim() !== '')
            || typeof extOpts[iname] === SY)
          {
            const ename = extOpts[iname];
            const value = iname === 'registry' 
              ? this // The registry instance itself
              : (...args) => this[iname](...args) // A proxy method
            if (opts.overwrite || target[ename] === undefined)
            {
              df(target, ename, {value});
              tps[ename] = iname;
              tpm.p[ename] = this;
              tpm.x[iname].push([this, ename]);
            }
            else
            {
              console.error("Won't overwrite existing property",
                {target,iname,ename,registry: this});
            }
          }
        }
      }
    }

    return this;
  }

  /**
   * Add extension methods to internal objects;
   * currently supports Listener instances and result/status objects.
   * Not meant to be called from outside code.
   * @private
   * @param {object} obj - Internal object to extend
   * @returns {module:@lumjs/events.Registry} `this`
   */
  extendInternal(obj)
  {
    const opts = this.options;
    const extOpts = opts.extend;
    const intNames = Object.keys(DEF_EXTENDS);
    const isLs = (obj instanceof Listener);
    const reserved = isLs ? Listener.classProps : RES_PROPS;

    for (const iname of intNames)
    {
      if (iname === 'registry') continue; // skip the registry property
      if ((typeof extOpts[iname] === S && extOpts[iname].trim() !== '')
        || typeof extOpts[iname] === SY)
      {
        const ename = extOpts[iname];
        if (reserved.includes(ename))
        { // Skip reserved names
          console.warn("reserved property", {ename, obj, registry: this});
          continue;
        }

        const value = (isLs && iname === 'remove') 
          ? (what=obj) => this.remove(what)   // special remove wrapper
          : (...args) => this[iname](...args) // regular wrapper method
        if (opts.overwrite || obj[ename] === undefined)
        {
          df(obj, ename, {value});
        }
      }  
    }

    return this;
  }

  /**
   * Build a new Listener instance; used by `listen()` method.
   * 
   * @param  {(string|symbol|object)} eventTypes 
   * What this does depends on the type, and the number of arguments passed.
   * 
   * If this is an `object` **AND** is *the only argument* passed,
   * it will be used as the `spec`, and the `spec.eventTypes`
   * and `spec.listener` properties will become mandatory.
   * 
   * If it's NOT an object *OR* there is more than one argument, this
   * will be used as the `spec.eventTypes` property.
   * 
   * @param {module:@lumjs/events~Handler} [handler] 
   * Used as the `spec.handler` property if specified.
   * 
   * This is mandatory if `eventTypes` argument is a string or Symbol!
   * 
   * @param {object} [spec] The listener specification rules
   * 
   * @param {(string|symbol|Iterable)} [spec.eventTypes] Event type(s)
   * 
   * See {@link module:@lumjs/events.Registry#getEventTypes} for details.
   * 
   * @param {(string|symbol|Iterable)} [spec.eventNames] Alias of `eventTypes`
   * 
   * @param {module:@lumjs/events~Handler} [spec.handler] Event handler
   * 
   * @param {module:@lumjs/events~Handler} [spec.listener] An alias for `handler`
   * 
   * @param {object} [spec.options] Options for the listener
   * 
   * The option properties can be included directly in the `spec` itself
   * for brevity, but a nested `options` object is supported to be more
   * like the `DOM.addEventListener()` method. Either way works fine.
   * 
   * If `spec.options` is used, the properties in it take precedence over
   * those directly in the `spec` object. Note that you cannot use the
   * names `listener`, `handler`, `eventTypes`, or `eventNames` as option 
   * properties, and if found, they will be removed.
   * 
   * You may also override the `setupEvent` and `setupListener` registry
   * options here if needed.
   * 
   * @param {boolean} [spec.options.once=false] Only use the listener once?
   * 
   * If this is set to `true`, then the first time this listener is used in
   * an {@link module:@lumjs/events.Registry#emit emit()} call, it will
   * be removed from the registry at the end of the emit process (after all
   * events for all targets have been triggered).
   * 
   * @returns {module:@lumjs/events.Listener} A new `Listener` instance
   */
  makeListener(...args)
  {
    let spec;

    if (args.length === 0 || args.length > 3)
    { 
      console.error({args, registry: this});
      throw new RangeError("Invalid number of arguments");
    }
    else if (args.length === 1 && isObj(args[0]))
    { // listen(spec)
      spec = cp({}, args[0]);
    }
    else
    { // listen(eventTypes, listener, [spec])
      spec = cp({}, args[2]);
      spec.eventTypes = args[0];
      spec.handler    = args[1];
    }

    const lsnr = new Listener(this, spec);
    if (this.options.extend.listeners)
    {
      this.extendInternal(lsnr);
    }
    return lsnr;
  }

  /**
   * Assign a new event listener.
   * 
   * Calls `this.makeListener()` passing all arguments to it.
   * Then calls `this.add(listener)` passing the newly make `Listener`.
   * 
   * @param {...mixed} args
   * @returns {module:@lumjs/events.Listener}
   */
  listen()
  {
    const listener = this.makeListener(...arguments)
    this.add(listener);
    return listener;
  }

  /**
   * Assign a new event listener that will only run once.
   * 
   * Calls `this.listen()` passing all arguments to it,
   * then sets the `listener.options.once` to `true`.
   * 
   * @param {...mixed} args
   * @returns {module:@lumjs/events.Listener}
   */
  once()
  {
    const listener = this.listen(...arguments);
    listener.options.once = true;
    return listener;
  }

  /**
   * Add a Listener instance.
   * 
   * You'd generally use `listen()` or `once()` rather than this, but if
   * you need to (re-)add an existing instance, this is the way to do it.
   * 
   * @param {module:@lumjs/events.Listener} listener - Listener instance
   * 
   * If the same instance is passed more than once it will have no affect,
   * as we store the instances in a `Set` internally, so it'll only ever
   * be stored once.
   * 
   * @returns {module:@lumjs/events.Registry} `this`
   */
  add(listener)
  {
    if (!(listener instanceof Listener))
    {
      console.error({listener, registry: this});
      throw new TypeError("Invalid listener instance");
    }

    this.allListeners.add(listener);

    for (const et of listener.eventTypes)
    {
      let lset;
      if (this.listenersFor.has(et))
      {
        lset = this.listenersFor.get(et);
      }
      else
      {
        lset = new Set();
        this.listenersFor.set(et, lset);
      }

      lset.add(listener);
    }
    
    return this;
  }

  /**
   * Remove **ALL** registered event listeners!
   * @returns {module:@lumjs/events.Registry} `this`
   */
  removeAll()
  {
    this.allListeners.clear();
    this.listenersFor.clear();
    return this;
  }

  /**
   * Remove specific event types.
   * 
   * It will remove any of the the specified event names
   * from applicable listener instances, and clear the
   * associated `listenersFor` set.
   * 
   * If a listener has no more event names left, that listener
   * will be removed from the `allListeners` set as well.
   * 
   * @param  {...(string|symbol)} types - Event names to remove
   * 
   * If the `wildcard` string is specified here, this will simply
   * remove any wildcard listeners currently registered.
   * See `remove(wildcard)` or `removeAll()` if you really want
   * to remove **ALL** listeners.
   * 
   * @returns {module:@lumjs/events.Registry} `this`
   */
  removeEvents(...types)
  {
    for (const et of types)
    {
      if (this.listenersFor.has(et))
      {
        const eventListeners = this.listenersFor.get(et);
        for (const lsnr of eventListeners)
        {
          lsnr.eventTypes.delete(et);
          if (!lsnr.hasEvents)
          { // The last event name was removed.
            this.removeListeners(lsnr);
          }
        }
        eventListeners.clear();
      }
    }
    return this;
  }

  /**
   * Remove specific Listener instances
   * @param {...module:@lumjs/events.Listener} listeners 
   * @returns {module:@lumjs/events.Registry} `this`
   */
  removeListeners(...listeners)
  {
    for (const listener of listeners)
    {
      if (this.allListeners.has(listener))
      { // First remove it from allListeners
        this.allListeners.delete(listener);
  
        for (const ename of listener.eventTypes)
        {
          if (this.listenersFor.has(ename))
          {
            const lset = this.listenersFor.get(ename);
            lset.delete(listener);
          }
        }
      }
    }
    return this;
  }

  /**
   * Remove listeners based on the value type used.
   * 
   * @param {(string|module:@lumjs/events.Listener)} what
   * 
   * - If this is the `wildcard` string, then this will call `removeAll()`.
   * - If this is any other `string` it will be split using `splitNames()`,
   *   and the resulting strings passed as arguments to `removeEvents()`.
   * - If this is a `Symbol` it will be passed to `removeEvents()`.
   * - If this is a `Listener` instance, its passed to `removeListeners()`.
   * 
   * @returns {module:@lumjs/events.Registry} `this`
   * @throws {TypeError} If `what` is none of the above values.
   */
  remove(what)
  {
    if (what === this.options.wildcard)
    {
      return this.removeAll();
    }
    else if (typeof what === S)
    { 
      const events = this.splitNames(what);
      return this.removeEvents(...events);
    }
    else if (typeof what === SY)
    {
      return this.removeEvents(what);
    }
    else if (what instanceof Listener)
    {
      return this.removeListeners(what);
    }
    else
    {
      console.error({what, registry: this});
      throw new TypeError("Invalid event name or listener instance");
    }
  }

  /**
   * Emit (trigger) one or more events.
   * 
   * @param {(string|symbol|Array)} eventTypes - Events to emit;
   * see {@link module:@lumjs/events#getEventTypes} for details.
   * 
   * @param  {object} [data] A data object (highly recommended);
   * will be assigned to `event.data` if specified.
   * 
   * @param  {...any} [args] Any other arguments;
   * will be assigned to `event.args`.
   * 
   * Note: if a `data` object argument was passed, it will always 
   * be the first item in `event.args`.
   * 
   * @returns {module:@lumjs/events~Status}
   */
  emit(eventTypes, ...args)
  {
    const extOpts = this.options.extend;
    const sti =
    {
      eventTypes: this.getEventTypes(eventTypes),
      multiMatch: this.options.multiMatch,
      onceRemoved: new Set(),
      stopEmitting: false,
      emitted: [],
      registry: this,
    }
    sti.eventNames = sti.eventTypes;

    if (extOpts.results)
    {
      this.extendInternal(sti);
    }

    { // Get the targets.
      const tgs = this.getTargets(sti);
      sti.targets = (tgs instanceof Set) ? tgs : new Set(tgs);
      if (this.funTargets && extOpts.onDemand)
      {
        this.setupTargets(sti.targets);
      }
    }

    const wilds = this.listenersFor.get(this.options.wildcard);

    emitting: for (const tg of sti.targets)
    {
      const called = sti.targetListeners = new Set();
      for (const ename of sti.eventTypes)
      {
        if (!this.listenersFor.has(ename)) continue;

        let listeners = this.listenersFor.get(ename);
        if (wilds) listeners = listeners.union(wilds);

        for (const lsnr of listeners)
        {
          if (sti.multiMatch || !called.has(lsnr))
          { // Let's emit an event!
            called.add(lsnr);
            const event = lsnr.emitEvent(ename, tg, args, sti);
            sti.emitted.push(event);
            if (sti.stopEmitting)
            {
              break emitting;
            }
          }
        }
      }
    }

    // Nix the targetListeners property.
    delete sti.targetListeners;

    // Handle any `onceRemoved` listeners.
    for (const lsnr of sti.onceRemoved)
    {
      this.removeListeners(lsnr);
    }

    // Return the final status.
    return sti;
  }

  /**
   * Set advanced options for an event type.
   * 
   * See {@link module:@lumjs/events~EventData} for details on both
   * the `oneTime` and `keepState` options.
   * 
   * @param {(string|symbol)} type - Event type to set options for.
   * @param {object} opts - Options to set.
   * @param {boolean} [opts.oneTime=false] Make this a one-time event?
   * @param {number} [opts.keepState=0] Make this a stateful event?
   * @param {boolean} [opts.stateful] A shortcut for stateful events.
   * 
   * If this is true, `opts.keepState` will be set to `10`.
   * If this is false, `opts.keepState` will be set to `0`.
   * If this is omitted, it does nothing.
   * 
   * @returns {module:@lumjs/events.Registry} `this`
   */
  set(type, opts={})
  {
    /** LumEventData */
    let data;
    
    if (this.eventData.has(type))
    {
      data = this.eventData.get(type);
    }
    else
    {
      data = new LumEventData(type);
      this.eventData.set(type, data);
    }

    if (typeof opts.oneTime === B)
    {
      data.oneTime = opts.oneTime;
    }

    if (typeof opts.keepState === N)
    {
      data.keepState = opts.keepState;
    }
    else if (opts.stateful === true)
    {
      data.keepState = 10;
    }
    else if (opts.stateful === false)
    {
      data.keepState = 0;
    }

    if (data.stateful && !data.stateData)
    {
      data.stateData = [];
    }
    else if (data.stateData && !data.stateful)
    {
      delete data.stateData;
    }

    return this;
  }

  /**
   * Register additional target objects
   * @param  {...object} addTargets - Target objects to register
   * @returns {module:@lumjs/events.Registry} `this`
   */
  register(...addTargets)
  {
    const allTargets = this.getTargets();
    const tis = targetsAre(allTargets);

    if (tis.handled)
    {
      for (const target of addTargets)
      {
        if (tis.set)
        {
          allTargets.add(target);
        }
        else if (tis.array)
        {
          if (allTargets.indexOf(target) === -1)
          {
            allTargets.push(target);
          }
        }
      }
    }
    else
    {
      if (!tis.handled)
      {
        console.warn("cannot add targets to collection", 
          {addTargets, allTargets, registry: this});
      }
    }

    this.setupTargets(addTargets);
    return this;
  }

  /**
   * Remove a target object from the registry.
   * 
   * This will also remove any extension properties added to the
   * target object by this registry instance.
   * 
   * @param  {...object} [delTargets] Targets to unregister
   * 
   * If no targets are specified, this will unregister **ALL** targets
   * from this registry!
   * 
   * @returns {module:@lumjs/events.Registry} `this`
   */
  unregister(...delTargets)
  {
    const allTargets = this.getTargets();
    const tis = targetsAre(allTargets);

    if (delTargets.length === 0)
    { // Unregister ALL targets.
      delTargets = allTargets;
    }

    if (!tis.handled)
    {
      console.warn("cannot remove targets from collection", 
        {delTargets, allTargets, registry: this});
    }

    for (const target of delTargets)
    {
      if (!isRegistered(target)) continue;

      const tpm = target[RegSym];
      const tp  = tpm.r.get(this);

      if (tis.set)
      {
        allTargets.delete(target);
      }
      else if (tis.array)
      {
        const tin = allTargets.indexOf(target);
        if (tin !== -1)
        {
          allTargets.splice(tin, 1);
        }
      }
      
      if (isObj(tp))
      { // Remove any added extension properties
        for (const ep in tp)
        {
          if (tpm.p[ep] === this)
          { // Remove it from the target.
            delete target[ep];
            delete tpm.p[ep];
          }
        }
        tpm.r.delete(this);
      }

      if (tpm.r.size === 0)
      { // No registries left, remove the metadata too
        delete target[RegSym];
      }
    }

    return this;
  }

  /**
   * Get a Set of event types/names from various kinds of values
   * @param {(string|symbol|Iterable)} types - Event types source
   * 
   * If this is a string, it'll be passed to `splitNames()`.
   * If it's a Symbol, it'll be wrapped in a Set.
   * If it's any kind of Iterable value, it'll be converted to a Set.
   * 
   * @returns {Set}
   * @throws {TypeError} If `names` is not a valid value
   */
  getEventTypes(types)
  {
    if (typeof types === S)
    {
      return this.splitNames(types);
    }
    else if (typeof types === SY)
    {
      return new Set([types]);
    }
    else if (types instanceof Set)
    {
      return types;
    }
    else if (isIterable(types))
    {
      return new Set(types);
    }
    else
    {
      console.error({names: types, registry: this});
      throw new TypeError("Invalid event names");
    }
  }

  /**
   * Split a (trimmed) string using `this.options.delimiter`
   * @param {string} names - String to split
   * @returns {Set}
   */
  splitNames(names)
  {
    return new Set(names.trim().split(this.options.delimiter));
  }

}

const LERP = LumEventRegistry.prototype;
df(LERP, 'getEventNames', LERP.getEventTypes);

cp(LumEventRegistry, 
{ 
  isRegistered, getMetadata, targetsAre,
});

module.exports = LumEventRegistry;

/**
 * An alias to `getEventTypes`
 * @function module:@lumjs/events.Registry#getEventNames
 * @param {(string|symbol|Iterable)} names - Event names source
 * @returns {Set}
 * @see module:@lumjs/events.Registry#getEventTypes
 */
