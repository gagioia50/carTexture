import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import * as UTI from './utils.js';

const textureLoader = new THREE.TextureLoader();
const my_height = textureLoader.load('height.png');
const my_texture = textureLoader.load('texture.jpg');
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

// create terrain material and mesh
const material = new THREE.MeshStandardMaterial({ 
  map: my_texture,
  displacementMap: my_height,
  displacementScale: 5,
  color:'darkgrey',
  vertexColors: true,
  wireframe: false,
});
const geometry = new THREE.PlaneGeometry(chunkSize, chunkSize, 100, 100);
geometry.rotateX(-Math.PI / 2);
const terrain = new THREE.Mesh(geometry, material);
scene.add(terrain);





const imageLoader = new THREE.ImageLoader();
imageLoader.load('height.png', function (image) {
    
    // Crea un canvas temporaneo e disegna l'immagine
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    
    // Ottieni l'array dei pixel (formato RGBA: 4 valori consecutivi per pixel)
    const imgData = context.getImageData(0, 0, image.width, image.height).data;

    // Ora puoi calcolare le altezze dei vertici (passo 2...)
    applyHeightsAndColorsToGeometry(geometry, imgData, image.width, image.height);
});

function applyHeightsAndColorsToGeometry(geometry, imgData, textureWidth, textureHeight) {
		const positionAttribute = geometry.getAttribute('position');
		const uvAttribute = geometry.getAttribute('uv');
		
		// const displacementScale = 10; 
		const heightThreshold = 0.1; // La soglia oltre la quale il vertice cambia colore

		// Crea un array per contenere i dati RGB di ogni vertice (3 componenti per vertice: R, G, B)
		const colors = new Float32Array(positionAttribute.count * 3);

		// Definiamo i due colori usando l'oggetto Color di Three.js
		const lowColor = new THREE.Color('#000000');  // Bianco per le zone basse
		const highColor = new THREE.Color('lightgrey'); // Rosso per le zone sopra la soglia

		for (let i = 0; i < positionAttribute.count; i++) {
			// 1. Calcolo dell'altezza (identico al passo precedente)
			const u = uvAttribute.getX(i);
			const v = uvAttribute.getY(i);
			const x = Math.min(Math.floor(u * textureWidth), textureWidth - 1);
			const y = Math.min(Math.floor((1 - v) * textureHeight), textureHeight - 1); 
			const pixelIndex = (y * textureWidth + x) * 4;
			
			const height = (imgData[pixelIndex] / 255);
			
			// Applichiamo l'altezza sull'asse Z (o Y a seconda dell'orientamento)
			positionAttribute.setY(i, height);

			// 2. Controllo della soglia di altezza e assegnazione del colore
			if (height < heightThreshold) {
				// 3. Inserisci i componenti R, G, B nell'array dei colori alla posizione corretta
        colors[i * 3]     = lowColor.r; // Canale Rosso
        colors[i * 3 + 1] = lowColor.g; // Canale Verde
        colors[i * 3 + 2] = lowColor.b; // Canale Blu
			} else {
        colors[i * 3]     = highColor.r; // Canale Rosso
        colors[i * 3 + 1] = highColor.g; // Canale Verde
        colors[i * 3 + 2] = highColor.b; // Canale Blu
			} 

			// 3. Inserisci i componenti R, G, B nell'array dei colori alla posizione corretta
			// colors[i * 3]     = lowColor.r; // Canale Rosso
			// colors[i * 3 + 1] = lowColor.g; // Canale Verde
			// colors[i * 3 + 2] = lowColor.b; // Canale Blu
		}

		// Aggiungi l'attributo 'color' alla geometria
		geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

		// Comunica a Three.js i cambiamenti
		positionAttribute.needsUpdate = true;
		geometry.getAttribute('color').needsUpdate = true;
		geometry.computeVertexNormals();
}

const animate = (timestamp) => {
  physicsWorld.fixedStep();
  cannonDebugger.update();
  stats.update();
  controls.update();
  helper.update();
  helper2.update();
  helper3.update();

  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
};
animate();

const gui = new GUI();
gui.add(material, 'wireframe', false, true);
gui.add(material, 'displacementScale', 0, 10);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}, false);
