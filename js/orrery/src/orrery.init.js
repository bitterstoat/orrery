// spatial constants
const toRad = Math.PI/180, toDeg = 180/Math.PI;
const celestialXAxis = new THREE.Vector3(1, 0, 0);
const celestialZAxis = new THREE.Vector3(0, -1, 0);
const eclInclination = 23.43928 * toRad + Math.PI; // inclination of the ecliptic relative to the celestial sphere
const AU = 1.495978707e+11; // astronomical unit
const gravConstant = 6.6743015e-11;
const sunGravConstant = 1.32712440042e+20; // gravitational constant for heliocentric orbits
const earthRadius = 6371000;
const earthBary = 4670 / 388400; // Earth barycentric offset relative to Moon's semimajor axis
const plutoBary = 2110 / 19600; // Pluto barycentric offset relative to Charon's semimajor axis

// temporal constants
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const daysPerCent = 36525.6363; // days per century
const UnixTimeZeroInMJD = 40587; // UNIX time zero as Modified Julian Date
const J2KInMJD = 51544.0; // Modified Julian Date of January 1, 2000
const DayInMillis = 86400000; // miliseconds per day

// spatial functions
function plotPoint(meanAnomaly, eccentricity, semiMajorAxis, runKepler) { // plot longitudes to orbital path
    const eccAnomaly = (runKepler && orbitPoints == 1) ? kepler(eccentricity, meanAnomaly) : meanAnomaly;
    const localPoint = new THREE.Vector2( semiMajorAxis * (Math.cos(eccAnomaly) - eccentricity), semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(eccAnomaly));
    return localPoint;
}

function kepler(e, m) { // numerical approximation of Kepler's equation
    let result = 0;
    let lastResult, delta;
    const tolerance = 0.00000001;
    do {
        lastResult = result;
        result = m + e * Math.sin(result);
        delta = result - lastResult;
    }
    while ( Math.abs(delta) > tolerance );
    return result;
}

function celestial(longPeriapsis, longAscNode, inclination, xLocal, yLocal) { // transform to Cartesian coordinates relative to the celestial sphere
    const v = new THREE.Vector3(xLocal, 0, yLocal);
    v.applyAxisAngle( celestialZAxis, longPeriapsis ).applyAxisAngle( celestialXAxis, inclination ).applyAxisAngle( celestialZAxis, longAscNode );
    return v.applyAxisAngle( celestialXAxis, eclInclination );
}

function planetary(longPeriapsis, longAscNode, inclination, ra, dec, xLocal, yLocal, orbitRef, orbitId) { // transform to Cartesian coordinates relative to an arbitrary axis
    let v = new THREE.Vector3(xLocal, 0, yLocal).applyAxisAngle( celestialZAxis, longPeriapsis + longAscNode );
    const y = new THREE.Vector3(0, 0, 1);
    switch (orbitRef) {
        case "L" : // relative to local Lagrangian
            v.applyAxisAngle(y, Math.PI/2 - dec).applyAxisAngle(celestialZAxis, ra);
        break;
        case "Q" : // relative to the planet's equator
            v.applyAxisAngle(y, Math.PI/2 - system[orbitId].axisDec + inclination).applyAxisAngle(celestialZAxis, system[orbitId].axisRA);
        break;
        default: // aka "E", relative to the ecliptic
            v = celestial(longPeriapsis, longAscNode, inclination, xLocal, yLocal);
    }
    return v;
}

function celestial_textbook(longPeriapsis, longAscNode, inclination, xLocal, yLocal) { // legacy version as written in the textbook
    const cosW = Math.cos(longPeriapsis); const sinW = Math.sin(longPeriapsis);
    const cosO = Math.cos(longAscNode); const sinO = Math.sin(longAscNode);
    const cosI = Math.cos(inclination); const sinI = Math.sin(inclination);
    const x = (cosW * cosO - sinW * sinO * cosI) * xLocal + (-1 * sinW * cosO - cosW * sinO * cosI) * yLocal;
    const y = (cosW * sinO + sinW * cosO * cosI) * xLocal + (-1 * sinW * sinO + cosW * cosO * cosI) * yLocal;
    const z = (sinW * sinI) * xLocal + (cosW * sinI) * yLocal;
    return new THREE.Vector3(x, z, y).applyAxisAngle( new THREE.Vector3(1, 0, 0), eclInclination);
}

function reAxis(obj, ra, dec) {
    obj.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), Math.PI/2 - dec);
    obj.rotateOnWorldAxis(celestialZAxis, ra);
}

function orbitPath(i) { // plot orbital paths
    system[i].updateOrbit();
    const orbitPath = system[i].celestial;
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints( orbitPath );
    const path = new THREE.LineLoop( orbitGeometry, pathMaterials[system[i].type]);
    path.initMaterial = pathMaterials[system[i].type];
    path.name = "path" + i;
    return path;
}

function redraw(i) { // plot orbital paths
    orbitPoints = pointCount;
    system[i].updateOrbit();
    paths[i].geometry = new THREE.BufferGeometry().setFromPoints( system[i].celestial );
    orbitPoints = 1;
}

function RADecToVector(ra, dec) { // right ascension and declination to vector
    const v = new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), (90-dec)*toRad);
    return v.applyAxisAngle(new THREE.Vector3(0, 1, 0), ((ra + 6) % 24) * 15 * toRad );
}

function vectorToRADec(v) { // vector to right ascension and declination
    return { ra: (Math.atan2(v.x, v.z) * toDeg / 15 + 42 ) % 24, 
        dec:v.angleTo(new THREE.Vector3(v.x, 0, v.z)) * Math.sign(v.y) * toDeg 
    };
}

function decToMinSec(n) { // decimal angle to DMS
    sign = Math.sign(n);
    n = Math.abs(n);
    let deg = Math.floor(n);
    let min = parseFloat(("0" + Math.floor((n - deg) * 60)).slice(-2));
    const sec = (n - deg - min/60) * 3600;
    if (sec >= 60) {
        min++;
        sec-=60;
    }
    if (min >= 60) {
        deg++;
        min-=60;
    }
    return { sign:(sign<0) ? "-" : "", deg:deg, min:min, sec:sec }
}

function estRadius(h, p = 0.15) { // estimate asteroid radius from absolute magnitude
    return r = 664.5 / Math.sqrt(p) * Math.pow( 10, h * -0.2);
}

function visViva(mu, r, a) { // compute instantaneous orbital speed
    return Math.sqrt(mu * (2/r/AU - 1/a/AU )) / 1000;
}

function displayLatLong(a, b) {
    const lat = decToMinSec(a);
    const lon = decToMinSec(b);
    $("#lat").html(Math.abs(lat.deg) + '&deg;&nbsp;' + lat.min + '&rsquo;&nbsp;' + lat.sec.toFixed(1) + '&rdquo;&nbsp;' + ((lat.sign == "-") ? 'S,' : 'N,'));
    $("#long").html(Math.abs(lon.deg) + '&deg;&nbsp;' + lon.min + '&rsquo;&nbsp;' + lon.sec.toFixed(1) + '&rdquo;&nbsp;' + ((lon.sign == "-") ? 'W' : 'E'));
}

function getLatLong(response) {
    latitude = response.coords.latitude;
    longitude = response.coords.longitude;
    latLongDefault = false;
    displayLatLong(latitude, longitude);
}

// temporal functions 
function unixToMJD(d) { // Unix time to modified Julian Date
    return d / DayInMillis + UnixTimeZeroInMJD; 
} 

function MJDToEphTime(d) { // MJD to fractional centuries since J2000
    return (d - J2KInMJD) / daysPerCent; 
}

function ephTimeToMJD(d) { // inverse MJDToEphTime
    return d * daysPerCent + J2KInMJD;
}

function MJDtoUnix(d) { // inverse unixToMJD
    return new Date((d - UnixTimeZeroInMJD) * DayInMillis);
}

function ephTimeReadout(d) { // display time
    const t = new Date((d * daysPerCent + J2KInMJD - UnixTimeZeroInMJD) * DayInMillis);
    const era = (t.getFullYear() >= 0) ? "" : " BC";
    const b = (t.getHours() % 12 == 0) ? 12 : t.getHours() % 12;
    return { a:months[t.getMonth()] + " " + (" " + t.getDate()).slice(-2) +", " + Math.abs(parseInt(t.getFullYear())).toString() + era, 
             b: "&nbsp;&nbsp;&bull;&nbsp;&nbsp;" + (" " +  b).slice(-2) + ":" + ("0" + t.getMinutes()).slice(-2), 
             c: ":" + ("0" + t.getSeconds()).slice(-2),
             d: (t.getHours() < 12) ? " AM" : " PM"
            };
}

function slowTime() { // slow/reverse time
    speed = Math.max(speed-1, 0);
    rate = rates[speed];
}

function speedTime() { // speeed up time
    speed = Math.min(speed+1, rates.length-1);
    rate = rates[speed];
}

function setTime(time) { // reset to arbitrary time
    const oldTime = ephTime;
    ephTime = MJDToEphTime(time);
    const delta = ephTime - oldTime;
    for (let i = 0; i < system.length; i++) {
        system[i].set(ephTime);
    }
    orbitPoints = pointCount;
    for (let i = 0; i < precessing.length; i++) {
        redraw(i);
    }
    orbitPoints = 1;
    speed = 8;
    rate = rates[speed];
}

function localSiderealTime(ephTime) {
    const t = MJDtoUnix(ephTimeToMJD(ephTime));
    const timeUTC = t.getUTCHours() + t.getUTCMinutes()/60 + t.getUTCSeconds()/3600 + t.getUTCMilliseconds()/3600000;
    return lst = (100.46 + (0.985647 * ephTime * daysPerCent) + longitude + (15 * timeUTC) + 360) % 360;
}

function getRA(obj) {
    const earthRad = system[earthID].radius / AU;
        const earthSurfPos = new THREE.Vector3( earthRad * Math.cos(longitude * toRad + system[earthID].phase), earthRad * Math.sin(latitude * toRad), earthRad * Math.sin(longitude * toRad + system[earthID].phase));
        const parallaxPos = system[earthID].celestialPos.clone().add(earthSurfPos).add(system[earthID].baryPos);
        return vectorToRADec( (obj.sysId == earthID) ? parallaxPos.multiplyScalar(-1) : obj.celestialPos.clone().sub(parallaxPos) );
}

function altAz(ra, dec, t) {
    const hourAngle = ((localSiderealTime(t) - (ra * 15) + 360) % 360) * toRad;
    dec *= toRad;
    const cD = Math.cos(dec);
    const lat = (90 - latitude) * toRad;
    const cL = Math.cos(lat);
    const sL = Math.sin(lat);
    const x = Math.cos(hourAngle) * cD;
    const y = Math.sin(hourAngle) * cD;
    const z = Math.sin(dec);

    const az = Math.atan2(y, x * cL - z * sL) * toDeg + 180;
    const alt = Math.asin(x * sL + z * cL) * toDeg;

    return { alt: alt, az: az, ha: hourAngle * toDeg / 15 };
}

function riseSet(obj) { // brute force rise/set time solver
    const RADec = getRA(obj);
    const day = (1 / daysPerCent);
    const min = day / 1440; 
    const startTime = ephTime - 0.5 * day;
    const crossings = [];
    let readout = "";
    for (let i = 0; i < 1441; i++) {
        const altA = altAz(RADec.ra, RADec.dec, startTime + i * min).alt;
        const altB = altAz(RADec.ra, RADec.dec, startTime + (i + 1) * min).alt;
        if (altA * altB < 0) {
            crossings.push( {type: (altA > 0) ? "Sets: " : "Rises: ", time: ephTimeReadout(startTime + i * min).b.substr(30) + ephTimeReadout(startTime + i * min).d} );
        }
    }
    if (crossings.length == 0) {
        readout = "Circumpolar";
    } else {
        const n = (crossings[0].type == "Rises: ") ? 0 : 1;
        readout += (crossings[n].type + crossings[n].time + '<br>');
        readout += (crossings[1 - n].type + crossings[1 - n].time + '<br>');
    }
    $("#riseSet, #earthRiseSet").html(readout);
}

function lerp(start, end, x) { // linear interpolation
    return (end - start) * x + start;
}

// light functions
function apparentMag(i) { // apparent magnitude
    const dBO = i.toEarth.length();
    const dBS = i.toSun;
    const cAlpha = (dBO * dBO + dBS * dBS - 1) / (2 * dBO * dBS);
    const alpha = (Math.abs(cAlpha) > 1) ? 1 : Math.acos(cAlpha); // patch for the Moon
    return i.absoluteMag + 5 * Math.log10( dBS * dBO ) - 2.5 * Math.log10(i.phaseIntegral(alpha));
}

function BVToRGB(bv) { // BV color index to RGB
    let t, r, g, b;
    if ((bv >= -0.4) && (bv < 0.0)) { 
        t = (bv + 0.4) / 0.4;
        r = 0.61 + (0.11 * t) + (0.1 * t * t);
    } else if ((bv >= 0.0) && (bv < 0.4)) { 
        t = bv / 0.4;
        r = 0.83 + (0.17 * t);
    } else if ((bv >= 0.4) && (bv < 2.1)) { 
        t = (bv-0.4) / 1.7;
        r = 1.0;
    }
    
    if (( bv >= -0.4 ) && ( bv < 0.0 )) { 
        t = (bv + 0.4) / 0.4;
        g = 0.7 + (0.07 * t) + (0.1 * t * t);
    } else if (( bv>= 0.0)&&( bv < 0.4)) {
        t = bv / 0.4;
        g = 0.87 + (0.11 * t);
    } else if ((bv >= 0.4) && (bv < 1.6)) {
        t = (bv - 0.4) / 1.2;
        g = 0.98 - (0.16 * t);
    } else if (( bv >= 1.6) && (bv < 2.0)) { 
        t = (bv - 1.60) / 0.4; 
        g = 0.82 - (0.5 * t * t);
    } 
    
    if ((bv >= -0.4) && (bv < 0.4)) {
        t = (bv + 0.4) / 0.8;
        b = 1.0;
    } else if ((bv >= 0.4) && (bv < 1.5)) {
        t = (bv - 0.4) / 1.1; 
        b = 1.0 - (0.47 * t) + (0.1 * t * t);
    } else if ((bv >= 1.50) && (bv < 1.94)) {
        t = (bv - 1.50) / 0.44;
        b = 0.63 - (0.6 * t * t);
    }
    return {r:r, g:g, b:b};
}

function extinction(magnitude, alt) {
    const angle = 90-alt;
    const airmass = Math.min(1/Math.cos(angle * toRad), Math.max(20, 6.2 * (angle) - 520));
    const extMag = 0.129 * airmass + magnitude;
    return { mag: extMag, airmass: airmass }
}

// constants
const fps = 60; // max FPS
const precessFreq = 1 / daysPerCent; // update orbital element drift 
const rates = [ -1/20/fps, -1/100/fps, -100/daysPerCent/fps, -20/daysPerCent/fps, -1/daysPerCent/fps, -1/24/daysPerCent/fps, -1/86400/daysPerCent/fps, 0, 1/86400/daysPerCent/fps, 1/24/daysPerCent/fps, 1/daysPerCent/fps, 20/daysPerCent/fps, 100/daysPerCent/fps, 1/100/fps, 1/20/fps]; // centuries per frame
const rateDesc = [ "-5 years/sec", "-1 year/sec", "-100 days/sec", "-20 days/sec", "-1 day/sec", "-1 hour/sec", "Reversed Time", "Paused", "Realtime", "1 hour/sec", "1 day/sec", "20 days/sec", "100 days/sec", "1 year/sec", "5 years/sec"];
const pointCount = 180;
const materials = {};
const pauseRate = 7;
const initialPoint = 0.01;
const initialFOV = 60;
const exagScale = 500000;
const initMinDistance = 1;
const initMaxDistance = 100;
const gratRadius = 1000;
const system = []; // the solar system as an associative array
const majorBodies = []; // bodies that scale on zoom
const moons = []; // need late update with planet references
const paths = []; // orbital paths
const orderedNames = [];
const tempLabels = [];
const gratLabels = [];
const precessing = []; // orbits with temporal drift
const planetNames = [];
const moonNames = [];
const asteroidNames = [];
const cometNames = [];

// variables
let earthID, moonID, plutoID, charonID, centerX, centerY
let hoverLabel = false;
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
let planetMoons = []; // moons of the the currently focused planet
let contents = []; // combined search field list
let ephTime = MJDToEphTime(unixToMJD(Date.now())); // get current time in fractional centuries since J2000
let following = false;
let lastFollow = new THREE.Vector3();
let planetScale = {f: 1.0};
let latitude = 51.48; // Default is Greenwich
let longitude = 0;
let mousePos = new THREE.Vector3(0, 0, 1);
let showSplash = false;
let extraData = false;
let latLongDefault = true;
let parsedDate = 0;
let precessCount = 0;
let smallAsteroids = 0;

function getUrlVars() {
    let vars = {};
    const parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
        vars[key] = value;
    });
    return vars;
}

const vars = getUrlVars();

if (typeof vars.y == "undefined" || typeof vars.x == "undefined") {
    navigator.geolocation.getCurrentPosition(getLatLong); // request user's coordinates, if unavailable keep Greenwich
} else {
    const lat = parseFloat(vars.y);
    const lon = parseFloat(vars.x);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        latitude = lat;
        longitude = lon;
        latLongDefault = false;
    }
}

if (typeof vars.t != "undefined" && (vars.t.length == 12 || vars.t.length == 13)) { // apply date
    const BC = parseFloat(vars.t) < 0;
    const split = BC ? 5 : 4;
    const year = vars.t.substr(0, split).substr(-4);
    const dayTime = vars.t.substr(split);
    const dateCode = (BC ? "-00" : "") + year + "-" + dayTime.substr(0, 2) + "-" + dayTime.substr(2,2) + "T" + 
    dayTime.substr(4,2) + ":" + dayTime.substr(6,2);
    parsedDate = Date.parse(dateCode);
}

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
    new THREE.LineBasicMaterial({ color: 0x0033ff, linewidth: 1, transparent:true, opacity: 0.2 })
];
const selectedPathMat = new THREE.LineBasicMaterial({ color: 0x3366ff, linewidth: 1.5, transparent:true, opacity: 0.7 });
const defaultMaterial = new THREE.MeshStandardMaterial({ map: loader.load('data/1k_eris_fictional.webp')});
const pointMaterial = new THREE.PointsMaterial( { color: 0xffffff, alphaMap: loader.load('data/disc.png'), size: initialPoint, transparent: true } );
const darkMaterial = new THREE.MeshBasicMaterial( { color: 0x000000 } );
const transparentMaterial = new THREE.LineBasicMaterial( { transparent: true, opacity: 0 } );

const pointGeometry = new THREE.InstancedBufferGeometry();
pointGeometry.setAttribute( 'position', new THREE.InstancedBufferAttribute( new Float32Array([0,0,0]), 3 ) );

// set up bloom pass
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

// skysphere
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

function makeBody (loader, texture, radius, name, sysId, ringRad, ringTexture, axisDec, axisRA, phase, thetaDot) { // make bodies
    const material = (texture != "default") ? new THREE.MeshStandardMaterial({ map: loader.load('data/' + texture) }) : defaultMaterial;
    const planetRadius = radius;
    const geometry = new THREE.IcosahedronGeometry( planetRadius, 5 );
    const sphere = new THREE.Mesh( geometry, material );
    sphere.name = name;
    sphere.sysId = sysId;

    const ringRadius = (ringRad) ? parseFloat(ringRad) : 0;
    if (ringRadius > 0) {  // make rings
        const geometry = new THREE.RingGeometry(planetRadius * 1.01, ringRadius * planetRadius, 64);
        const texMap = loader.load('data/' + ringTexture);
        const material = new THREE.MeshBasicMaterial({ map: texMap, side:THREE.DoubleSide, transparent: true, combine: THREE.AddOperation });
        const ring = new THREE.Mesh( geometry, material );
        ring.rotateX(Math.PI / 2);
        sphere.attach(ring); // parent ring to planet
    }

    // apply initial rotation
    reAxis(sphere, axisRA, axisDec);
    sphere.rotateOnAxis(new THREE.Vector3(0, -1, 0), thetaDot * ephTime + Math.PI * phase );
    return sphere;
}

function makePoint (name, sysId) {
    const point = new THREE.Points( pointGeometry, pointMaterial );
    point.name = name;
    point.sysId = sysId;
    return point;
}

function makeLabel(i) { // make body label
    $("body").append("<div id='" + i + "' class='label'>" + system[i].name + "</div>");
    $("#" + i).addClass( "tag" + system[i].type ).click( function() {
        $(".label").removeClass( "active" );
        if ( clickedLabel != "" && $(this)[0].id == clickedLabel[0].id ) {
            closeTag(clickedLabel);
        } else {
            clickTag($(this)[0].id);
        }
    }).hover( function() {
        if (clickedLabel != "" && $(this)[0].id != clickedLabel[0].id) {
            hoverLabel = $(this);
            hoverContent = $(this).html();
            hoverLabel.html(hoverContent + '<span id="distToActive"></span>');
        }
    }, function() {
        $("#distToActive").remove();
        hoverLabel = false;
    });
}

function makeGratLabel(i, text) { // make graticule label
    $("body").append("<div id='grat" + i + "' class='gratLabel'>" + text + "</div>");
    return $("#grat" + i);
}

function makeGraticules() {
    const points = 360;
    const longDivisions = 12;
    const latDivisions = 12;
    const ringPoints = [];

    for (let i = 0; i <= points; i++) {
        let p = new THREE.Vector3(0, gratRadius, 0);
        p.applyAxisAngle(new THREE.Vector3(1, 0, 0), i * Math.PI * 2 / points);
        ringPoints.push(p);
    }
    const ringGeometry = new THREE.BufferGeometry().setFromPoints( ringPoints );

    const rings = [];
    for (let i = 0; i < longDivisions / 2; i++) {
        const tempRing = ringGeometry.clone();
        tempRing.rotateY( i * Math.PI * 2 / longDivisions );
        rings.push(tempRing);
    }
    ringGeometry.rotateZ(Math.PI / 2);
    for (let i = ( latDivisions / -2 ); i < ( latDivisions / 2 ); i++) {
        const tempRing = ringGeometry.clone();
        const x = Math.cos( i * Math.PI / latDivisions );
        const y = Math.sin( i * Math.PI / latDivisions ) * gratRadius;
        tempRing.scale(x, 1, x);
        tempRing.translate(0, -y, 0);
        rings.push(tempRing);
    }

    ringGeometry.rotateX(eclInclination);
    rings.push(ringGeometry);
    const longSphereGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(rings);
    const ringMaterial = new THREE.LineBasicMaterial({ color: 0x222211, linewidth: 1 });
    graticule = new THREE.LineLoop( longSphereGeometry, ringMaterial);
    graticule.name = "graticule";
    scene.add(graticule);
}

function makeRefPoints() {
    const longDivisions = 12;
    const latDivisions = 12;
    const refPoints = [0, gratRadius, 0];
    const labels = ["NP"];

    for (let i = 1; i < latDivisions; i++) {
        const latLabel = 90 - i * 15;
        for (let j = 0; j < longDivisions; j++) {
            x = Math.sin(j * Math.PI * 2 / longDivisions) * Math.sin(i * Math.PI / latDivisions) * gratRadius;
            y = Math.cos(i * Math.PI / latDivisions) * gratRadius;
            z = Math.cos(j * Math.PI * 2 / longDivisions) * Math.sin(i * Math.PI / latDivisions) * gratRadius;
            refPoints.push(x, y, z);
            labels.push(latLabel + "&deg;/" + ((j + 9) % 12) * 2 + "h")
        }
    }
    refPoints.push(0, -gratRadius, 0);
    labels.push("SP");

    for (let i = 0; i < refPoints.length / 3; i++) {
        const x = refPoints[3 * i];
        const y = refPoints[3 * i + 1];
        const z = refPoints[3 * i + 2];
        text = labels[i];
        gratLabels.push({label: makeGratLabel(i, text), x: x, y: y, z: z});
    }
}

/* INITITALIZATION */
$(document).ready( function() {
    fullLoad();
    makeGraticules();
    makeRefPoints();
    graticule.visible = false;
});

let JSONsystem = [];
function JSONtest() {
    $.ajax({ // load planet data
        url: "data/system.json",
        async: true,
        success: function(list) { JSONsystem = jQuery.parseJSON(list); },
        dataType: "text",
        complete: function () {
            console.log(JSONsystem);
        }
    });
}

function fullLoad() {
    $.ajax({ // load planet data
        url: "data/planets_3000bc_to_3000ad.csv",
        async: true,
        beforeSend: function() { datasets++; },
        success: function(list) { planetData = $.csv.toObjects(list); },
        dataType: "text",
        complete: function () {
            for (let i = 0; i < planetData.length; i++) {
                let newPlanet = new Planet(planetData[i]);
                system.push(newPlanet);
                planetNames.push(newPlanet.name);
                precessing.push(newPlanet.name);
            }
            finalize();
        }
    });


    $.ajax({ // load asteroid data
        url: "data/asteroids.csv",
        async: true,
        beforeSend: function() { datasets++; },
        success: function(list) { asteroidData = $.csv.toObjects(list); },
        dataType: "text",
        complete: function () {
            for (let i = 0; i < asteroidData.length; i++) {
                let newAsteroid = new Asteroid(asteroidData[i]);
                system.push(newAsteroid);
                asteroidNames.push(newAsteroid.name);
            }
            finalize();
        }
    });

    $.ajax({ // load extended asteroid data
        url: "data/asteroids2.csv",
        async: true,
        beforeSend: function() { datasets++; },
        success: function(list) { asteroidData = $.csv.toObjects(list); },
        dataType: "text",
        complete: function () {
            smallAsteroids = asteroidData.length;
            for (let i = 0; i < asteroidData.length; i++) {
                if (i > vars.n) { break; } // these can be reduced to improve frame rate
                let newAsteroid = new Asteroid(asteroidData[i]);
                system.push(newAsteroid);
                asteroidNames.push(newAsteroid.name);
            }
            finalize();
        }
    });

    $.ajax({ // load moon data
        url: "data/moons.csv",
        async: true,
        beforeSend: function() { datasets++; },
        success: function(list) { moonData = $.csv.toObjects(list); },
        dataType: "text",
        complete: function () {
            for (let i = 0; i < moonData.length; i++) {
                let newMoon = new Moon(moonData[i]);
                system.push(newMoon);
                moons.push(newMoon);
                moonNames.push(newMoon.name);
            }
            finalize();
        }
    });

    $.ajax({ // load comet data
        url: "data/comets.csv",
        async: true,
        beforeSend: function() { datasets++; },
        success: function(list) { cometData = $.csv.toObjects(list); },
        dataType: "text",
        complete: function () {
            for (let i = 0; i < cometData.length; i++) {
                let newComet = new Comet(cometData[i]);
                system.push(newComet);
                cometNames.push(newComet.name);
            }
            finalize();
        }
    });

    /*
    $.ajax({ // load non-periodic object data
        url: "data/hyperbolic.csv",
        async: true,
        beforeSend: function() { datasets++; },
        success: function(list) { hyperData = $.csv.toObjects(list); },
        dataType: "text",
        complete: function () {
            for (let i = 0; i < hyperData.length; i++) {
                let newHyperbolic = new Hyperbolic(hyperData[i]);
                system.push(newHyperbolic);
                contents.push(newHyperbolic.name);
            }
            finalize();
        }
    });
    */

    $.ajax({ // load background star data
        url: "data/stars_7mag.csv",
        async: true,
        success: function(list) { starData = $.csv.toObjects(list); },
        dataType: "text",
        complete: function () {
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const colors = [];
            for (let i = 0; i < starData.length; i++) {
                const vector = RADecToVector(parseFloat(starData[i].ra), parseFloat(starData[i].dec)).multiplyScalar(900);
                positions.push( vector.x, vector.y, vector.z );
                const luma = Math.pow(10 / (parseFloat(starData[i].mag) + 10), 4);
                const cindex = (typeof starData[i].ci != "undefined" && starData[i].ci.length > 0) ? parseFloat(starData[i].ci) : 0;
                const chroma = BVToRGB(cindex);
                colors.push( luma * chroma.r, luma * chroma.g, luma * chroma.b );
            }
            geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
            geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
            geometry.computeBoundingSphere();
            const material = new THREE.PointsMaterial( { size: 4, vertexColors: true, alphaMap: loader.load('data/disc.png'), transparent: true } );
            const starfield = new THREE.Points( geometry, material );
            starfield.name = "starfield";
            scene.add( starfield );
            starfieldObj = starfield;
        }
    });
}

function finalize() {
    flags++;
    if (flags == datasets) {
        if (parsedDate != 0 && !isNaN(parsedDate)) {
            ephTime = MJDToEphTime(unixToMJD(parsedDate));
        }
        for (let i = 0; i < system.length; i++) {
            orderedNames.push(system[i].name);
        }
        for (let i = 0; i < moons.length; i++) {
            moons[i].orbitId = orderedNames.findIndex( function(e) {
                return e == moons[i].orbiting;
            });
        }

        for (let i = 0; i < system.length; i++) {
            system[i].set(ephTime);
            const path = orbitPath(i);
            paths.push(path);
            system[i].sysId = i;
            system[i].path = paths.length - 1;
            if (system[i].type < 3 || system[i] instanceof Moon == true ) {
                scene.add(path);
                majorBodies.push(system[i]);
                scene.add(makeBody(loader, system[i].texture, system[i].exagRadius, system[i].name, i, system[i].ringRadius, system[i].ringTexture, system[i].axisDec, system[i].axisRA, system[i].phase, system[i].thetaDot));
                makeLabel(i);
            } else {
                scene.add(makePoint(system[i].name, i));
            }
            system[i].childId = scene.children.length-1;
        }
        
        for (let i = 0; i < moons.length; i++) {
            paths[moons[i].path].orbitId = moons[i].orbitId;
            system[moons[i].orbitId].moons++;
            const rad = parseFloat(moons[i].radius);
            if (rad > system[moons[i].orbitId].largestMoonRadius) {
                system[moons[i].orbitId].secondMoon = system[moons[i].orbitId].largestMoon;
                system[moons[i].orbitId].largestMoon = moons[i].name;
                system[moons[i].orbitId].largestMoonRadius = rad;
            }
            $("#" + moons[i].sysId ).hide();
        }

        // barycentric bodies
        earthID = orderedNames.findIndex( function(e) { return e == "Earth" });
        moonID = orderedNames.findIndex( function(e) { return e == "Moon" });
        plutoID = orderedNames.findIndex( function(e) { return e == "Pluto" });
        charonID = orderedNames.findIndex( function(e) { return e == "Charon" });

        for (let i = 0; i < precessing.length; i++) {
            precessing[i] = orderedNames.findIndex( function(e) { return e == precessing[i] });
        }

        $( "#smallRoids" ).html(smallAsteroids);

        contents = planetNames.concat(moonNames, asteroidNames, cometNames);

        animate(); // start the main loop
    }
}