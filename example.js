const example = `
function tick() {
    const [widget] = miro.getWidgets();
    if (widget.shape.x < 100) {
        miro.editWidget(widget.id, { x: widget.shape.x + 1, y: widget.shape.y + 1 });
        animate().then(tick);
    }
}

function main() {
    print('Miro start')

    const widget1 = miro.createWidget({ x: 1, y: 1 });
    const widget2 = miro.createWidget({ x: 2, y: 2 });

    miro.createWidget({ x: 100, y: 20 });
    miro.createWidget({ x: 100, y: 200 });

    miro.editWidget(widget1.id, { x: 3, y: 3 });
    miro.removeWidget(widget2.id);

    tick();

    // open console and witness what is returned
    return miro.getWidgets();
}
`