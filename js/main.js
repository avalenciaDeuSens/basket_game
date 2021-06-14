'use strict';
Physijs.scripts.worker = './js/physijs_worker.js';
Physijs.scripts.ammo = './ammo.js';

let fixedDelta = 1 / 30;

let ballPosition = new THREE.Vector3();

let torus;
let ballResetTimeout;
let allowToChange = true;

let goal = false;
let backboardCollision = false;
//fps control
let lastDeltas = new Queue();
let wantToChange = false;
let framesWanting = 0;
let firstBall = true;
let collisions = 0;
//force modification
let time = 0;
let forceModifier = 1;
//request variables
let token;
let idUser;

// - Main code -

window.onload = init;

// - Functions -

function init() {
    if (window.location.search) {
        const params = new URLSearchParams(window.location.search);
        idUser = params.get("idusuario");
    }
    if (!idUser) {
        idUser = 1;
    }
    initGraphics();

    createObjects();

    initInput();

    getToken();

}

function initGraphics() {

    container = document.getElementById('container');
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 2000);
    scene = new Physijs.Scene({ fixedTimeStep: fixedDelta });
    scene.setGravity(G);
    scene.addEventListener(
        'update',
        function () {
            scene.simulate(undefined, 2);
        }
    );
    camera.position.set(0, 1.6, 2);
    camera.lookAt(torusPosition);

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;//!isMobile;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x707070);
    scene.add(ambientLight);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 18, 10);
    light.castShadow = true;
    const d = 14;
    light.shadow.camera.left = - d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = - d;

    light.shadow.camera.near = 2;
    light.shadow.camera.far = 50;

    light.shadow.mapSize.x = 1024;
    light.shadow.mapSize.y = 1024;

    scene.add(light);
    //

    window.addEventListener('resize', onWindowResize);
    requestAnimationFrame(animate);
    scene.simulate();
}

function createObjects() {

    //ground
    createParalellepipedWithPhysics(1.55, 0.01, 2.36, 0, new THREE.Vector3(0, -0.005, -2.36 / 2), quat, groundMaterial, "ground");
    //wall
    createParalellepipedWithPhysics(1.55, 2.75, 0.01, 0, new THREE.Vector3(0, 2.75 / 2, -2.365), quat, groundMaterial, "wall");
    //left wall
    createParalellepipedWithPhysics(0.01, 2.75, 2.36, 0, new THREE.Vector3(-.725, 2.75 / 2, -2.36 / 2), quat, groundMaterial, "leftWall");
    //right wall
    createParalellepipedWithPhysics(0.01, 2.75, 2.36, 0, new THREE.Vector3(.725, 2.75 / 2, -2.36 / 2), quat, groundMaterial, "rightWall");
    //ring
    const torus = createTorus(0.45 / 2, 0.025, torusPosition, quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0, 'XYZ')), torusMaterial);
    torus.receiveShadow = true;
    torus.castShadow = true;
    torus.name = "torus";
    scene.add(torus);
    //net
    let netPos = new THREE.Vector3(0, -.75 / 4, 0);
    netPos.add(torusPosition);
    const net = createCylinderNotPhysic(0.45 / 2 + .025, 0.45 / 2 - .05, .75 / 2, 16,
        netPos, new THREE.Euler(0, Math.PI / 2, 0, 'XYZ'),
        netMaterial, true);
    scene.add(net);

    createBall();
    freezeObject(ball);
}

function freezeObject(object) {
    object.setAngularFactor(new THREE.Vector3(0, 0, 0));
    object.setLinearFactor(new THREE.Vector3(0, 0, 0));
    object.setAngularVelocity(new THREE.Vector3(0, 0, 0));
    object.setLinearVelocity(new THREE.Vector3(0, 0, 0))
}

function unFreezeObject(object) {
    object.setAngularFactor(new THREE.Vector3(1, 1, 1));
    object.setLinearFactor(new THREE.Vector3(1, 1, 1));
}

function handleConllision(collided_with, linearVelocity, angularVelocity, normal) {
    if (collided_with.name.includes("ringPart")) {
        return;
    }
    if (collided_with.name.includes("backWall")) {
        backboardCollision = true;
    }
    collisions++;
    if (collisions > maxCollisions) {
        resetBall();
    }
}

function createBall() {
    ball = new Physijs.SphereMesh(new THREE.SphereGeometry(ballRadius, 14, 10),
        ballMaterial, ballMass);
    ball.castShadow = true;
    ball.receiveShadow = true;
    quat.set(0, 0, 0, 1);
    ball.position.copy(initBallPos);
    ballPosition.copy(initBallPos);
    ball.rotation.setFromQuaternion(quat);
    scene.add(ball);
    ball.addEventListener('collision', handleConllision);
    ball.name = "ball";
}

function resetBall() {
    setState(State.Waiting);
    let noise = (new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)).normalize().multiplyScalar(Math.random() * 0.5);
    ballPosition.copy(initBallPos).add(noise);
    console.log(ballPosition);
    ball.position.copy(ballPosition);
    ball.rotation.setFromQuaternion(quat);
    ball.__dirtyPosition = true;
    window.clearTimeout(ballResetTimeout);
    backboardCollision = false;
    collisions = 0;
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {
    requestAnimationFrame(animate);
    let dt = clock.getDelta();
    lastDeltas.enqueue(dt);
    if (lastDeltas.length > 10) {
        lastDeltas.dequeue();
    }
    checkFramerate();

    if (state == State.Waiting) {
        ball.position.copy(ballPosition);
        moveSelector(dt);
    }
    if (state == State.Flying) {
        checkGoal();
    }
    renderer.render(scene, camera);
}

function moveSelector(dt) {
    time += dt;
    let sinTime = Math.sin(time);
    forceModifier = 1 + sinTime;
    let t = sinTime / 2 + 0.5;
    forceSelector.style.top = t * 19.75 + "vh";
}

function checkFramerate() {
    let deltaSum = 0;
    for (let index = 0; index < lastDeltas.length(); index++) {
        deltaSum += lastDeltas.elements[index];
    }
    let avgDelta = deltaSum / lastDeltas.length();
    wantToChange = renderer.shadowMap.enabled == Math.ceil(1 / avgDelta) < 30;
    let shouldChange = false;
    if (wantToChange) {
        framesWanting++;
        shouldChange = framesWanting >= wantFramesToShould;
    }
    else {
        framesWanting = 0;
    }
    if (shouldChange && allowToChange) {
        setTimeout(reAllow, timeToReallow);
        allowToChange = false;
        renderer.shadowMap.enabled = !renderer.shadowMap.enabled;
        renderer.shadowMap.needsUpdate = true;
        console.log(renderer.shadowMap.enabled ? "Shadows enabled" : "Shadows disabled");
    }
}

function checkGoal() {
    const BLpos = ball.position;
    const BSpos = torus.position;

    if (ball.position.y < 0 || ball.position.x < -5 || ball.position.x > 5 || ball.position.y > 10) {
        resetBall();
    }

    if (BLpos.distanceTo(BSpos) < 0.25 && Math.abs(BLpos.y - BSpos.y + 0.25) < 0.25 && !goal) {
        goal = true;
        let thisScore = backboardCollision ? 2 : 3;
        score += thisScore;
        currentScore.innerHTML = thisScore;
        finalScore.innerHTML = score;
        window.clearTimeout(ballResetTimeout);
        setTimeout(clearScore, 1000);
        ballResetTimeout = setTimeout(resetBall, 1000);
        console.log("Score");
    }
}

function clearScore() {
    currentScore.innerHTML = 0;
}

function reAllow() {
    allowToChange = true;
}

function launchBall() {
    setState(State.Flying);
    goal = false;
    const dragVector = endClickMouseCoords.sub(clickMouseCoords);
    const clampedValue = Math.max(Math.min(dragVector.length() / maxDrag, 1), 0);
    const force = (clampedValue) * (maxForce - minForce) + minForce;
    let forceToApply = (new THREE.Vector3(dragVector.x / 4, dragVector.y, -dragVector.y / 2)).normalize().multiplyScalar(force);
    ball.applyCentralImpulse(forceToApply.multiplyScalar(forceModifier));
    ballResetTimeout = setTimeout(resetBall, timeToReset);
    if (firstBall) {
        firstBall = false;
        setTimeout(timerFunction, 1000);
    }
}

function timerFunction() {
    timeLeft.innerHTML = timeLeft.innerHTML - 1;
    if (timeLeft.innerHTML > 0) {
        setTimeout(timerFunction, 1000);
    }
    else {
        setState(State.Finished);
        sendScore();
        parent.gameFinished(score);
    }
}

function setState(newState) {
    if (state == State.Finished) {
        return;
    }
    switch (newState) {
        case State.Waiting:
            freezeObject(ball);
            break;
        case State.Flying:
            unFreezeObject(ball);
            break;
    }
    state = newState;
}

function Queue() {
    this.elements = [];
}
Queue.prototype.enqueue = function (e) {
    this.elements.push(e);
};
Queue.prototype.dequeue = function () {
    return this.elements.shift();
};
Queue.prototype.isEmpty = function () {
    return this.elements.length == 0;
};
Queue.prototype.peek = function () {
    return !this.isEmpty() ? this.elements[0] : undefined;
};
Queue.prototype.length = function () {
    return this.elements.length;
}