function initInput() {
    if (isMobile) {
        console.log("Is mobile")
        window.addEventListener('touchmove', onPointerMove, false);
        window.addEventListener('touchstart', onTouchDown, false);
        window.addEventListener('touchend', onTouchUp, false);
    }
    else {
        console.log("Not mobile")
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointerleave', onPointerUp);
    }
}

function onPointerDown(event) {
    if (state != State.Waiting) {
        return;
    }
    setState(State.Down);
    clickMouseCoords.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        - (event.clientY / window.innerHeight) * 2 + 1
    );
}

function onTouchDown(event) {
    if (state != State.Waiting) {
        return;
    }
    setState(State.Down);
    clickMouseCoords.set(
        (event.targetTouches[0].clientX / window.innerWidth) * 2 - 1,
        - (event.targetTouches[0].clientY / window.innerHeight) * 2 + 1
    );
}

function onPointerUp(event) {
    if (state != State.Dragging && state != State.Down) {
        return;
    }
    endClickMouseCoords.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        - (event.clientY / window.innerHeight) * 2 + 1
    );
    launchBall();
}

function onTouchUp(event) {
    if (state != State.Dragging && state != State.Down) {
        return;
    }
    endClickMouseCoords.set(
        (event.changedTouches[0].clientX / window.innerWidth) * 2 - 1,
        - (event.changedTouches[0].clientY / window.innerHeight) * 2 + 1
    );
    launchBall();
}

function onPointerMove(event) {
    if (state != State.Down) {
        return;
    }
    setState(State.Dragging);
}