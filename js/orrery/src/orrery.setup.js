import * as Orrery from "./orrery.init.js";

// spatial constants
export const toRad = Math.PI/180
export const toDeg = 180/Math.PI;
export const celestialXAxis = new THREE.Vector3(1, 0, 0);
export const celestialZAxis = new THREE.Vector3(0, -1, 0);
export const eclInclination = 23.43928 * toRad + Math.PI; // inclination of the ecliptic relative to the celestial sphere
export const AU = 1.495978707e+11; // astronomical unit
export const gravConstant = 6.6743015e-11;
export const sunGravConstant = 1.32712440042e+20; // gravitational constant for heliocentric orbits
export const earthRadius = 6371000;
export const earthBary = 4670 / 388400; // Earth barycentric offset relative to Moon's semimajor axis
export const plutoBary = 2110 / 19600; // Pluto barycentric offset relative to Charon's semimajor axis

// temporal constants
export const daysPerCent = 36525.6363;
export const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const UnixTimeZeroInMJD = 40587; // UNIX time zero as Modified Julian Date
export const J2KInMJD = 51544.0; // Modified Julian Date of January 1, 2000
export const DayInMillis = 86400000; // miliseconds per day

// constants
export const fps = 60; // max FPS
export const rates = [ -1/20/fps, -1/100/fps, -100/daysPerCent/fps, -20/daysPerCent/fps, -1/daysPerCent/fps, -1/24/daysPerCent/fps, -1/86400/daysPerCent/fps, 0, 1/86400/daysPerCent/fps, 1/24/daysPerCent/fps, 1/daysPerCent/fps, 20/daysPerCent/fps, 100/daysPerCent/fps, 1/100/fps, 1/20/fps]; // centuries per frame
export const rateDesc = [ "-5 years/sec", "-1 year/sec", "-100 days/sec", "-20 days/sec", "-1 day/sec", "-1 hour/sec", "Reversed Time", "Paused", "Realtime", "1 hour/sec", "1 day/sec", "20 days/sec", "100 days/sec", "1 year/sec", "5 years/sec"];
export const pointCount = 180;
export const materials = {};
export const pauseRate = 7;
export const initialPoint = 0.01;
export const initialFOV = 60;
export const exagScale = 500000;
export const initMinDistance = 1;
export const initMaxDistance = 100;
export const system = []; // the solar system as an associative array
export const majorBodies = []; // bodies that scale on zoom
export const moons = []; // need late update with planet references
export const paths = []; // orbital paths
export const gratLabels = [];
export const precessing = []; // orbits with temporal drift
export const planetScale = {f: 1.0};
export const fpsBuffer = [];
export const planetMoons = []; // moons of the the currently focused planet
export const specialID = { earth:0, moon:0, pluto:0, charon:0 };
export const center = { x:0, y:0 }; // screen center
export const stateManager = { clickedLabel: "", clickedPlanet: {}, lastClickedPlanet: {}, mousePos: new THREE.Vector3(0, 0, 1), following: false, lastFollow: new THREE.Vector3(), hoverLabel: false, extraData: false };
export const groundPosition = { latitude: 51.48, longitude: 0, default: true }; // default location is Greenwich
export const timeManager = { ephTime: Orrery.MJDToEphTime(Orrery.unixToMJD(Date.now())), speed: 8, lastSpeed: 8, rate: rates[8], avgFPS: 0, parsedDate: 0 };
export const searchLists = { combined: [], planetNames: [], moonNames: [], asteroidNames: [], cometNames: [], orderedNames: [] };
export const cameraLocked = { starfieldObj: new THREE.Object3D(), graticule: new THREE.Line() };
export const orbitPlot = { points: pointCount };

export function getUrlVars() {
    let vars = {};
    const parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
        vars[key] = value;
    });
    return vars;
}

export const vars = getUrlVars();

if (typeof vars.y == "undefined" || typeof vars.x == "undefined") {
    navigator.geolocation.getCurrentPosition(Orrery.getLatLong); // request user's coordinates, if unavailable keep Greenwich
} else {
    const lat = parseFloat(vars.y);
    const lon = parseFloat(vars.x);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        groundPosition.latitude = lat;
        groundPosition.longitude = lon;
        groundPosition.default = false;
    }
}

if (typeof vars.t != "undefined" && (vars.t.length == 12 || vars.t.length == 13)) { // apply date
    const BC = parseFloat(vars.t) < 0;
    const split = BC ? 5 : 4;
    const year = vars.t.substr(0, split).substr(-4);
    const dayTime = vars.t.substr(split);
    const dateCode = (BC ? "-00" : "") + year + "-" + dayTime.substr(0, 2) + "-" + dayTime.substr(2,2) + "T" + 
    dayTime.substr(4,2) + ":" + dayTime.substr(6,2);
    timeManager.parsedDate = Date.parse(dateCode);
}

// three.js setup
export const scene = new THREE.Scene();
export const clock = new THREE.Clock();

export const camera = new THREE.PerspectiveCamera( initialFOV, window.innerWidth/window.innerHeight, 0.000001, 1000 );
export const renderer = new THREE.WebGLRenderer( {
    antialias: true, 
    logarithmicDepthBuffer: true,
    toneMapping: THREE.ACESFilmicToneMapping,
    powerPreference: "high-performance"
});

// standard materials
export const loader = new THREE.TextureLoader();
export const pathMaterials = [ // path materials
    new THREE.LineBasicMaterial({ color: 0x0033ff, linewidth: 1, transparent:true, opacity: 0.5 }),
    new THREE.LineBasicMaterial({ color: 0x0033ff, linewidth: 1, transparent:true, opacity: 0.3 }),
    new THREE.LineBasicMaterial({ color: 0x0033ff, linewidth: 1, transparent:true, opacity: 0.25 }),
    new THREE.LineBasicMaterial({ color: 0x0033ff, linewidth: 1, transparent:true, opacity: 0.2 }),
    new THREE.LineBasicMaterial({ color: 0x0033ff, linewidth: 1, transparent:true, opacity: 0.2 })
];
export const selectedPathMat = new THREE.LineBasicMaterial({ color: 0x3366ff, linewidth: 1.5, transparent:true, opacity: 0.7 });
export const defaultMaterial = new THREE.MeshStandardMaterial({ map: loader.load('data/1k_eris_fictional.jpg')});
export const pointMaterial = new THREE.PointsMaterial( { color: 0xffffff, alphaMap: loader.load('data/disc.png'), size: initialPoint, transparent: true } );
export const darkMaterial = new THREE.MeshBasicMaterial( { color: 0x000000 } );
export const transparentMaterial = new THREE.LineBasicMaterial( { transparent: true, opacity: 0 } );

export const pointGeometry = new THREE.InstancedBufferGeometry();
pointGeometry.setAttribute( 'position', new THREE.InstancedBufferAttribute( new Float32Array([0,0,0]), 3 ) );

// set up bloom pass
export const ENTIRE_SCENE = 0, BLOOM_SCENE = 1;
export const bloomLayer = new THREE.Layers();
bloomLayer.set( BLOOM_SCENE );

export const renderScene = new THREE.RenderPass( scene, camera );
export const bloomPass = new THREE.UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
bloomPass.threshold = 0.15;
bloomPass.strength = 7;
bloomPass.radius = 0;

export const bloomComposer = new THREE.EffectComposer( renderer );
bloomComposer.renderToScreen = false;
bloomComposer.addPass( renderScene );
bloomComposer.addPass( bloomPass );

export const finalPass = new THREE.ShaderPass(
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

export const finalComposer = new THREE.EffectComposer( renderer );
finalComposer.addPass( renderScene );
finalComposer.addPass( finalPass );

// backdrop and lighting
const ambient = new THREE.AmbientLight( 0x101022 );
const sunlight = new THREE.PointLight( 0xffffff, 1 );

scene.add(sunlight, ambient);

// skysphere
const textureEquirec = loader.load( 'data/starmap_2020_8k.jpg' );
textureEquirec.mapping = THREE.EquirectangularReflectionMapping;
textureEquirec.encoding = THREE.sRGBEncoding;
scene.background = textureEquirec;
const geometry = new THREE.IcosahedronGeometry( 1000, 2 );
const sphereMaterial = new THREE.MeshBasicMaterial( { envMap: textureEquirec } );
const sphereMesh = new THREE.Mesh( geometry, sphereMaterial );
scene.add( sphereMesh );

// make sun
const sunGeometry = new THREE.SphereGeometry( 0.1, 32, 32 );
const sunMaterial = new THREE.MeshBasicMaterial({ map: loader.load('data/1k_sun.jpg')});
export const sun = new THREE.Mesh( sunGeometry, sunMaterial );
sun.name = "Sol";
sun.glow = true;
Orrery.reAxis(sun, 63.87 * toRad, 286.13 * toRad);
sun.thetaDot = 360 * daysPerCent / -25.05 * toRad; // sun rotation rotate
scene.add( sun );

// camera controls
export const controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.enableDamping = true;
controls.dampingFactor = 0.02;
controls.target = new THREE.Vector3();
controls.screenSpacePanning = false;
controls.minDistance = initMinDistance;
controls.maxDistance = initMaxDistance;
controls.maxPolarAngle = Math.PI;

const camStart = new THREE.Vector3(0, -8, 0).applyAxisAngle(celestialXAxis, eclInclination);
camera.position.y = camStart.y;
camera.position.z = camStart.z;
controls.update();