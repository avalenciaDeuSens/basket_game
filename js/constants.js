const clock = new THREE.Clock();
const textureLoader = new THREE.TextureLoader();
const ballMaterial = new Physijs.createMaterial(new THREE.MeshPhongMaterial({
    map: textureLoader.load('images/ball.png'),
    normalMap: textureLoader.load('images/ball_normal.png')
}), 0.2, 0.9);
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
const groundMaterial = Physijs.createMaterial(new THREE.MeshPhongMaterial({ color: 0xFFFFFF }), 0.6, 0.6);
const torusMaterial = new THREE.MeshPhongMaterial({ color: 0xfe571b });

const clickMouseCoords = new THREE.Vector2();
const endClickMouseCoords = new THREE.Vector2();

const quat = new THREE.Quaternion();
const pos = new THREE.Vector3(0, 1.8, 2.5);
const initBallPos = new THREE.Vector3(0, 1.2, 0);
const torusPosition = new THREE.Vector3(0, 2, -2.3625 + .45 / 2);
const G = new THREE.Vector3(0, -20, 0);

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