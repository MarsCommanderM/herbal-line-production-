import * as THREE from 'three';

export interface CharacterController {
  mesh: THREE.Group;
  camera: THREE.PerspectiveCamera;
  update: (delta: number) => void;
  setTargetPosition: (pos: THREE.Vector3) => void;
  getPosition: () => THREE.Vector3;
}

export function createThirdPersonCharacter(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): CharacterController {
  const mesh = new THREE.Group();
  mesh.name = 'player-character';

  const bodyMat = new THREE.MeshStandardMaterial({ color: '#2c3e50', roughness: 0.55, metalness: 0.08 });
  const skinMat = new THREE.MeshStandardMaterial({ color: '#d4a574', roughness: 0.65 });
  const accentMat = new THREE.MeshStandardMaterial({ color: '#1a252f', roughness: 0.7 });

  // Torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.7, 8, 16), bodyMat);
  torso.position.y = 0.95;
  torso.castShadow = true;
  mesh.add(torso);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), skinMat);
  head.position.y = 1.62;
  head.castShadow = true;
  mesh.add(head);

  // Shoulders / arms for better silhouette
  const armGeo = new THREE.CapsuleGeometry(0.07, 0.42, 4, 8);
  const armL = new THREE.Mesh(armGeo, bodyMat);
  armL.position.set(-0.4, 1.15, 0);
  armL.rotation.z = 0.25;
  armL.castShadow = true;
  mesh.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.4;
  armR.rotation.z = -0.25;
  mesh.add(armR);

  // Legs
  const legGeo = new THREE.CapsuleGeometry(0.09, 0.5, 4, 8);
  const legL = new THREE.Mesh(legGeo, accentMat);
  legL.position.set(-0.14, 0.35, 0);
  legL.castShadow = true;
  mesh.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.14;
  mesh.add(legR);

  mesh.position.set(0, 0, 5.5);
  scene.add(mesh);

  const keys = { w: false, a: false, s: false, d: false, shift: false };
  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3();
  let yaw = 0;
  let isDragging = false;
  let prevX = 0;

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyW') keys.w = true;
    if (e.code === 'KeyA') keys.a = true;
    if (e.code === 'KeyS') keys.s = true;
    if (e.code === 'KeyD') keys.d = true;
    if (e.code === 'ShiftLeft') keys.shift = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW') keys.w = false;
    if (e.code === 'KeyA') keys.a = false;
    if (e.code === 'KeyS') keys.s = false;
    if (e.code === 'KeyD') keys.d = false;
    if (e.code === 'ShiftLeft') keys.shift = false;
  });

  window.addEventListener('mousedown', (e) => {
    if (e.button === 0 || e.button === 2) {
      isDragging = true;
      prevX = e.clientX;
    }
  });
  window.addEventListener('mouseup', () => { isDragging = false; });
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - prevX;
    prevX = e.clientX;
    yaw -= dx * 0.005;
    mesh.rotation.y = yaw;
  });
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  const speed = 5.2;
  const runMul = 1.7;

  function update(delta: number): void {
    direction.set(0, 0, 0);
    if (keys.w) direction.z -= 1;
    if (keys.s) direction.z += 1;
    if (keys.a) direction.x -= 1;
    if (keys.d) direction.x += 1;
    if (direction.lengthSq() > 0) direction.normalize();

    const moveSpeed = speed * (keys.shift ? runMul : 1) * delta;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    velocity.copy(forward).multiplyScalar(-direction.z).add(right.multiplyScalar(direction.x)).multiplyScalar(moveSpeed);
    mesh.position.add(velocity);

    // Smooth third-person camera
    const camOffset = new THREE.Vector3(0, 2.4, 5.8);
    camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const desired = mesh.position.clone().add(camOffset);
    camera.position.lerp(desired, 1 - Math.exp(-5 * delta));
    camera.lookAt(mesh.position.clone().add(new THREE.Vector3(0, 1.45, 0)));
  }

  return {
    mesh,
    camera,
    update,
    setTargetPosition: (pos) => mesh.position.copy(pos),
    getPosition: () => mesh.position.clone(),
  };
}
