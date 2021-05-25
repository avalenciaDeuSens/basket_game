'use strict';
let torus;
Physijs.scripts.worker = './physijs_worker.js';
Physijs.scripts.ammo = './js/ammo.js';

let textureLoader = new THREE.TextureLoader();
const clock = new THREE.Clock();
let delta = 1 / 60;
let fixedDelta = 1 / 30;

const clickMouseCoords = new THREE.Vector2();
const endClickMouseCoords = new THREE.Vector2();
const ballMaterial = new Physijs.createMaterial(new THREE.MeshPhongMaterial({
    map: textureLoader.load('images/ball.png'),
    normalMap: textureLoader.load('images/ball_normal.png')
}), 0.2, 0.9);
const netMaterial = new THREE.MeshPhongMaterial({
    map: textureLoader.load('images/net4.png'),
    side: THREE.DoubleSide, transparent: true
});
const backboardMaterial = new Physijs.createMaterial(new THREE.MeshPhongMaterial({
    map: textureLoader.load('images/backboard.jpg'),
    normalMap: textureLoader.load('images/backboard_normal.jpg'), normalScale: new THREE.Vector2(0.3, 0.3)
}), 0.6, 1);

const pos = new THREE.Vector3(0, 1.8, 2.5);
const initBallPos = new THREE.Vector3(0, 1.2, 0);;
const quat = new THREE.Quaternion();
const nullG = new THREE.Vector3(0, 0, 0);
const G = new THREE.Vector3(0, -20, 0);
const torusPosition = new THREE.Vector3(0, 2, -2.3625 + .45 / 2);
const maxDrag = 2;
let ballResetTimeout;
let goalTimeout;
let allowToChange = true;
const timeToReallow = 5000;//ms
const timeToReset = 3000;//ms
const ballMass = 0.6;
const ballRadius = 0.295 / 2;
let goal = false;
const isMobile = navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/);
let backboardCollision = false;

let lastDeltas = new Queue();
let wantToChange = false;
const wantFramesToShould = 5;
let framesWanting = 0;

// - Main code -

window.onload = init;

// - Functions -

function init() {

    initGraphics();

    createObjects();

    initInput();

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
            physics_stats.update();
        }
    );
    camera.position.set(0, 1.6, 2);
    camera.lookAt(torusPosition);

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = !isMobile;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x707070);
    scene.add(ambientLight);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 18, 5);
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

    render_stats = new Stats();
    render_stats.domElement.style.position = 'absolute';
    render_stats.domElement.style.top = '0px';
    render_stats.domElement.style.zIndex = 100;
    document.getElementById('container').appendChild(render_stats.domElement);

    physics_stats = new Stats();
    physics_stats.domElement.style.position = 'absolute';
    physics_stats.domElement.style.top = '50px';
    physics_stats.domElement.style.zIndex = 100;
    document.getElementById('container').appendChild(physics_stats.domElement);

    //

    window.addEventListener('resize', onWindowResize);
    requestAnimationFrame(animate);
    scene.simulate();
}

function createObjects() {

    // Ground
    pos.set(0, - 0.5, 0);
    quat.set(0, 0, 0, 1);
    //ground
    const groundMaterial = Physijs.createMaterial(new THREE.MeshPhongMaterial({ color: 0xFFFFFF }), 0.6, 0.6);
    const ground = createParalellepipedWithPhysics(1.55, 0.01, 2.36, 0, new THREE.Vector3(0, -0.005, -2.36 / 2), quat, groundMaterial);
    ground.name = "ground";
    scene.add(ground);
    ground.receiveShadow = true;
    //wall
    const backwall = createParalellepipedWithPhysics(1.55, 2.75, 0.01, 0, new THREE.Vector3(0, 2.75 / 2, -2.365), quat, groundMaterial);
    scene.add(backwall);
    backwall.receiveShadow = true;
    backwall.name = "backWall";
    //left wall
    const leftWall = createParalellepipedWithPhysics(0.01, 2.75, 2.36, 0, new THREE.Vector3(-.725, 2.75 / 2, -2.36 / 2), quat, groundMaterial);
    scene.add(leftWall);
    leftWall.receiveShadow = true;
    leftWall.name = "leftWall";
    //right wall
    const rightWall = createParalellepipedWithPhysics(0.01, 2.75, 2.36, 0, new THREE.Vector3(.725, 2.75 / 2, -2.36 / 2), quat, groundMaterial);
    scene.add(rightWall);
    rightWall.receiveShadow = true;
    rightWall.name = "rightWall";
    ////backboard
    //const backboard = createParalellepipedWithPhysics(1.8, 1.12, 0.05, 0, new THREE.Vector3(0, 3.2, -2.3625), quat, backboardMaterial);
    //scene.add(backboard);
    //backboard.receiveShadow = true;
    //backboard.name = "backboard";
    //ring
    const torusMaterial = new THREE.MeshPhongMaterial({ color: 0xfe571b });
    const torus = createTorus(0.45 / 2, 0.025, torusPosition, quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0, 'XYZ')), torusMaterial);
    torus.receiveShadow = true;
    torus.castShadow = true;
    torus.name = "torus";
    scene.add(torus);
    //net
    const netPos = new THREE.Vector3(0, -.75 / 4, 0);
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

function createParalellepipedWithPhysics(sx, sy, sz, mass, pos, quat, material) {
    const object = new Physijs.BoxMesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1), material, mass);
    object.position.copy(pos);
    object.rotation.setFromQuaternion(quat);
    return object;
}

function createCylinder(infRad, supRad, height, divisions, mass, pos, euler, material, open) {
    const object = new Physijs.CylinderMesh(
        new THREE.CylinderGeometry(infRad, supRad, height, divisions, 1, open),
        material, mass);
    object.position.copy(pos);
    object.rotation.copy(euler);
    return object;
}

function createCylinderNotPhysic(infRad, supRad, height, divisions, pos, euler, material, open) {
    const object = new THREE.Mesh(new THREE.CylinderGeometry(infRad, supRad, height, divisions, 1, open),
        material);
    object.position.copy(pos);
    object.rotation.copy(euler);
    return object;
}

function createTorus(extRadius, intRadius, pos, quat, material) {
    const fragments = 32;
    torus = new THREE.Mesh(new THREE.TorusGeometry(extRadius, intRadius, fragments, fragments), material);
    torus.position.copy(pos);
    torus.rotation.setFromQuaternion(quat);

    const fragSize = 2 * Math.PI * extRadius / fragments * 1.1;
    const baseVector = new THREE.Vector3(0, 0, extRadius - 0.005);
    const yVector = new THREE.Vector3(0, 1, 0);
    const angle = (2 * Math.PI) / fragments;
    for (let index = 0; index < fragments; index++) {
        let object = new Physijs.CylinderMesh(
            new THREE.CylinderGeometry(intRadius, intRadius, fragSize, fragments),
            new THREE.MeshPhongMaterial({ color: 0xCCCCCC }), 0);
        object.visible = false;
        let newPos = new THREE.Vector3();
        newPos.copy(pos);
        if (index != 0)
            newPos.add(baseVector.applyAxisAngle(yVector, angle));
        else
            newPos.add(baseVector);
        object.position.copy(newPos);
        object.rotation.setFromQuaternion(quat.setFromEuler(new THREE.Euler(0, angle * index, Math.PI / 2, 0, 'XYZ')));
        scene.add(object);
        object.name = "ringPart" + index;
        freezeObject(object);
    }
    return torus;
}

function handleConllision(collided_with, linearVelocity, angularVelocity, normal) {
    if (collided_with.name.includes("backboard")) {
        backboardCollision = true;
    }
}

function createFakeBall() {
    fakeBall = new Physijs.SphereMesh(new THREE.SphereGeometry(ballRadius, 14, 10),
        ballMaterial, 0);
    fakeBall.castShadow = true;
    fakeBall.receiveShadow = true;
    quat.set(0, 0, 0, 1);
    fakeBall.position.copy(initBallPos);
    fakeBall.rotation.setFromQuaternion(quat);
    scene.add(fakeBall);
    fakeBall.name = "fakeBall";
}

function createBall() {
    // Creates a ball and throws it

    ball = new Physijs.SphereMesh(new THREE.SphereGeometry(ballRadius, 14, 10),
        ballMaterial, ballMass);
    ball.castShadow = true;
    ball.receiveShadow = true;
    quat.set(0, 0, 0, 1);
    ball.position.copy(initBallPos);
    ball.rotation.setFromQuaternion(quat);
    scene.add(ball);
    ball.addEventListener('collision', handleConllision);
    ball.name = "ball";
}

function resetBall() {
    setState(State.Waiting);
    ball.position.copy(initBallPos);
    ball.rotation.setFromQuaternion(quat);
    ball.__dirtyPosition = true;
    window.clearTimeout(ballResetTimeout);
    backboardCollision = false;
}

let ballExist = false;
let collisions = 0;
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

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {
    requestAnimationFrame(animate);
    lastDeltas.enqueue(clock.getDelta());
    if (lastDeltas.length > 10) {
        lastDeltas.dequeue();
    }
    checkFramerate();

    if (state == State.Waiting) {
        ball.position.copy(initBallPos);
    }
    if (state == State.Flying) {
        checkGoal();
    }

    renderer.render(scene, camera);
    render_stats.update();
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
        score += backboardCollision ? 2 : 3;
        window.clearTimeout(ballResetTimeout);
        ballResetTimeout = setTimeout(resetBall, 1000);
        console.log("Score");
    }
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
    //console.log("Force applied: " + force);
    let forceToApply = (new THREE.Vector3(dragVector.x / 4, dragVector.y, -dragVector.y / 2)).normalize().multiplyScalar(force);
    ball.applyCentralImpulse(forceToApply);
    ballResetTimeout = setTimeout(resetBall, timeToReset);
}

function setState(newState) {
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