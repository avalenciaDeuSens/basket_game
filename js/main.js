'use strict';


//import { FBXLoader } from './FBXLoader.js';

Physijs.scripts.worker = './js/physijs_worker.js';
Physijs.scripts.ammo = './ammo.js';

//Constants
const clock = new THREE.Clock();
const textureLoader = new THREE.TextureLoader();
const ballMaterial = new Physijs.createMaterial(new THREE.MeshPhongMaterial({ color: 0x00000000, transparent: true, opacity: 0 }), 0.2, 0.9);
const netMaterial = new THREE.MeshPhongMaterial({
    map: textureLoader.load('images/net4.png'),
    side: THREE.DoubleSide, transparent: true
});
const backboardMaterial = new Physijs.createMaterial(
    new THREE.MeshPhongMaterial({
        map: textureLoader.load('images/backboard.jpg'),
        normalMap: textureLoader.load('images/backboard_normal.jpg'),
        normalScale: new THREE.Vector2(0.3, 0.3)
    }), 0.6, 1);
const groundMaterial = Physijs.createMaterial(new THREE.MeshPhongMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0 }), 0.6, 0.6);
const torusMaterial = new THREE.MeshPhongMaterial({ color: 0xfe571b });

const clickMouseCoords = new THREE.Vector2();
const endClickMouseCoords = new THREE.Vector2();

const quat = new THREE.Quaternion();
const pos = new THREE.Vector3(0, 1.8, 2.5);
const initBallPos = new THREE.Vector3(0, .5, 0);
const torusPosition = new THREE.Vector3(0, 2.015, -2);
const G = new THREE.Vector3(0, -20, 0);
const leftMarkerPos = new THREE.Vector3(-0.5, 2.74, -2.32);
const centralMarkerPos = new THREE.Vector3(0, 2.74, -2.32);
const rightMarkerPos = new THREE.Vector3(0.5, 2.74, -2.32);

const maxDrag = 2;
const timeToReallow = 5000;//ms
const timeToReset = 3000;//ms
const ballMass = 0.6;
const ballRadius = 0.295 / 2;
const wantFramesToShould = 5;
const maxCollisions = 3;

const isMobile = navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/);

const finalScore = document.getElementById("totalScore");
const currentScore = document.getElementById("score");
const timeLeft = document.getElementById("timeLeft");
const forceSelector = document.getElementById("forceSelector");

//const loader = new FBXLoader();

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
let ballModel;
let playTime = 30;

let wallB, wallR, wallL, ground, backboard, incBorderL, incBorderR, borderL, borderR, ground2;

parent.setUser = function (user) {
    idUser = user;
    console.log("User set to " + user)
}

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

    //getToken();
}

//Create the scene and the lights
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
    camera.position.set(0, 0.75, 2);
    //camera.lookAt(torusPosition);

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false;//!isMobile;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x707070);
    scene.add(ambientLight);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 18, 10);
    light.castShadow = false;
    //const d = 14;
    //light.shadow.camera.left = - d;
    //light.shadow.camera.right = d;
    //light.shadow.camera.top = d;
    //light.shadow.camera.bottom = - d;

    //light.shadow.camera.near = 2;
    //light.shadow.camera.far = 50;

    //light.shadow.mapSize.x = 1024;
    //light.shadow.mapSize.y = 1024;

    scene.add(light);
    //

    window.addEventListener('resize', onWindowResize);
    requestAnimationFrame(animate);
    scene.simulate();
}

//create the objects in the scene
function createObjects() {

    loadModels();
    createColliders();

    //basket
    createBasket();

    createBall();
    freezeObject(ball);

    loadFont();
}

function loadModels() {
    const loader = new THREE.GLTFLoader().setPath('models/');
    loader.load('basket_machine.gltf', function (gltf) {
        scenario = gltf.scene.children[0];
        scene.add(scenario);
        scenario.rotation.y = Math.PI / 180 * -90;
        scenario.position.set(0, 0.25, -2.5);

        parent.gameLoaded();
    }, undefined, function (e) {
        console.error(e);
    });
}

function createBasket() {
    //ring
    const torus = createTorus(0.25, 0.01, torusPosition, quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0, 'XYZ')), torusMaterial);
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
}

function createColliders() {
    //ground
    ground = createParalellepipedWithPhysics(2, 0.01, 2.4, 0, new THREE.Vector3(0, 0.18, -0.85), quat.setFromEuler(new THREE.Euler(Math.PI / 180 * 27.2, 0, 0, 'XYZ')), groundMaterial, "ground");
    //wall
    wallB = createParalellepipedWithPhysics(2, 3.15, 0.01, 0, new THREE.Vector3(0, 3.15 / 2, -2.325), quat.set(0, 0, 0, 1), groundMaterial, "wall");
    //left wall
    wallL = createParalellepipedWithPhysics(0.01, 3.15, 3, 0, new THREE.Vector3(-1, 3.15 / 2, -1), quat, groundMaterial, "leftWall");
    //right wall
    wallR = createParalellepipedWithPhysics(0.01, 3.15, 3, 0, new THREE.Vector3(1, 3.15 / 2, -1), quat, groundMaterial, "rightWall");
    //backboard
    backboard = createParalellepipedWithPhysics(0.9, 0.69, 0.01, 0, new THREE.Vector3(0, 2.28, -2.25), quat, groundMaterial, "backboard");
    //borde inclinado l
    incBorderL = createParalellepipedWithPhysics(0.2, 0.69, 1.5, 0, new THREE.Vector3(-.9, .91, -1.85), quat.setFromEuler(new THREE.Euler(Math.PI / 180 * 26.65, 0, 0, 'XYZ')), groundMaterial, "incBorderL");
    //borde inclinado r
    incBorderR = createParalellepipedWithPhysics(0.2, 0.69, 1.5, 0, new THREE.Vector3(.9, .91, -1.85), quat, groundMaterial, "incBorderR");
    //borderL
    borderL = createParalellepipedWithPhysics(0.2, 2, 1.5, 0, new THREE.Vector3(-.9, -.115, -.58), quat.setFromEuler(new THREE.Euler(0, 0, 0, 'XYZ')), groundMaterial, "borderR");
    //borderR
    borderR = createParalellepipedWithPhysics(0.2, 2, 1.5, 0, new THREE.Vector3(.9, -.115, -.58), quat, groundMaterial, "borderL");
    //ground2
    ground2 = createParalellepipedWithPhysics(2, 0.01, 0.5, 0, new THREE.Vector3(0, .72, -2.2), quat, groundMaterial, "ground2");
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

//Called when a collision happens
function handleConllision(collided_with, linearVelocity, angularVelocity, normal) {
    if (collided_with.name.includes("ringPart")) {
        return;
    }
    if (collided_with.name.includes("backWall") || collided_with.name.includes("backboard")) {
        backboardCollision = true;
        return;
    }
    collisions++;
    if (collisions > maxCollisions) {
        resetBall();
    }
}

function createBall() {
    ball = new Physijs.SphereMesh(new THREE.SphereGeometry(ballRadius, 14, 10),
        ballMaterial, ballMass);

    const loader = new THREE.GLTFLoader().setPath('models/');
    loader.load('basket_ball.gltf', function (gltf) {
        ballModel = gltf.scene.children[0];
        ball.add(ballModel);
        ballModel.position.set(0, 0, 0);
        ball.scale.set(0.3, 0.3, 0.3);
    }, undefined, function (e) {
        console.error(e);
    });
    quat.set(0, 0, 0, 1);
    ball.position.copy(initBallPos);
    ballPosition.copy(initBallPos);
    ball.rotation.setFromQuaternion(quat);
    scene.add(ball);
    ball.addEventListener('collision', handleConllision);
    ball.name = "ball";
}

//reset the ball and asign a random position in an spheric area around the initial ball position
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
    //store the last 10 deltas to check the frame rate
    let dt = clock.getDelta();
    //lastDeltas.enqueue(dt);
    //if (lastDeltas.length > 10) {
    //    lastDeltas.dequeue();
    //}
    //checkFramerate();

    if (state == State.Waiting) {
        ball.position.copy(ballPosition);
        moveSelector(dt);
    }
    if (state == State.Flying) {
        checkGoal();
    }
    renderer.render(scene, camera);
}

//move the force selector up and down with a sinusoidal function
function moveSelector(dt) {
    time += dt;
    let sinTime = Math.sin(2 * time);
    forceModifier = 1 + sinTime;
    let t = sinTime / 2 + 0.5;
    forceSelector.style.top = t * 19.75 + "vh";
}

//depending on the framerate it enables or disables the shadows to increase the performance or to increase the fidelity
//to avoid changing to much, it waits some frames to see if the framerate stabilized
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
        refreshText(1, thisScore);
        refreshText(0, score);
        window.clearTimeout(ballResetTimeout);
        setTimeout(clearScore, 1000);
        ballResetTimeout = setTimeout(resetBall, 1000);
        console.log("Score");
    }
}

function clearScore() {
    refreshText(1, 0);
}

function reAllow() {
    allowToChange = true;
}

//get the force modifier from the force selector and apply it to the drag
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

//change the timer each second, when it reaches 0, it notifies the end
function timerFunction() {
    playTime--;
    refreshText(2, "" + playTime);
    if (playTime > 0) {
        setTimeout(timerFunction, 1000);
    }
    else {
        setState(State.Finished);
        //sendScore();
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

/*
Input
*/
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

/*
Connections
*/
function getToken() {
    var data = JSON.stringify({
        "email": "i@deusens.com",
        "password": "123456"
    });

    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    xhr.addEventListener("readystatechange", function () {
        if (this.readyState === 4) {
            console.log(this.responseText);
        }
    });

    xhr.open("POST", "https://casademont.deusens.com:8055/auth/login");
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.send(data);

    xhr.onload = function () {
        token = JSON.parse(xhr.response);
    };

    xhr.onerror = function () { // only triggers if the request couldn't be made at all
        console.log("Error getting token");
    };
}

function sendScore() {
    var data = JSON.stringify({
        "resultado": score
    });

    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    xhr.addEventListener("readystatechange", function () {
        if (this.readyState === 4) {
            console.log(this.responseText);
        }
    });

    xhr.open("PATCH", "https://casademont.deusens.com:8055/items/ranking/" + idUser);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Authorization", "Bearer " + token.data.access_token);

    xhr.send(data);

    xhr.onload = function () {
        console.log("Score send");
    };

    xhr.onerror = function () { // only triggers if the request couldn't be made at all
        console.log("Error sending score");
    };
}


/*
Creator
*/
function createParalellepipedWithPhysics(sx, sy, sz, mass, pos, quat, material, name) {
    const object = new Physijs.BoxMesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1), material, mass);
    object.position.copy(pos);
    object.rotation.setFromQuaternion(quat);
    object.name = name;
    scene.add(object);
    object.receiveShadow = true;
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

//creates a toroid
function createTorus(extRadius, intRadius, pos, quat, material) {
    const fragments = 32;
    //the visible part has no physics
    torus = new THREE.Mesh(new THREE.TorusGeometry(extRadius, intRadius, fragments, fragments), material);
    torus.position.copy(pos);
    torus.rotation.setFromQuaternion(quat);

    const fragSize = 2 * Math.PI * extRadius / fragments * 1.1;
    const baseVector = new THREE.Vector3(0, 0, extRadius - 0.005);
    const yVector = new THREE.Vector3(0, 1, 0);
    const angle = (2 * Math.PI) / fragments;
    const cylinderGeometry = new THREE.CylinderGeometry(intRadius, intRadius, fragSize, fragments);
    const cylinderMaterial = new THREE.MeshPhongMaterial({ color: 0xCCCCCC });
    //the physical part is invisible, there are cylinders in a circle to simulate a toroid
    for (let index = 0; index < fragments; index++) {
        let object = new Physijs.CylinderMesh(cylinderGeometry, cylinderMaterial, 0);
        object.visible = false;
        object.position.copy(pos);
        if (index != 0) {
            object.position.add(baseVector.applyAxisAngle(yVector, angle));
        }
        else {
            object.position.add(baseVector);
        }
        object.rotation.setFromQuaternion(quat.setFromEuler(new THREE.Euler(0, angle * index, Math.PI / 2, 0, 'XYZ')));
        scene.add(object);
        object.name = "ringPart" + index;
        freezeObject(object);
    }
    return torus;
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

var group1, group2, group3, textMesh1, textMesh2, textMesh3, textGeo, material;
var groups, textMeshes = [textMesh1, textMesh2, textMesh3];

var firstLetter = true;
var font;
var height = .01,
    size = 0.2,

    curveSegments = 4,

    fontName = "Digital-7", // helvetiker, optimer, gentilis, droid sans, droid serif
    fontWeight = "normal", // normal bold
    style = "normal";
function loadFont() {

    var loader = new THREE.FontLoader();
    loader.load('fonts/Digital-7_Regular.json', function (response) {

        font = response;

        initTextMarkers();

    });

}

function initTextMarkers() {
    group1 = new THREE.Group();
    group2 = new THREE.Group();
    group3 = new THREE.Group();
    groups = [group1, group2, group3];
    group1.position.copy(leftMarkerPos);
    group2.position.copy(centralMarkerPos);
    group3.position.copy(rightMarkerPos);
    scene.add(group1);
    scene.add(group2);
    scene.add(group3);
    refreshText(0, "0");
    refreshText(1, "0");
    refreshText(2, "30");
}

function createText(text, textMesh) {
    let material = new THREE.MeshPhongMaterial({ color: 0xff0000, flatShading: true });

    textGeo = new THREE.TextGeometry(text, {

        font: font,

        size: size,
        height: height,
        curveSegments: curveSegments

    });

    textGeo.computeBoundingBox();
    textGeo.computeVertexNormals();



    var centerOffset = -0.5 * (textGeo.boundingBox.max.x - textGeo.boundingBox.min.x);

    textMesh = new THREE.Mesh(textGeo, material);

    textMesh.position.x = centerOffset;

    textMesh.rotation.x = 0;
    textMesh.rotation.y = Math.PI * 2;

    return textMesh;
}

function refreshText(index, text) {

    if (textMeshes[index] != undefined) {
        groups[index].remove(textMeshes[index]);
    }

    if (!text) return;
    textMeshes[index] = createText(text, textMeshes[index]);
    groups[index].add(textMeshes[index]);

}