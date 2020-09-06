let quickJS;
const playButton = document.querySelector("#playButton");

getQuickJS().then((_qjs) => {
  quickJS = _qjs;
  playButton.disabled = false;
});

const canvas = document.getElementById("canvas");

const canvasWidth = window.innerWidth * 0.5;
const canvasHeight = window.innerHeight - 16;

canvas.width = canvasWidth;
canvas.height = canvasHeight;

const ctx = canvas.getContext("2d");
ctx.font = "12px Arial";

const draw = (widgets) => {
  ctx.fillStyle = "white";
  ctx.fillRect(1, 0, canvasWidth - 1, canvasHeight - 1);

  Object.values(widgets).forEach(({ id, shape: { x, y } }) => {
    ctx.fillStyle = "silver";
    ctx.fillRect(x, y, 40, 20);
    ctx.fillText(`widget ${id}`, x, y);
  });
};

const customerCodeContainer = document.querySelector("#code");
customerCodeContainer.value = example;

const play = () => {
  ctx.fillStyle = "white";
  ctx.fillRect(1, 0, canvasWidth - 1, canvasHeight - 1);
  const customerCode = customerCodeContainer.value;

  if (!customerCode) return;

  playButton.disabled = true;
  const code = context.replace("$CALLEE", customerCode);

  let callHandler = "main";
  let widgets = {};
  const callArguments = [];

  const vm = quickJS.createVm();
  const miro = vm.newObject();

  const pointers = [];
  vm.setProp(vm.global, 'miro', miro);

  const createWidget = vm.newFunction('createWidget', (shapeHandle) => {
    const shape = vm.dump(shapeHandle);
    if (shape && shape.x && shape.y) {
      const id = `${Math.random().toString().slice(2)}`;

      const widgetHandle = vm.newObject();

      const idHandle = vm.newString(id);
      vm.setProp(widgetHandle, 'id', idHandle);
      pointers.push(idHandle);

      const newShapeHandle = vm.newObject();
      const xHandler = vm.newNumber(shape.x);
      const yHandler = vm.newNumber(shape.y);
      vm.setProp(newShapeHandle, 'x', xHandler);
      vm.setProp(newShapeHandle, 'y', yHandler);
      xHandler.dispose();
      yHandler.dispose();

      vm.setProp(widgetHandle, 'shape', newShapeHandle);
      pointers.push(newShapeHandle);

      widgets[id] = { id, shape, idHandle, shapeHandle: newShapeHandle }

      console.log('WIDGETS', widgets);
      return widgetHandle;
    } else {
      throw new Error('Wrong argument: shape');
    }
  })
  vm.setProp(miro, 'createWidget', createWidget);
  createWidget.dispose();

  const editWidget = vm.newFunction('editWidget', (idHandle, newShapeHandle) => {
    const id = vm.getString(idHandle);
    const newShape = vm.dump(newShapeHandle);
    if (id && widgets[id] && newShape && newShape.x && newShape.y) {
      const { shapeHandle } = widgets[id];
      widgets[id].shape.x = newShape.x;
      widgets[id].shape.y = newShape.y;
      const xHandler = vm.newNumber(newShape.x);
      const yHandler = vm.newNumber(newShape.y);
      vm.setProp(shapeHandle, 'x', xHandler);
      vm.setProp(shapeHandle, 'y', yHandler);
      xHandler.dispose();
      yHandler.dispose();

      console.log('EDITED', id, widgets[id].shape.x, widgets[id].shape.y);
    } else {
      throw new Error('Wrong arguments');
    }
  })
  vm.setProp(miro, 'editWidget', editWidget);
  editWidget.dispose();

  const removeWidget = vm.newFunction('removeWidget', (idHandle) => {
    const id = vm.getString(idHandle);
    if (id && widgets[id]) {
      const { shapeHandle, idHandle } = widgets[id];
      shapeHandle.dispose();
      idHandle.dispose();
      delete widgets[id];
    }
  })
  vm.setProp(miro, 'removeWidget', removeWidget);
  removeWidget.dispose();

  const getWidgets = vm.newFunction('getWidgets', () => {
    const array = vm.newObject();
    const widgetsArray = Object.values(widgets);

    widgetsArray.forEach(({ idHandle, shapeHandle }, idx) => {
      const widgetHandle = vm.newObject();
      vm.setProp(widgetHandle, 'id', idHandle);
      vm.setProp(widgetHandle, 'shape', shapeHandle);
      vm.setProp(array, idx, widgetHandle);
    })

    return array;
  })
  vm.setProp(miro, 'getWidgets', getWidgets);
  getWidgets.dispose();

  function newDeferredHandle(vm) {
    const deferred = vm.evalCode(`
    result = {};
    result.promise = new Promise((resolve, reject) => {
      result.resolve = resolve
      result.reject = reject
    });
    result;
   `)
    // should always succeed
    return vm.unwrapResult(deferred)
  }

  const animationQueue = [];
  let animationTimeout = null;
  const queueAnimation = (params) => {
    animationQueue.push(params);
    clearTimeout(animationTimeout);
    animationTimeout = setTimeout(runAnimation);
  }

  let lastTimestamp = new Date().getTime();
  const runAnimation = () => {
    const frame = animationQueue.shift();
    if (frame) {
      requestAnimationFrame(() => {
        draw(frame);
        const newTimestamp = new Date().getTime();
        console.log('ANIMATED', newTimestamp - lastTimestamp, Object.values(frame).reduce((acc, next) => { acc.push(next.shape.x); return acc; }, []))
        lastTimestamp = newTimestamp;
        runAnimation();
      })
    }
  }

  const animate = vm.newFunction('animate', (handle) => {
    // const deferredHandle = newDeferredHandle(vm)
    // const dup = handle.dup();

    const widgetsCopy = Object.entries(widgets).reduce((acc, [, { id, shape: { x, y } }]) => {
      acc[id] = {
        id,
        shape: { x, y }
      }

      console.log('rAF', id, x, y)

      return acc;
    }, {});

    queueAnimation(widgetsCopy);

    // return quickjs promise
    // return vm.getProp(deferredHandle, 'promise')
  })
  vm.setProp(vm.global, 'animate', animate);
  // animate.dispose();

  miro.dispose();

  const evalCode = (handler = 'main') => {

    try {
      const codeToEval = `${customerCode}${handler}()`;

      const evalResult = vm.evalCode(codeToEval);

      if (evalResult.error) {
        const error = vm.dump(evalResult.error);
        evalResult.error.dispose();
        throw error;
      } else {
        const result = vm.dump(evalResult.value);

        console.log('FINISHED', result);

        evalResult.value.dispose();

        // draw(widgets);
      }

    } catch (e) {
      console.log("Interpreter failure", e);
      playButton.disabled = false;
    } finally {

    }
  };

  evalCode();
  try {
    pointers.forEach(pointer => pointer.alive && pointer.dispose());
    // vm.dispose();
  }  catch (e) {
    console.log(e)
  }
};
