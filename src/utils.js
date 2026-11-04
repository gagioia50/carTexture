import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { scale_height } from './main.js';


// texture loader
const loader = new THREE.TextureLoader();

export function getScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x333333 );
    return scene;
}

export function getCamera() {
    const camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        1,
        1000
    );
    camera.position.set(-50, 40, 0);
    camera.lookAt(new THREE.Vector3(2, 1, 0));
    return camera;
}

export function getRenderer(canvas) {
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    return renderer;
}

export function setEnvironment(scene) {
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 3);
    scene.add(ambientLight);
    
    const pointLight = new THREE.DirectionalLight('white', 4);
    pointLight.position.set(15, 20, 0);
    scene.add(pointLight);
    
    const pointLight2 = new THREE.DirectionalLight('white', 4);
    pointLight2.position.set(-70, 20, -85);
    scene.add(pointLight2);

    const pointLight3 = new THREE.DirectionalLight('white', 4);
    pointLight3.position.set(-70, 20, 30);
    scene.add(pointLight3);
    
    const axesHelper = new THREE.AxesHelper(8);
    scene.add(axesHelper);

    // const helper = new THREE.PointLightHelper(pointLight, 5); // 5 is the sphere size
    // scene.add(helper);
    // const helper2 = new THREE.PointLightHelper(pointLight2, 5);
    // scene.add(helper2);
    
    // const helper3 = new THREE.PointLightHelper(pointLight3, 5);
    // scene.add(helper3);
    
    return {};
    
}

export async function getCarMeshes(scene) {
    // --- Load the car model ---
    let listWheelMeshes = [];
    let chassisMesh = new THREE.Object3D()
    let wheelFLMesh = new THREE.Object3D()
    let wheelFRMesh = new THREE.Object3D()
    let wheelBLMesh = new THREE.Object3D()
    let wheelBRMesh = new THREE.Object3D()
    const loader = new GLTFLoader();
    await loader.loadAsync('/myTotalCar_freeWheel.glb').then((gltf) => {
        const carModel = gltf.scene;
        scene.add(carModel);

        chassisMesh = carModel.getObjectByName('BodyCar');
        let chassisMeshMat = carModel.children[0].children[0].material;
        chassisMeshMat.metalness = 0.9;
        chassisMeshMat.roughness = 0.0;
        chassisMesh.material = chassisMeshMat;

        wheelFLMesh = carModel.getObjectByName('Wheel1');
        wheelFRMesh = carModel.getObjectByName('Wheel2');
        wheelBLMesh = carModel.getObjectByName('Wheel3');
        wheelBRMesh = carModel.getObjectByName('Wheel4');

        listWheelMeshes.push(wheelFLMesh, wheelFRMesh, wheelBLMesh, wheelBRMesh);
    });

    return [chassisMesh, listWheelMeshes];
}

export function getWheelBodies(vehicle) {
    
  // create four wheels
    const mass = 1;
    const axisWidth = 4 
    const wheelShape = new CANNON.Sphere(0.3);
    const wheelMaterial = new CANNON.Material('wheel');
    const down = new CANNON.Vec3(0, -1, 0);
    
    const wheelBody1 = new CANNON.Body({ mass, material: wheelMaterial });
    wheelBody1.addShape(wheelShape);
    wheelBody1.angularDamping = 0.8;
    vehicle.addWheel({
      body: wheelBody1,
      position: new CANNON.Vec3(1.28, -0.48, -axisWidth/4.3),
      axis: new CANNON.Vec3(0, 0, 1),
      direction: down,
    });
    
    const wheelBody2 = new CANNON.Body({ mass, material: wheelMaterial });
    wheelBody2.addShape(wheelShape);
    wheelBody2.angularDamping = 0.8;
    vehicle.addWheel({
      body: wheelBody2,
      position: new CANNON.Vec3(1.28, -0.48, axisWidth/4.5),
      axis: new CANNON.Vec3(0, 0, 1),
      direction: down,
    });
    
    const wheelBody3 = new CANNON.Body({ mass, material: wheelMaterial });
    wheelBody3.addShape(wheelShape);
    wheelBody3.angularDamping = 0.8;
    vehicle.addWheel({
      body: wheelBody3,
      position: new CANNON.Vec3(-1.25, -0.48, -axisWidth/4.3),
      axis: new CANNON.Vec3(0, 0, 1),
      direction: down,
    });
    
    const wheelBody4 = new CANNON.Body({ mass, material: wheelMaterial });
    wheelBody4.addShape(wheelShape);
    wheelBody4.angularDamping = 0.8;
    vehicle.addWheel({
      body: wheelBody4,
      position: new CANNON.Vec3(-1.25, -0.48, axisWidth/4.4),
      axis: new CANNON.Vec3(0, 0, 1),
      direction: down,
    });

    return [wheelBody1, wheelBody2, wheelBody3, wheelBody4];
}

export function updateTerrainAndGroundBody(geometry, groundBody, terrain, heightmap_name) {
  const imageLoader = new THREE.ImageLoader();
  imageLoader.load(heightmap_name, function (image) {
    // Crea un canvas temporaneo e disegna l'immagine
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    
    // Ottieni l'array dei pixel (formato RGBA: 4 valori consecutivi per pixel)
    const imgData = context.getImageData(0, 0, image.width, image.height).data;

    // Ora puoi calcolare le altezze dei vertici (passo 2...)
    applyHeightsAndColorsToGeometry(geometry, imgData, image.width, image.height, groundBody, terrain);
  });

}

// Load height map and apply color to geometry based on height
function applyHeightsAndColorsToGeometry(geometry, imgData, textureWidth, textureHeight, groundBody, terrain) {
  const positionAttribute = geometry.getAttribute('position');
  const uvAttribute = geometry.getAttribute('uv');
  
  // const displacementScale = 10; 
  const heightThreshold = 0.1; // La soglia oltre la quale il vertice cambia colore

  // Crea un array per contenere i dati RGB di ogni vertice (3 componenti per vertice: R, G, B)
  const colors = new Float32Array(positionAttribute.count * 3);

  // Definiamo i due colori usando l'oggetto Color di Three.js
  const lowColor = new THREE.Color('black'); 
  const highColor = new THREE.Color('lightgrey'); 

  for (let i = 0; i < positionAttribute.count; i++) {
    // 1. Calcolo dell'altezza (identico al passo precedente)
    const u = uvAttribute.getX(i);
    const v = uvAttribute.getY(i);
    const x = Math.min(Math.floor(u * textureWidth), textureWidth - 1);
    const y = Math.min(Math.floor((1 - v) * textureHeight), textureHeight - 1); 
    const pixelIndex = (y * textureWidth + x) * 4;
    
    const height = (imgData[pixelIndex] / 255);
      
    // Applichiamo l'altezza sull'asse Z (o Y a seconda dell'orientamento)
    
    positionAttribute.setY(i, height*scale_height); // Applica la scala di altezza

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
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.attributes.color.needsUpdate = true;

  // Aggiungi l'attributo 'color' alla geometria
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Comunica a Three.js i cambiamenti
  positionAttribute.needsUpdate = true;
  geometry.getAttribute('color').needsUpdate = true;
  geometry.computeVertexNormals();
  positionAttribute.needsUpdate = true;

  createTrimesh(geometry, groundBody, terrain);
}

function createTrimesh(geometry, groundBody, terrain) {
    const vertices = geometry.attributes.position.array;
    const indices = geometry.index.array;

    const trimeshShape = new CANNON.Trimesh(vertices, indices);
    while (groundBody.shapes.length > 0) {
        groundBody.removeShape(groundBody.shapes[0]);
    }
    groundBody.addShape(trimeshShape);
    groundBody.position.copy(terrain.position);
    groundBody.quaternion.copy(terrain.quaternion);
}

class ThirdPersonCamera {
    constructor(camera, target) {
        this._camera = camera;
        this._target = target; // Il mesh del tuo giocatore/oggetto

        // Offset ideale rispetto alla posizione del giocatore (Dietro, Sopra, Di lato)
        this._idealOffset = new THREE.Vector3(-5, 5, 1);
        // Punto ideale dove guardare (Leggermente sopra la testa del giocatore)
        this._idealLookAt = new THREE.Vector3(5, 1, 1);

        // Vettori di stato correnti per rendere l'inseguimento fluido
        this._currentPosition = new THREE.Vector3();
        this._currentLookAt = new THREE.Vector3();
    }

    // Calcola la posizione globale ideale basandosi sulla rotazione del giocatore
    _CalculateIdealOffset() {
        const idealOffset = this._idealOffset.clone();
        // Applica la rotazione del target all'offset per mantenerlo sempre dietro
        idealOffset.applyQuaternion(this._target.quaternion);
        // Aggiunge la posizione globale del target
        idealOffset.add(this._target.position);
        return idealOffset;
    }

    // Calcola il punto ideale da guardare davanti al giocatore
    _CalculateIdealLookAt() {
        const idealLookAt = this._idealLookAt.clone();
        idealLookAt.applyQuaternion(this._target.quaternion);
        idealLookAt.add(this._target.position);
        return idealLookAt;
    }

    // Da chiamare all'interno del loop di rendering (requestAnimationFrame)
    update() {
        const targetIdealPosition = this._CalculateIdealOffset();
        const targetIdealLookAt = this._CalculateIdealLookAt();

        // Coefficiente di reattività (più è basso, più la camera è "morbida")
        // La formula assicura che il movimento sia indipendente dal frame rate (FPS)
        // const t = 1.0 - Math.exp(-4.0 * timeElapsed);

        // Interpola linearmente dalla posizione attuale a quella ideale
        this._currentPosition.lerp(targetIdealPosition, 0.05);
        this._currentLookAt.lerp(targetIdealLookAt, 0.05);

        // Aggiorna la telecamera di Three.js
        this._camera.position.copy(this._currentPosition);
        this._camera.lookAt(this._currentLookAt);

    }
}

export { ThirdPersonCamera };
