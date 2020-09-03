const context = `
function context(...args) {
  const miro = {
    _widgets: $WIDGETS,
    _changes: [],
    animation: {
      _ticks: [],
      tick: function (handler) {
        this._ticks.push(handler.name)
      }
    }
  }

  miro.createWidget = function(shape) {
    const id = Math.random().toString().slice(2);
    miro._widgets[id] = { id, shape, };
    miro._changes.push({ type: 'new', id });

    return miro._widgets[id];
  }

  miro.editWidget = function(id, shape) {
    if (miro._widgets[id]) {
      miro._widgets[id] = { id, shape, }
      miro._changes.push({ type: 'edit', id });
    }
  }

  miro.removeWidget = function(id) {
    if (miro._widgets[id]) {
      delete miro._widgets[id]
      miro._changes.push({ type: 'delete', id });
    }
  }

  miro.getWidgets = function() {
    return Object.values(this._widgets);
  }

  $CALLEE;

  const result = $CALL_HANDLER(...args);

  return {
    miro,
    result,
  }
}

context($CALL_ARGS);
`