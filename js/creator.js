function createParalellepipedWithPhysics(sx, sy, sz, mass, pos, quat, material, name) {
    const object = new Physijs.BoxMesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1), material, mass);
    object.position.copy(pos);
    object.rotation.setFromQuaternion(quat);
    object.name = name;
    scene.add(object);
    object.receiveShadow = true;
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