import * as THREE from 'three';
import * as CANNON from 'cannon-es';

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
    pointLight2.position.set(-50, 20, -100);
    scene.add(pointLight2);

    const pointLight3 = new THREE.DirectionalLight('white', 4);
    pointLight3.position.set(-100, 20, 100);
    scene.add(pointLight3);
    
    const axesHelper = new THREE.AxesHelper(8);
    scene.add(axesHelper);

    const helper = new THREE.PointLightHelper(pointLight, 5); // 5 is the sphere size
    scene.add(helper);
    const helper2 = new THREE.PointLightHelper(pointLight2, 5);
    scene.add(helper2);
    
    const helper3 = new THREE.PointLightHelper(pointLight3, 5);
    scene.add(helper3);
    
    return { helper, helper2, helper3 };
    
}

export function updateGeometryAndGroundBody(geometry, params, noise, groundBody, terrain) {
  const position = geometry.attributes.position;
  const { amplitude = 1, frequency } = params;
  const {x: fx, z: fz} = frequency;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    
    let y = noise(x * fx * 0.01, z * fz * 0.01) * amplitude;
    if (params.octaves >=2 ) {
      y += noise(x * fx * 0.01 * 2, z * fz * 0.01 * 2) * amplitude * 0.5;
    }

    if (params.octaves >=3 ) {
      y += noise(x * fx * 0.01 * 4, z * fz * 0.01 * 4) * amplitude * 0.25;
    }
    position.setY(i, y);
  }
  geometry.computeVertexNormals();
  position.needsUpdate = true;

  // create Cannon Trimesh for physics
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
        this._idealOffset = new THREE.Vector3(-15, 5, 1);
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
    update(timeElapsed) {
        const targetIdealPosition = this._CalculateIdealOffset();
        const targetIdealLookAt = this._CalculateIdealLookAt();

        // Coefficiente di reattività (più è basso, più la camera è "morbida")
        // La formula assicura che il movimento sia indipendente dal frame rate (FPS)
        // const t = 1.0 - Math.exp(-4.0 * timeElapsed);

        // Interpola linearmente dalla posizione attuale a quella ideale
        this._currentPosition.lerp(targetIdealPosition, 0.02);
        this._currentLookAt.lerp(targetIdealLookAt, 0.02);

        // Aggiorna la telecamera di Three.js
        this._camera.position.copy(this._currentPosition);
        this._camera.lookAt(this._currentLookAt);

    }
}

export { ThirdPersonCamera };
