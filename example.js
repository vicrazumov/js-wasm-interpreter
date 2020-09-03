const example = `
function tick() {
    const [widget] = miro.getWidgets();
    if (widget.shape.x < 100) {
        miro.editWidget(widget.id, { x: widget.shape.x + 1, y: widget.shape.y + 1 });
        miro.animation.tick(tick);
    }
}

function main() {
    const widget1 = miro.createWidget({ x: 1, y: 1 });
    const widget2 = miro.createWidget({ x: 2, y: 2 });

    miro.createWidget({ x: 100, y: 20 });
    miro.createWidget({ x: 100, y: 200 });

    miro.editWidget(widget1.id, { x: 3, y: 3 });
    miro.removeWidget(widget2.id);

    miro.animation.tick(tick);

    // open console and witness what is returned
    return 400 + 20;
}
`