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
  let widgetsString = JSON.stringify(widgets);
  const callArguments = [];

  const processWidgets = (newWidgets, changes) => {
    const result = widgets || JSON.parse(widgetsString);
    changes.forEach((change) => {
      switch (change.type) {
        case "edit":
        case "new": {
          // TODO: check id for collision
          result[change.id] = newWidgets[change.id];
          break;
        }
        case "delete": {
          delete result[change.id];
          break;
        }
        default:
      }
    });

    return result;
  };

  let mainReturn;

  const evalCode = () => {
    try {
      const vm = quickJS.createVm();

      const codeToEval = code
        .replace("$WIDGETS", widgetsString)
        .replace("$CALL_HANDLER", callHandler)
        .replace("$CALL_ARGS", callArguments.join(","));

      const evalResult = vm.evalCode(codeToEval);

      if (evalResult.error) {
        const error = vm.dump(evalResult.error);
        evalResult.error.dispose();
        throw error;
      } else {
        const result = vm.dump(evalResult.value);

        evalResult.value.dispose();

        mainReturn = result.result || mainReturn;

        const { _widgets, _changes, animation } = result.miro;
        widgets = processWidgets(_widgets, _changes);
        widgetsString = JSON.stringify(widgets);

        const hasAnimation = !!animation._ticks.length;
        if (hasAnimation) {
          console.log("AN", mainReturn);
          callHandler = animation._ticks[0];
          requestAnimationFrame(() => {
            evalCode();
          });
        } else {
          console.log("FINISHED", mainReturn);
          playButton.disabled = false;
        }

        draw(widgets);
      }

      vm.dispose();
    } catch (e) {
      console.log("Interpreter failure", e);
    }
  };

  evalCode();
};
