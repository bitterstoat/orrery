// constants
const fps = 60; // max FPS
const precessFreq = 0.01; // update orbital element drift once per year
const rates = [ -1/20/fps, -1/100/fps, -100/daysPerCent/fps, -20/daysPerCent/fps, -1/daysPerCent/fps, -1/24/daysPerCent/fps, -1/86400/daysPerCent/fps, 0, 1/86400/daysPerCent/fps, 1/24/daysPerCent/fps, 1/daysPerCent/fps, 20/daysPerCent/fps, 100/daysPerCent/fps, 1/100/fps, 1/20/fps]; // centuries per frame
const rateDesc = [ "-5 years/sec", "-1 year/sec", "-100 days/sec", "-20 days/sec", "-1 day/sec", "-1 hour/sec", "Reversed Time", "Paused", "Realtime", "1 hour/sec", "1 day/sec", "20 days/sec", "100 days/sec", "1 year/sec", "5 years/sec"];
const pointCount = 360;
const materials = {};
const pauseRate = 7;
const initialPoint = 0.01;
const initialFOV = 60;
const exagScale = 500000;
const initMinDistance = 1;
const initMaxDistance = 100;
const gratRadius = 1000;

// variables
let earthID, centerX, centerY
let starfieldObj = new THREE.Object3D();
let graticule = new THREE.Line();
let lastLoop = Date.now();
let fpsBuffer = [];
let avgFPS = 0;
let orbitPoints = pointCount;
let speed = 8;
let lastSpeed = speed;
let rate = rates[speed];
let datasets = 0;
let flags = 0;
let clickedLabel = "";
let clickedPlanet = {};
let lastClickedPlanet = {};
let system = []; // the solar system as an associative array
let majorBodies = []; // orbits with temporal drift
let moons = []; // need late update with planet references
let paths = []; // orbital paths
let planetMoons = []; // moons of the the currently focused planet
let contents = []; // search field list
let ephTime = MJDToEphTime(unixToMJD(Date.now())); // get current time in fractional centuries since J2000
let following = false;
let lastFollow = new THREE.Vector3();
let planetScale = {f: 1.0};
let latitude = 51.48; // Default is Greenwich
let longitude = 0;
let mousePos = new THREE.Vector3(0, 0, 1);
let tempLabels = [];
let gratLabels = [];
let showSplash = false;

navigator.geolocation.getCurrentPosition(getLatLong); // request user's coordinates

// three.js setup
const scene = new THREE.Scene();
const clock = new THREE.Clock();

const camera = new THREE.PerspectiveCamera( initialFOV, window.innerWidth/window.innerHeight, 0.000001, 1000 );
const renderer = new THREE.WebGLRenderer( {
    antialias: true, 
    logarithmicDepthBuffer: true,
    toneMapping: THREE.ACESFilmicToneMapping,
});

// standard materials
const loader = new THREE.TextureLoader();
const pathMaterials = [ // path materials
    new THREE.LineBasicMaterial({ color: 0x0033ff, linewidth: 1, transparent:true, opacity: 0.5 }),
    new THREE.LineBasicMaterial({ color: 0x0033ff, linewidth: 1, transparent:true, opacity: 0.3 }),
    new THREE.LineBasicMaterial({ color: 0x0033ff, linewidth: 1, transparent:true, opacity: 0.25 }),
    new THREE.LineBasicMaterial({ color: 0x0033ff, linewidth: 1, transparent:true, opacity: 0.2 }),
    new THREE.LineBasicMaterial({ color: 0x0033ff, linewidth: 1, transparent:true, opacity: 0.1 })
];
const selectedPathMat = new THREE.LineBasicMaterial({ color: 0x3366ff, linewidth: 1.5, transparent:true, opacity: 0.7 });
const defaultMaterial = new THREE.MeshStandardMaterial({ map: loader.load('data/1k_eris_fictional.jpg')});
const pointMaterial = new THREE.PointsMaterial( { color: 0xffffff, alphaMap: loader.load('data/disc.png'), size: initialPoint, transparent: true } );
const darkMaterial = new THREE.MeshBasicMaterial( { color: 0x000000 } );
const transparentMaterial = new THREE.LineBasicMaterial( { transparent: true, opacity: 0 } );

const ENTIRE_SCENE = 0, BLOOM_SCENE = 1;
const bloomLayer = new THREE.Layers();
bloomLayer.set( BLOOM_SCENE );

const renderScene = new THREE.RenderPass( scene, camera );
const bloomPass = new THREE.UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
bloomPass.threshold = 0.15;
bloomPass.strength = 7;
bloomPass.radius = 0;

const bloomComposer = new THREE.EffectComposer( renderer );
bloomComposer.renderToScreen = false;
bloomComposer.addPass( renderScene );
bloomComposer.addPass( bloomPass );

const finalPass = new THREE.ShaderPass(
    new THREE.ShaderMaterial( {
        uniforms: {
            baseTexture: { value: null },
            bloomTexture: { value: bloomComposer.renderTarget2.texture }
        },
        vertexShader: document.getElementById( 'vertexshader' ).textContent,
        fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
        defines: {}
    } ), "baseTexture"
);
finalPass.needsSwap = true;

const finalComposer = new THREE.EffectComposer( renderer );
finalComposer.addPass( renderScene );
finalComposer.addPass( finalPass );

// backdrop and lighting
const ambient = new THREE.AmbientLight( 0x101022 );
const sunlight = new THREE.PointLight( 0xffffff, 1 );

scene.add(sunlight, ambient);

textureEquirec = loader.load( 'data/starmap_2020_8k.jpg' );
textureEquirec.mapping = THREE.EquirectangularReflectionMapping;
textureEquirec.encoding = THREE.sRGBEncoding;
scene.background = textureEquirec;
const geometry = new THREE.IcosahedronGeometry( 1000, 2 );
sphereMaterial = new THREE.MeshBasicMaterial( { envMap: textureEquirec } );
sphereMesh = new THREE.Mesh( geometry, sphereMaterial );
scene.add( sphereMesh );

// make sun
const sunGeometry = new THREE.SphereGeometry( 0.1, 32, 32 );
const sunMaterial = new THREE.MeshBasicMaterial({ map: loader.load('data/1k_sun.jpg')});
const sun = new THREE.Mesh( sunGeometry, sunMaterial );
sun.name = "Sol";
sun.glow = true;
reAxis(sun, 63.87 * toRad, 286.13 * toRad);
sun.thetaDot = 360 * daysPerCent / -25.05 * toRad; // sun rotation rotate
scene.add( sun );

// camera controls
const controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.enableDamping = true;
controls.dampingFactor = 0.02;
controls.target = new THREE.Vector3();
controls.screenSpacePanning = false;
controls.minDistance = initMinDistance;
controls.maxDistance = initMaxDistance;
controls.maxPolarAngle = Math.PI;

camStart = new THREE.Vector3(0, -8, 0).applyAxisAngle(celestialXAxis, eclInclination);
camera.position.y = camStart.y;
camera.position.z = camStart.z;
controls.update();