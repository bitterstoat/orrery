import * as ORR from "./init.js";
import * as THREE from "../../../node_modules/three/build/three.module.js";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const UnixTimeZeroInMJD = 40587; // UNIX time zero as Modified Julian Date
const J2KInMJD = 51544.5; // Modified Julian Date of January 1, 2000
const DayInMillis = 86400000; // miliseconds per day

// SPATIAL FUNCTIONS

/**
 * Plot longitude point on an orbit.
 * @param {float} meanAnomaly 
 * @param {float} eccentricity 
 * @param {float} semiMajorAxis 
 * @param {boolean} runKepler - Apply Kepler's equation
 * @returns {THREE.Vector3} - Coordinate
 */
export function plotPoint(meanAnomaly, eccentricity, semiMajorAxis, runKepler) {
    const eccAnomaly = (runKepler && ORR.orbitPlot.points == 1) ? kepler(eccentricity, meanAnomaly) : meanAnomaly;
    const localPoint = new THREE.Vector2( semiMajorAxis * (Math.cos(eccAnomaly) - eccentricity), semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(eccAnomaly));
    return localPoint;
}

/**
 * Compute eccentric anolmaly numerically through Kepler's equation.
 * @param {float} e - Eccentricity
 * @param {float} m - Mean anomaly
 * @returns {float} - Eccentric anomaly
 */
export function kepler(e, m) { // numerical approximation of Kepler's equation
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

/**
 * Compute hyperbolic eccentric anolmaly numerically through Kepler's equation.
 * @param {float} e - Eccentricity
 * @param {float} m - Mean anomaly
 * @returns {float} - Hyperbolic eccentric anomaly
 */
 export function hypKepler(e, m) { // numerical approximation of hyperbolic Kepler's equation
    let result = 0;
    let lastResult, delta;
    const tolerance = 0.00000001;
    do {
        lastResult = result;
        result = e * Math.sinh(m) - m;
        delta = result - lastResult;
    }
    while ( Math.abs(delta) > tolerance );
    return result;
}

/**
 * Orient local orbital point in celestial space. Uses THREE functions.
 * @param {float} longPeriapsis - Longitude of periapsis
 * @param {float} longAscNode - Longitude of ascending node
 * @param {float} inclination 
 * @param {float} xLocal - x-coordinate in local orbital plane
 * @param {float} yLocal - y-coordinate in local orbital plane
 * @returns {THREE.Vector3} Celestial coordinates 
 */
export function celestial_THREE(longPeriapsis, longAscNode, inclination, xLocal, yLocal) {
    const v = new THREE.Vector3(xLocal, 0, yLocal);
    v.applyAxisAngle( ORR.celestialZAxis, longPeriapsis ).applyAxisAngle( ORR.celestialXAxis, inclination ).applyAxisAngle( ORR.celestialZAxis, longAscNode );
    return v.applyAxisAngle( ORR.celestialXAxis, ORR.eclInclination );
}

/**
 * Orient local orbital point in planetary space.
 * @param {float} longPeriapsis - Longitude of periapsis
 * @param {float} longAscNode - Longitude of ascending node
 * @param {float} inclination 
 * @param {float} ra - Right ascension of orbital axis
 * @param {float} dec - Declination of orbital axis
 * @param {float} xLocal - x-coordinate in local orbital plane
 * @param {float} yLocal - y-coordinate in local orbital plane
 * @param {string} orbitRef - Orbit frame of reference
 * @param {number} orbitId - System ID of object being orbited
 * @returns {THREE.Vector3} - Planetary coordinates
 */
export function planetary(longPeriapsis, longAscNode, inclination, ra, dec, xLocal, yLocal, orbitRef, orbitId) {
    let v = new THREE.Vector3(xLocal, 0, yLocal).applyAxisAngle( ORR.celestialZAxis, longPeriapsis + longAscNode );
    const y = new THREE.Vector3(0, 0, 1);
    switch (orbitRef) {
        case "L" : // relative to local Lagrangian
            v.applyAxisAngle(y, Math.PI/2 - dec).applyAxisAngle(ORR.celestialZAxis, ra);
        break;
        case "Q" : // relative to the planet's equator
            v.applyAxisAngle(y, Math.PI/2 - ORR.system[orbitId].axisDec + inclination).applyAxisAngle(ORR.celestialZAxis, ORR.system[orbitId].axisRA);
        break;
        default: // aka "E", relative to the ecliptic
            v = celestial_THREE(longPeriapsis, longAscNode, inclination, xLocal, yLocal);
    }
    return v;
}

/**
 * Orient local orbital point in celestial space. Uses textbook calculation.
 * @param {float} longPeriapsis - Longitude of periapsis
 * @param {float} longAscNode  - Longitude of ascending node
 * @param {float} inclination 
 * @param {float} xLocal - x-coordinate in local orbital plane
 * @param {float} yLocal - y-coordinate in local orbital plane
 * @returns {THREE.Vector3} Celestial coordinates
 */
export function celestial(longPeriapsis, longAscNode, inclination, xLocal, yLocal) {
    const cosW = Math.cos(longPeriapsis); const sinW = Math.sin(longPeriapsis);
    const cosO = Math.cos(longAscNode); const sinO = Math.sin(longAscNode);
    const cosI = Math.cos(inclination); const sinI = Math.sin(inclination);
    const x = (cosW * cosO - sinW * sinO * cosI) * xLocal + (-1 * sinW * cosO - cosW * sinO * cosI) * yLocal;
    const y = (cosW * sinO + sinW * cosO * cosI) * xLocal + (-1 * sinW * sinO + cosW * cosO * cosI) * yLocal;
    const z = (sinW * sinI) * xLocal + (cosW * sinI) * yLocal;
    return new THREE.Vector3(x, z, y).applyAxisAngle( new THREE.Vector3(1, 0, 0), ORR.eclInclination);
}

/**
 * Reorient object's axis of rotation
 * @param {THREE.Object3D} obj 
 * @param {float} ra - Right ascension of new axis
 * @param {float} dec - Declination of new axis
 */
export function reAxis(obj, ra, dec) {
    obj.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), Math.PI/2 - dec);
    obj.rotateOnWorldAxis(ORR.celestialZAxis, ra);
}

/**
 * Plot orbital paths.
 * @param {number} i - System ID
 * @returns {THREE.LineLoop} Path
 */
export function orbitPath(i) { 
    ORR.system[i].updateOrbit();
    const orbitPath = ORR.system[i].celestial;
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints( orbitPath );
    const path = new THREE.LineLoop( orbitGeometry, ORR.pathMaterials[ORR.system[i].type]);
    path.initMaterial = ORR.pathMaterials[ORR.system[i].type];
    path.name = "path" + i;
    return path;
}

/**
 * Redraw path.
 * @param {number} i - System ID
 */
export function redraw(i) {
    ORR.orbitPlot.points = ORR.pointCount;
    ORR.system[i].updateOrbit();
    ORR.paths[i].geometry = new THREE.BufferGeometry().setFromPoints( ORR.system[i].celestial );
    ORR.orbitPlot.points = 1;
}

/**
 * Convert right ascension and declination to a vector.
 * @param {float} ra - Right ascension
 * @param {float} dec - Declination
 * @returns {THREE.Vector3}
 */
export function RADecToVector(ra, dec) { 
    const v = new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), (90-dec)*ORR.toRad);
    return v.applyAxisAngle(new THREE.Vector3(0, 1, 0), ((ra + 6) % 24) * 15 * ORR.toRad );
}

/**
 * Convert vector to right ascension and declination.
 * @param {THREE.Vector3} v - Input vector
 * @returns {object}
 */
export function vectortoRadec(v) {
    return { ra: (Math.atan2(v.x, v.z) * ORR.toDeg / 15 + 42 ) % 24, 
        dec:v.angleTo(new THREE.Vector3(v.x, 0, v.z)) * Math.sign(v.y) * ORR.toDeg 
    };
}

/**
 * Convert decimal angle to degrees, minutes, and seconds.
 * @param {float} n - Input angle 
 * @returns {object}
 */
export function decToMinSec(n) { 
    const sign = Math.sign(n);
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

/**
 * Estimate asteroid radius from absolute magnitude.
 * @param {float} h - Absolute magnitude
 * @param {float} p - Slope (0.15 by default)
 * @returns {float} Radius estimate
 */
export function estRadius(h, p = 0.15) { 
    return 664.5 / Math.sqrt(p) * Math.pow( 10, h * -0.2);
}

/**
 * Compute instantaneous orbital speed.
 * @param {float} mu - Local graviational constant
 * @param {float} r - Current distance
 * @param {float} a - Orbit's semimajor axis
 * @returns {float} Velocity
 */
export function visViva(mu, r, a) { 
    return Math.sqrt(mu * (2/r/ORR.AU - 1/a/ORR.AU )) / 1000;
}

/**
 * Format latitude and longitude.
 * @param {float} a - Latitude 
 * @param {float} b - Longitude 
 */
export function displayLatLong(a, b) {
    const lat = decToMinSec(a);
    const lon = decToMinSec(b);
    document.getElementById("lat").innerHTML = Math.abs(lat.deg) + '&deg;&nbsp;' + lat.min + '&rsquo;&nbsp;' + lat.sec.toFixed(1) + '&rdquo;&nbsp;' + ((lat.sign == "-") ? 'S,' : 'N,');
    document.getElementById("long").innerHTML = Math.abs(lon.deg) + '&deg;&nbsp;' + lon.min + '&rsquo;&nbsp;' + lon.sec.toFixed(1) + '&rdquo;&nbsp;' + ((lon.sign == "-") ? 'W' : 'E');
}

/**
 * Request latitude and longitude.
 * @param {*} response 
 */
export function getLatLong(response) {
    ORR.groundPosition.latitude = response.coords.latitude;
    ORR.groundPosition.longitude = response.coords.longitude;
    ORR.groundPosition.default = false;
    displayLatLong(ORR.groundPosition.latitude, ORR.groundPosition.longitude);
}

// TEMPORAL FUNCTIONS

/**
 * Convert Unix time to modified Julian Date.
 * @param {float} d - Unix date 
 * @returns {float} MJD
 */
export function unixToMJD(d) { 
    return d / DayInMillis + UnixTimeZeroInMJD; 
} 

/**
 * MJD to fractional centuries since J2000.
 * @param {float} d - MJD
 * @returns {float} Ephemeris time
 */
export function MJDToEphTime(d) { 
    return (d - J2KInMJD) / ORR.daysPerCent; 
}

/**
 * Inverse of MJDToEphTime()
 * @param {float} d - Ephemeris time
 * @returns {float} MJD
 */
export function EphTimeToMJD(d) {
    return d * ORR.daysPerCent + J2KInMJD;
}

/**
 * Inverse of inverse unixToMJD()
 * @param {float} d - MJD
 * @returns {float} Unix date
 */
export function MJDtoUnix(d) {
    return new Date((d - UnixTimeZeroInMJD) * DayInMillis);
}

/**
 * Format ephemeris time for display.
 * @param {float} d - Ephemeris time 
 * @returns {object}
 */
export function EphTimeReadout(d) { // display time
    const t = new Date((d * ORR.daysPerCent + J2KInMJD - UnixTimeZeroInMJD) * DayInMillis);
    const era = (t.getFullYear() >= 0) ? "" : " BC";
    const b = (t.getHours() % 12 == 0) ? 12 : t.getHours() % 12;
    return { a:months[t.getMonth()] + " " + (" " + t.getDate()).slice(-2) +", " + Math.abs(parseInt(t.getFullYear())).toString() + era, 
             b: "&nbsp;&nbsp;&bull;&nbsp;&nbsp;" + (" " +  b).slice(-2) + ":" + ("0" + t.getMinutes()).slice(-2), 
             c: ":" + ("0" + t.getSeconds()).slice(-2),
             d: (t.getHours() < 12) ? " AM" : " PM"
            };
}

/**
 * Slow or reverse time
 */
export function slowTime() {
    ORR.times.speed = Math.max(ORR.times.speed-1, 0);
    ORR.times.rate = ORR.rates[ORR.times.speed];
}

/**
 * Speed up time
 */
export function speedTime() {
    ORR.times.speed = Math.min(ORR.times.speed+1, ORR.rates.length-1);
    ORR.times.rate = ORR.rates[ORR.times.speed];
}

/**
 * Reset to arbitrary time.
 * @param {float} time - MJD
 */
export function setTime(time) {
    const oldTime = ORR.times.ephTime;
    ORR.times.ephTime = MJDToEphTime(time);
    const delta = ORR.times.ephTime - oldTime;
    for (let i = 0; i < ORR.system.length; i++) {
        ORR.system[i].set(ORR.times.ephTime);
    }
    ORR.orbitPlot.points = ORR.pointCount;
    for (let i = 0; i < ORR.precessing.length; i++) {
        redraw(i);
    }
    ORR.orbitPlot.points = 1;
    ORR.times.speed = 8;
    ORR.times.rate = ORR.rates[ORR.times.speed];
}

/**
 * Local sidereal time.
 * @param {float} ephTime - Ephemeris time 
 * @returns {float} - Local sidereal time
 */
export function localSiderealTime(ephTime) {
    const t = MJDtoUnix(EphTimeToMJD(ephTime));
    const timeUTC = t.getUTCHours() + t.getUTCMinutes()/60 + t.getUTCSeconds()/3600 + t.getUTCMilliseconds()/3600000;
    return (100.46 + (0.985647 * ephTime * ORR.daysPerCent) + ORR.groundPosition.longitude + (15 * timeUTC) + 360) % 360;
}

/**
 * Get RADec relative to geocoordinate on Earth's surface.
 * @param {object} obj - System object
 * @returns {object} from vectortoRadec()
 */
export function getRA(obj) {
    const earthRad = ORR.system[ORR.specialID.earth].radius / ORR.AU;
        const earthSurfPos = new THREE.Vector3( earthRad * Math.cos(ORR.groundPosition.longitude * ORR.toRad + ORR.system[ORR.specialID.earth].phase), earthRad * Math.sin(ORR.groundPosition.latitude * ORR.toRad), earthRad * Math.sin(ORR.groundPosition.longitude * ORR.toRad + ORR.system[ORR.specialID.earth].phase));
        const parallaxPos = ORR.system[ORR.specialID.earth].celestialPos.clone().add(earthSurfPos).add(ORR.system[ORR.specialID.earth].baryPos);
        return vectortoRadec( (obj.sysId == ORR.specialID.earth) ? parallaxPos.multiplyScalar(-1) : obj.celestialPos.clone().sub(parallaxPos) );
}

/**
 * Compute altitude and azimuth.
 * @param {float} ra - Right ascension
 * @param {float} dec - Declination
 * @param {float} t - Time
 * @returns {object}
 */
export function altAz(ra, dec, t) {
    const hourAngle = ((localSiderealTime(t) - (ra * 15) + 360) % 360) * ORR.toRad;
    dec *= ORR.toRad;
    const cD = Math.cos(dec);
    const lat = (90 - ORR.groundPosition.latitude) * ORR.toRad;
    const cL = Math.cos(lat);
    const sL = Math.sin(lat);
    const x = Math.cos(hourAngle) * cD;
    const y = Math.sin(hourAngle) * cD;
    const z = Math.sin(dec);

    const az = Math.atan2(y, x * cL - z * sL) * ORR.toDeg + 180;
    const alt = Math.asin(x * sL + z * cL) * ORR.toDeg;

    return { alt: alt, az: az, ha: hourAngle * ORR.toDeg / 15 };
}

/**
 * Brute force rise/set time solver.
 * @param {object} obj - System object
 */
export function riseSet(obj) {
    const RADec = getRA(obj);
    const day = (1 / ORR.daysPerCent);
    const min = day / 1440; 
    const startTime = ORR.times.ephTime - 0.5 * day;
    const crossings = [];
    let readout = "";
    for (let i = 0; i < 1441; i++) {
        const altA = altAz(RADec.ra, RADec.dec, startTime + i * min).alt;
        const altB = altAz(RADec.ra, RADec.dec, startTime + (i + 1) * min).alt;
        if (altA * altB < 0) {
            crossings.push( {type: (altA > 0) ? "Sets: " : "Rises: ", time: EphTimeReadout(startTime + i * min).b.substr(30) + EphTimeReadout(startTime + i * min).d} );
        }
    }
    if (crossings.length == 0) {
        readout = "Circumpolar";
    } else {
        const n = (crossings[0].type == "Rises: ") ? 0 : 1;
        readout += (crossings[n].type + crossings[n].time + '<br>');
        readout += (crossings[1 - n].type + crossings[1 - n].time + '<br>');
    }
    document.getElementById("riseSet").innerHTML = readout;
    document.getElementById("earthRiseSet").innerHTML = readout;
}

/**
 * Convert datecode to Modified Julian Date
 * @param {float} d - datecode to parse 
 * @returns {float} MJD
 */
export function dateCodeToMJD(d) {
    const dayPart = ORR.decToMinSec(parseFloat(d.substr(8))*24);
    const date = d.substr(0, 4) + "-" + d.substr(4, 2) + "-" + d.substr(6, 2) + "T" + ("0" + dayPart.deg.toString().slice(-1)) + 
    ":" + ("0" + dayPart.min.toString().slice(-1)) + ":" + ("0" + dayPart.sec.toString().slice(-1));
    return ORR.unixToMJD(Date.parse(date));
}

// LIGHT FUNCTIONS

/**
 * Apparent magnitude.
 * @param {number} i - System ID 
 * @returns {float} Magnitude
 */
export function apparentMag(i) { 
    const dBO = i.toEarth.length();
    const dBS = i.toSun;
    const cAlpha = (dBO * dBO + dBS * dBS - 1) / (2 * dBO * dBS);
    const alpha = (Math.abs(cAlpha) > 1) ? 1 : Math.acos(cAlpha); // patch for the Moon
    return i.absoluteMag + 5 * Math.log10( dBS * dBO ) - 2.5 * Math.log10(i.phaseIntegral(alpha));
}

/**
 * BV color index to RGB.
 * @param {float} bv - Color index 
 * @returns {object} RGB values
 */
export function BVToRGB(bv) {
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

/**
 * Magnitude extinction due to atmospheric diffusion.
 * @param {float} magnitude 
 * @param {float} alt - Altitude
 * @returns {object}
 */
export function extinction(magnitude, alt) {
    const angle = 90-alt;
    const airmass = Math.min(1/Math.cos(angle * ORR.toRad), Math.max(20, 6.2 * (angle) - 520));
    const extMag = 0.129 * airmass + magnitude;
    return { mag: extMag, airmass: airmass }
}