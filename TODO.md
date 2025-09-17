# TODO

- Add support for _stateful_ events.
  - Two subtypes: _one-time_, and _repeatable_.
  - The first time the event is emitted it acts like a regular
    event and dispatches any event handlers already attached.
    It then saves the event data object in a _state registry_.
    - If the event is _one-time_, the existing handlers
      will be removed (as if they'd been added via _once_).
  - After an event has a _state_ registered, any calls to
    `on()` will call the method immediately using the saved
    state event data.
    - If the event is _repeatable_, the handlers passed to on()
      will be saved so they'll be triggered on future emits.
