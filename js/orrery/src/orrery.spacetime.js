// spatial constants
const toRad = Math.PI/180, toDeg = 180/Math.PI;
const celestialXAxis = new THREE.Vector3(1, 0, 0);
const celestialZAxis = new THREE.Vector3(0, -1, 0);
const eclInclination = 23.43928 * toRad + Math.PI; // inclination of the ecliptic relative to the celestial sphere
const AU = 1.495978707e+11; // astronomical unit
const gravConstant = 6.6743015e-11;
const sunGravConstant = 1.32712440042e+20; // gravitational constant for heliocentric orbits
const earthRadius = 6371000;

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
    const tolerance = 0.00000002;
    do {
        lastResult = result;
        result = m + e * Math.sin(result);
        delta = result - lastResult;
    }
    while ( Math.abs(delta) > tolerance );
    return result;
}

function celestial(longPeriapsis, longAscNode, inclination, xLocal, yLocal) { // transform to Cartesian coordinates relative to the celestial sphere
    let v = new THREE.Vector3(xLocal, 0, yLocal);
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
        case ("Q") : // relative to the planet's equator
            v.applyAxisAngle(y, Math.PI/2 - system[orbitId].axisDec + inclination).applyAxisAngle(celestialZAxis, system[orbitId].axisRA);
        break;
        case ("B") : // relative to the planet's equator at barycenter (same as "Q" for now)
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
    system[i].updateOrbit(0);
    let orbitPath = system[i].celestial;
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints( orbitPath );
    const path = new THREE.LineLoop( orbitGeometry, pathMaterials[system[i].type]);
    path.initMaterial = pathMaterials[system[i].type];
    path.name = "path" + i;
    return path;
}

function RADecToVector(ra, dec) { // right ascension and declination to vector
    let v = new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), (90-dec)*toRad);
    return v.applyAxisAngle(new THREE.Vector3(0, 1, 0), ((ra + 6) % 24) * 15 * toRad );
}

function vectorToRADec(v) { // vector to right ascension and declination
    return { ra: (Math.atan2(v.x, v.z) * toDeg / 15 + 42 ) % 24, 
        dec:v.angleTo(new THREE.Vector3(v.x, 0, v.z)) * Math.sign(v.y) * toDeg 
    };
}

function decToMinSec(n) { // decimal angle to DMS
    const sign = Math.sign(n);
    n = Math.abs(n);
    let deg = Math.floor(n);
    let min = parseFloat(("0" + Math.floor((n - deg) * 60)).slice(-2));
    let sec = (n - deg - min/60) * 3600;
    if (sec >= 60) {
        min++;
        sec-=60;
    }
    if (min >= 60) {
        deg++;
        min-=60;
    }
    deg *= sign;
    return { deg:deg, min:min, sec:sec }
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
    $("#lat").html(Math.abs(lat.deg) + '&deg;&nbsp;' + lat.min + '&rsquo;&nbsp;' + lat.sec.toFixed(1) + '&rdquo;&nbsp;' + ((latitude > 0) ? 'N' : 'S' + ','));
    $("#long").html(Math.abs(lon.deg) + '&deg;&nbsp;' + lon.min + '&rsquo;&nbsp;' + lon.sec.toFixed(1) + '&rdquo;&nbsp;' + ((longitude > 0) ? 'E' : 'W'));
}

function getLatLong(response) {
    latitude = response.coords.latitude;
    longitude = response.coords.longitude;
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
}

function speedTime() { // speeed up time
    speed = Math.min(speed+1, rates.length-1);
}

function realTime() { // reset to current realtime
    ephTime = MJDToEphTime(unixToMJD(Date.now()));
    for (let i = 0; i < system.length; i++) {
        system[i].set(ephTime);
    }
    speed = 8;
}

function setTime(time) { // reset to arbitrary realtime
    ephTime = MJDToEphTime(time);
    console.log(ephTime);
    for (let i = 0; i < system.length; i++) {
        system[i].set(ephTime);
    }
    speed = 8;
}

function localSiderealTime(ephTime) {
    const t = MJDtoUnix(ephTimeToMJD(ephTime));
    const timeUTC = t.getUTCHours() + t.getUTCMinutes()/60 + t.getUTCSeconds()/3600 + t.getUTCMilliseconds()/3600000;
    return lst = (100.46 + (0.985647 * ephTime * daysPerCent) + longitude + (15 * timeUTC) + 360) % 360;
}

function altAz(ra, dec) {
    const t = MJDtoUnix(ephTimeToMJD(ephTime));
    const hourAngle = ((localSiderealTime(ephTime) - (ra * 15) + 360) % 360) * toRad;
    console.log;
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

function lerp(start, end, x) { // linear interpolation
    return (end - start) * x + start;
}

// light functions
function apparentMag(i) { // apparent magnitude
    const dBO = i.toEarth.length();
    const dBS = i.toSun;
    let cAlpha = (dBO * dBO + dBS * dBS - 1) / (2 * dBO * dBS);
    alpha = (Math.abs(cAlpha) > 1) ? 1 : Math.acos(cAlpha); // patch for the Moon
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
