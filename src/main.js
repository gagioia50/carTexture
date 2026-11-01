import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import * as UTI from './utils.js';

export let scale_height = 5;

const textureLoader = new THREE.TextureLoader();
const my_height = textureLoader.load('height.png');
const my_texture = textureLoader.load('texture.jpg');
const asphalt = textureLoader.load('asphalt_texture.jpg');
const chunkSize = 200;

const scene = UTI.getScene();
const camera = UTI.getCamera();
const canvas = document.getElementById('myCanvas');
const renderer = UTI.getRenderer(canvas);
const { helper, helper2, helper3 } = UTI.setEnvironment(scene);

const controls = new OrbitControls(camera, renderer.domElement);

const stats = Stats();
document.body.appendChild(stats.dom);

const physicsWorld = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0),
});

const cannonDebugger = new CannonDebugger(scene, physicsWorld, {
  color: 0xff0000,
});

// create ground body for physics
const groundBody = new CANNON.Body({mass: 0});
// UTI.updateGroundBody(geometry, groundBody, terrain);
physicsWorld.addBody(groundBody);

// create terrain material and mesh
const material = new THREE.MeshStandardMaterial({ 
  map: my_texture,
  displacementMap: my_height,
  displacementScale: 0,
  color:'darkgray',
  vertexColors: true,
  wireframe: false,
});
const geometry = new THREE.PlaneGeometry(chunkSize, chunkSize, 100, 100);
geometry.rotateX(-Math.PI / 2);
const terrain = new THREE.Mesh(geometry, material);
terrain.receiveShadow = true;
terrain.castShadow = true;
scene.add(terrain);
UTI.updateTerrainAndGroundBody(geometry, groundBody, terrain);

const animate = () => {
  physicsWorld.fixedStep();
  cannonDebugger.update();
  stats.update();
  controls.update();
  
  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
};
animate();

const gui = new GUI();
gui.add(material, 'wireframe', false, true);
gui.add({ value: scale_height }, 'value', 0, 10).name('Scale Height').onChange((value) => {
  scale_height = value;
  UTI.updateTerrainAndGroundBody(geometry, groundBody, terrain);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}, false);
