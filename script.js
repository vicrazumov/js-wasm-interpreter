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

  let widgets = {};

  const vm = quickJS.createVm();
  const miro = vm.newObject();

  const pointers = [];

  // ADD "MIRO" NATIVE API
  vm.setProp(vm.global, 'miro', miro);

  // ADD INTERIOR WIDGET STORAGE AND "getWidgets" - native getWidgets didn't work in the async case as memory pointers were automatically released by the next loop
  vm.evalCode('miro._widgets = {}; miro.getWidgets = () => Object.values(miro._widgets)');

  // ADD "PRINT" NATIVE FUNCTION
  const print = vm.newFunction('log', (...args) => {
    const textArgs = args.map(arg => vm.dump(arg));
    console.log(...textArgs);
  })
  vm.setProp(vm.global, 'print', print);
  print.dispose();

  // ADD "miro.createWidget" native function - creates a widget in the host (see the "widgets" object here) and a copy in the interior
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

      widgets[id] = { id, shape }

      vm.evalCode(`miro._widgets[${id}] = { id: "${id}", shape: ${JSON.stringify(shape)} }`);

      return widgetHandle;
    } else {
      throw new Error('Wrong argument: shape');
    }
  })
  vm.setProp(miro, 'createWidget', createWidget);
  createWidget.dispose();

  // ADD "miro.editWidget" native function - edits a widget in the host (see the "widgets" object here) and a copy in the interior
  const editWidget = vm.newFunction('editWidget', (idHandle, newShapeHandle) => {
    const id = vm.getString(idHandle);
    const newShape = vm.dump(newShapeHandle);
    if (id && widgets[id] && newShape && newShape.x && newShape.y) {
      widgets[id].shape.x = newShape.x;
      widgets[id].shape.y = newShape.y;
      vm.evalCode(`miro._widgets[${id}].shape = ${JSON.stringify(newShape)}`)
    } else {
      throw new Error('Wrong arguments');
    }
  })
  vm.setProp(miro, 'editWidget', editWidget);
  editWidget.dispose();

  // ADD "miro.removeWidget" native function - removes a widget in the host (see the "widgets" object here) and a copy in the interior
  const removeWidget = vm.newFunction('removeWidget', (idHandle) => {
    const id = vm.getString(idHandle);
    if (id && widgets[id]) {
      vm.evalCode(`delete miro._widgets[${id}]`)
      delete widgets[id];
    }
  })
  vm.setProp(miro, 'removeWidget', removeWidget);
  removeWidget.dispose();

  // ADD "animate" async native function - returns a promise, that always resolves. Next loop launched as a part of the "rAF" callback - see vm.executePendingJobs(1)
  const animate = vm.newFunction('animate', () => {
    requestAnimationFrame(() => {
      draw(widgets);
      vm.unwrapResult(vm.executePendingJobs(1));
      if (!vm.hasPendingJob()) {
        playButton.disabled = false;
        console.log('Async FINISHED');
      }
    })

    const result = vm.unwrapResult(
      vm.evalCode(`(new Promise(resolve => resolve()))`)
    )

    return result
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

        if (!vm.hasPendingJob()) {
          playButton.disabled = false;
          console.log('FINISHED', result);
        }

        evalResult.value.dispose();

        draw(widgets);
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
