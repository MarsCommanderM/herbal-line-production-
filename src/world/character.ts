import * as THREE from 'three';

export interface CharacterController {
  mesh: THREE.Group;
  camera: THREE.PerspectiveCamera;
  update: (delta: number) => void;
  setTargetPosition: (pos: THREE.Vector3) => void;
}

export function createThirdPersonCharacter(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): CharacterController {
  const mesh = new THREE.Group();
  mesh.name = 'player-character';

  // Simple but readable third-person body (capsule-like + head)
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#3d5a80', roughness: 0.6, metalness: 0.1 });
  const skinMat = new THREE.MeshStandardMaterial({ color: '#e0b090', roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.9, 6, 12), bodyMat);
  body.position.y = 0.85;
  body.castShadow = true;
  mesh.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), skinMat);
  head.position.y = 1.65;
  head.castShadow = true;
  mesh.add(head);

  // Arms for interaction readability
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.45, 4, 8), bodyMat);
  armL.position.set(-0.42, 1.1, 0);
  armL.rotation.z = 0.3;
  mesh.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.42;
  armR.rotation.z = -0.3;
  mesh.add(armR);

  mesh.position.set(0, 0, 6);
  scene.add(mesh);

  const keys = { w: false, a: false, s: false, d: false, shift: false };
  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3();
  let yaw = 0;

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

  // Mouse look (pointer lock optional, free mouse for now with drag)
  let isDragging = false;
  let prevX = 0;
  window.addEventListener('mousedown', (e) => {
    if (e.button === 2 || e.button === 0) {
      isDragging = true;
      prevX = e.clientX;
    }
  });
  window.addEventListener('mouseup', () => { isDragging = false; });
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - prevX;
    prevX = e.clientX;
    yaw -= dx * 0.004;
    mesh.rotation.y = yaw;
  });

  const speed = 4.5;
  const runMul = 1.8;

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

    // Third-person camera follow
    const camOffset = new THREE.Vector3(0, 2.2, 5.5);
    camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const desired = mesh.position.clone().add(camOffset);
    camera.position.lerp(desired, 1 - Math.exp(-6 * delta));
    camera.lookAt(mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0)));
  }

  return {
    mesh,
    camera,
    update,
    setTargetPosition: (pos) => mesh.position.copy(pos),
  };
}
