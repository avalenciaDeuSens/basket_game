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
const ballMaterial = new THREE.MeshPhongMaterial({
    map: textureLoader.load('images/ball.png'),
    normalMap: textureLoader.load('images/ball_normal.png')
});
backboardMaterial = new THREE.MeshPhongMaterial({
    map: textureLoader.load('images/backboard/backboard.jpg'),
    normalMap: textureLoader.load('images/backboard/backboard_normal.jpg'), normalScale: new THREE.Vector2(0.3, 0.3)
});

const pos = new THREE.Vector3(0, 1.8, 2.5);
const initBallPos = new THREE.Vector3(0, 1.8, 2.5);;
const quat = new THREE.Quaternion();
const nullG = new THREE.Vector3(0, 0, 0);
const G = new THREE.Vector3(0, -9, 0);
let maxDrag;

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
    scene.setGravity(nullG);
    scene.addEventListener(
        'update',
        function () {
            scene.simulate(undefined, 2);
            physics_stats.update();
        }
    );
    camera.position.set(0, 1, 5);

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false;
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
    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
    const ground = createParalellepipedWithPhysics(10, 1, 10, 0, pos, quat, groundMaterial);
    ground.name = "ground";
    scene.add(ground);
    freezeObject(ground);
    ground.receiveShadow = true;
    //wall
    const wall = createParalellepipedWithPhysics(10, 10, 1, 0, new THREE.Vector3(0, 5, -5), quat, groundMaterial);
    scene.add(wall);
    freezeObject(wall);
    wall.receiveShadow = true;
    wall.name = "wall";
    //backboard
    const backboard = createParalellepipedWithPhysics(1.8, 1.12, 0.05, 0, new THREE.Vector3(0, 3.1, -4.4), quat, backboardMaterial);
    scene.add(backboard);
    freezeObject(backboard);
    backboard.receiveShadow = true;
    backboard.name = "backboard";
    //ring
    const torusMaterial = new THREE.MeshPhongMaterial({ color: 0xfe571b });
    const torus = createTorus(0.45, 0.025, new THREE.Vector3(0, 2.8, -3.75), quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0, 'XYZ')), torusMaterial);
    torus.receiveShadow = true;
    torus.castShadow = true;
    torus.name = "torus";
    scene.add(torus);
    createBall();
}

function freezeObject(object) {
    object.setAngularFactor = THREE.Vector3(0, 0, 0);
    object.setLinearFactor = THREE.Vector3(0, 0, 0);
}

function createParalellepipedWithPhysics(sx, sy, sz, mass, pos, quat, material) {
    const object = new Physijs.BoxMesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1), material, 0);
    object.position.copy(pos);
    object.rotation.setFromQuaternion(quat);
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
    if (collided_with.name.includes("ringPart")) {
        return;
    }
    normal = normal.normalize();
    let d = this.getLinearVelocity();
    let dot = d.dot(normal);
    let r = d.sub(normal.multiplyScalar(2 * dot));
    this.setLinearVelocity(r.multiplyScalar(0.6));
    if (collided_with.name.includes("backboard")) {
        return;
    }
    collisions++;
    if (collisions > 3) {
        resetBall();
    }
}

function createBall() {
    // Creates a ball and throws it
    const ballMass = 1;
    const ballRadius = 0.295;

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
    console.log("reset")
    setState(State.Waiting);
    collisions = 0;
    scene.remove(ball);
    createBall();
}

let ballExist = false;
let collisions = 0;
function initInput() {
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointerleave', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('touchend', onPointerUp);

    maxDrag = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight);
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

function onPointerUp(event) {
    if (state != State.Dragging) {
        return;
    }
    endClickMouseCoords.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        - (event.clientY / window.innerHeight) * 2 + 1
    );
    launchBall();
}

function onPointerMove(event) {
    if (state == State.Dragging) {
        console.log("dragging");
    }
    if (state != State.Down) {
        return;
    }
    console.log("dragging");
    setState(State.Dragging);
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

let allowToChange = true;
let timeToReallow = 5;
let timeToNextChange = 0;
function animate() {
    if (ball.position.y < 0) {
        resetBall();
    }
    requestAnimationFrame(animate);
    delta = clock.getDelta();
    let shouldChange = renderer.shadowMap.enabled == delta > (1 / 30);
    if (shouldChange && allowToChange) {
        timeToNextChange = timeToReallow;
        allowToChange = false;
        renderer.shadowMap.enabled = !renderer.shadowMap.enabled;
    }
    timeToNextChange -= delta;
    allowToChange = timeToNextChange < 0;

    renderer.render(scene, camera);
    render_stats.update();

}

function launchBall() {
    setState(State.Flying);
    console.log("launch");
    const dragVector = endClickMouseCoords.sub(clickMouseCoords);
    const force = (dragVector.length() / maxDrag) * (maxForce - minForce) + minForce;
    ball.applyCentralImpulse((new THREE.Vector3(dragVector.x, dragVector.y, -dragVector.y)).normalize().multiplyScalar(force));
}

function setState(newState) {
    switch (newState) {
        case State.Waiting:
            scene.setGravity(nullG);
            break;
        case State.Flying:
            scene.setGravity(G);
            break;
    }
    state = newState;
}