import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import * as UTI from './utils.js';
import { ThirdPersonCamera } from './utils.js';

export let scale_height = 5;
const disp_file_name = 'disp_prova_4.png';
const texture_file_name = 'texture.jpg';

const textureLoader = new THREE.TextureLoader();
const my_height = textureLoader.load(disp_file_name);
const my_texture = textureLoader.load(texture_file_name);
const chunkSize = 200;



const scene = UTI.getScene();
const camera = UTI.getCamera();
const canvas = document.getElementById('myCanvas');
const renderer = UTI.getRenderer(canvas);
const { helper, helper2, helper3 } = UTI.setEnvironment(scene);

const controls = new OrbitControls(camera, renderer.domElement);

const stats = Stats();
document.body.appendChild(stats.dom);
stats.dom.style.position = 'absolute';
stats.dom.style.top = '5px';
stats.dom.style.bottom = 'auto';
stats.dom.style.right = '5px';
stats.dom.style.left = 'auto'; // Rimuove il left di default

const physicsWorld = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0),
});

const cannonDebugger = new CannonDebugger(scene, physicsWorld, {
  color: 0xff0000,
});

// create ground body for physics
const groundBody = new CANNON.Body({mass: 0});
physicsWorld.addBody(groundBody);

// create terrain material and mesh
const material = new THREE.MeshStandardMaterial({ 
  map: my_texture,
  displacementMap: my_height,
  displacementScale: 0,
  color:'#8f8c87',
  vertexColors: true,
  wireframe: false,
});
const geometry = new THREE.PlaneGeometry(chunkSize, chunkSize, 100, 100);
geometry.rotateX(-Math.PI / 2);
// geometry.rotateY(Math.PI / 2);
const terrain = new THREE.Mesh(geometry, material);
terrain.receiveShadow = true;
terrain.castShadow = true;
scene.add(terrain);
UTI.updateTerrainAndGroundBody(geometry, groundBody, terrain, disp_file_name);

// create car mesh and wheel meshes
const result = await UTI.getCarMeshes(scene);
let carMesh = result[0];
let listWheelMeshes = result[1];

// create car body and vehicle
const carBody = new CANNON.Body({
  mass: 5,
  position: new CANNON.Vec3(1, 6, 0.1),
  shape: new CANNON.Box(new CANNON.Vec3(2.4, 0.7, 1)),
  restitution: 0.1, // add restitution for bounciness
  friction: 0.5, // add friction for better grip
});
carBody.quaternion.setFromEuler(0, Math.PI / 2, 0);
const vehicle = new CANNON.RigidVehicle({
  chassisBody: carBody,
});
const wheelBodies = UTI.getWheelBodies(vehicle);
vehicle.addToWorld(physicsWorld);

const button = document.querySelector('.floating-btn');

const thirdPersonCamera = new ThirdPersonCamera(camera, carMesh);

const options = {
  currentView: 'Third Person',
};

const timer = new THREE.Timer();
timer.connect( document ); 
let elapsedTime = 0;
let prevTimestamp = 0;

let lap = -1;
let last_z = 0;
const animate = (timestamp) => {
  const fixedTimeStep = 1 / 60; // 60Hz
  physicsWorld.step(fixedTimeStep);
  // cannonDebugger.update();
  stats.update();
  timer.update(timestamp);
  elapsedTime = timer.getElapsed();


  last_z = carMesh.position.z;

  carMesh.position.copy(carBody.position);
  carMesh.quaternion.copy(carBody.quaternion);
  for (let i = 0; i < listWheelMeshes.length; i++) {
    listWheelMeshes[i].position.copy(wheelBodies[i].position);
    listWheelMeshes[i].quaternion.copy(wheelBodies[i].quaternion);
  }
  
  let current_z = carMesh.position.z;
  if (current_z < 0 && last_z > 0) {
    lap += 1;
    if (lap === 0) {
      prevTimestamp = elapsedTime;
    }
    document.getElementById('carData').value += `Lap: ${lap}, Time: ${(elapsedTime-prevTimestamp).toFixed(2)}\n`;
    prevTimestamp = elapsedTime;
  }
  last_z = current_z;


  if (options.currentView === 'Orbit Controls') {
    controls.update();
  }
   if (options.currentView === 'Third Person') {  
    thirdPersonCamera.update();
  } 
  
  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
};
animate();

const gui = new GUI({ autoPlace: false });
gui.domElement.style.position = 'absolute';
gui.domElement.style.top = '60px';
gui.domElement.style.right = '5px';
document.body.appendChild(gui.domElement);

gui.add(options, 'currentView', ['Orbit Controls', 'Third Person'])
   .name('Tipo Camera')   .onChange(value => {
        options.currentView = value;
   });
gui.add(material, 'wireframe', false, true);
gui.add({ value: scale_height }, 'value', 0, 50).name('Scale Height').onChange((value) => {
  scale_height = value;
  UTI.updateTerrainAndGroundBody(geometry, groundBody, terrain, disp_file_name);
});


button.addEventListener('mousemove', (event) => {
  // Ottiene le dimensioni del pulsante e la sua posizione nella pagina
  const rect = event.currentTarget.getBoundingClientRect();
  
  // Calcola il raggio del cerchio
  const radius = rect.width / 2;
  
  // Calcola le coordinate X e Y rispetto al centro del cerchio (0,0)
  const x = (event.clientX - rect.left - radius)/radius;
  const y = -(event.clientY - rect.top - radius)/radius;

  const maxSteerVal = 0.4;
  const maxForce = 12;

  vehicle.setSteeringValue(-maxSteerVal*x, 0);
  vehicle.setSteeringValue(-maxSteerVal*x, 1);

  vehicle.setWheelForce(-maxForce*y, 2);
  vehicle.setWheelForce(-maxForce*y, 3);
});  

button.addEventListener('mouseleave', (event) => {
  vehicle.setSteeringValue(0, 0);
  vehicle.setSteeringValue(0, 1);

  vehicle.setWheelForce(0, 2);
  vehicle.setWheelForce(0, 3);
});  



document.addEventListener('keydown', (event) => {
  const maxSteerVal = 0.4;
  const maxForce = 6;

  switch (event.key) {
    case 'ArrowUp':
    case 'w':
      vehicle.setWheelForce(-maxForce, 0);
      vehicle.setWheelForce(-maxForce, 1);
      break;

    case 'ArrowDown':
    case 's':
      vehicle.setWheelForce(maxForce/2, 0);
      vehicle.setWheelForce(maxForce/2, 1);
      break;

    case 'ArrowLeft':
    case 'a':
      vehicle.setSteeringValue(maxSteerVal, 0);
      vehicle.setSteeringValue(maxSteerVal, 1);
      break;

    case 'ArrowRight':
    case 'd':
      vehicle.setSteeringValue(-maxSteerVal, 0);
      vehicle.setSteeringValue(-maxSteerVal, 1);
      break;

  }
})

document.addEventListener('keyup', (event) => {
  switch (event.key) {
    case 'w':
    case 'ArrowUp':
      vehicle.setWheelForce(0, 0);
      vehicle.setWheelForce(0, 1);
      break;

    case 's':
    case 'ArrowDown':
      vehicle.setWheelForce(0, 0);
      vehicle.setWheelForce(0, 1);
      break;

    case 'a':
    case 'ArrowLeft':
      vehicle.setSteeringValue(0, 0);
      vehicle.setSteeringValue(0, 1);
      break;

    case 'd':
    case 'ArrowRight':
      vehicle.setSteeringValue(0, 0);
      vehicle.setSteeringValue(0, 1);
      break;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}, false);
