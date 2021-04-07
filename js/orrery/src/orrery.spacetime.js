import { months, pointCount, paths, pathMaterials, system, orbitPlot, toRad, groundPosition, AU, DayInMillis, J2KInMJD, 
    UnixTimeZeroInMJD, celestialXAxis, celestialZAxis, daysPerCent, earthBary, earthRadius, eclInclination, timeManager, 
    precessing, rates, specialID, toDeg } from "./orrery.setup.js"

// spatial functions
function plotPoint(meanAnomaly, eccentricity, semiMajorAxis, runKepler) { // plot groundPosition.longitudes to orbital path
    const eccAnomaly = (runKepler && orbitPlot.points == 1) ? kepler(eccentricity, meanAnomaly) : meanAnomaly;
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

function celestial_THREE(longPeriapsis, longAscNode, inclination, xLocal, yLocal) { // transform to Cartesian coordinates relative to the celestial sphere
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

function celestial(longPeriapsis, longAscNode, inclination, xLocal, yLocal) { // legacy version as written in the textbook
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
    orbitPlot.points = pointCount;
    system[i].updateOrbit();
    paths[i].geometry = new THREE.BufferGeometry().setFromPoints( system[i].celestial );
    orbitPlot.points = 1;
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

function estRadius(h, p = 0.15) { // estimate asteroid radius from absolute magnitude
    return 664.5 / Math.sqrt(p) * Math.pow( 10, h * -0.2);
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
    groundPosition.latitude = response.coords.latitude;
    groundPosition.longitude = response.coords.longitude;
    groundPosition.default = false;
    displayLatLong(groundPosition.latitude, groundPosition.longitude);
}

// temporal functions 
function unixToMJD(d) { // Unix time to modified Julian Date
    return d / DayInMillis + UnixTimeZeroInMJD; 
} 

function MJDToEphTime(d) { // MJD to fractional centuries since J2000
    return (d - J2KInMJD) / daysPerCent; 
}

function EphTimeToMJD(d) { // inverse MJDToEphTime
    return d * daysPerCent + J2KInMJD;
}

function MJDtoUnix(d) { // inverse unixToMJD
    return new Date((d - UnixTimeZeroInMJD) * DayInMillis);
}

function EphTimeReadout(d) { // display time
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
    timeManager.speed = Math.max(timeManager.speed-1, 0);
    timeManager.rate = rates[timeManager.speed];
}

function speedTime() { // speeed up time
    timeManager.speed = Math.min(timeManager.speed+1, rates.length-1);
    timeManager.rate = rates[timeManager.speed];
}

function setTime(time) { // reset to arbitrary time
    const oldTime = timeManager.ephTime;
    timeManager.ephTime = MJDToEphTime(time);
    const delta = timeManager.ephTime - oldTime;
    for (let i = 0; i < system.length; i++) {
        system[i].set(timeManager.ephTime);
    }
    orbitPlot.points = pointCount;
    for (let i = 0; i < precessing.length; i++) {
        redraw(i);
    }
    orbitPlot.points = 1;
    timeManager.speed = 8;
    timeManager.rate = rates[timeManager.speed];
}

function localSiderealTime(ephTime) {
    const t = MJDtoUnix(EphTimeToMJD(ephTime));
    const timeUTC = t.getUTCHours() + t.getUTCMinutes()/60 + t.getUTCSeconds()/3600 + t.getUTCMilliseconds()/3600000;
    return (100.46 + (0.985647 * ephTime * daysPerCent) + groundPosition.longitude + (15 * timeUTC) + 360) % 360;
}

function getRA(obj) {
    const earthRad = system[specialID.earth].radius / AU;
        const earthSurfPos = new THREE.Vector3( earthRad * Math.cos(groundPosition.longitude * toRad + system[specialID.earth].phase), earthRad * Math.sin(groundPosition.latitude * toRad), earthRad * Math.sin(groundPosition.longitude * toRad + system[specialID.earth].phase));
        const parallaxPos = system[specialID.earth].celestialPos.clone().add(earthSurfPos).add(system[specialID.earth].baryPos);
        return vectorToRADec( (obj.sysId == specialID.earth) ? parallaxPos.multiplyScalar(-1) : obj.celestialPos.clone().sub(parallaxPos) );
}

function altAz(ra, dec, t) {
    const hourAngle = ((localSiderealTime(t) - (ra * 15) + 360) % 360) * toRad;
    dec *= toRad;
    const cD = Math.cos(dec);
    const lat = (90 - groundPosition.latitude) * toRad;
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
    const startTime = timeManager.ephTime - 0.5 * day;
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
    $("#riseSet, #earthRiseSet").html(readout);
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

export { earthRadius, earthBary, daysPerCent, UnixTimeZeroInMJD, J2KInMJD, DayInMillis, plotPoint, kepler, celestial, reAxis, orbitPath, redraw,RADecToVector, vectorToRADec, decToMinSec, estRadius, visViva, displayLatLong, getLatLong, unixToMJD, MJDToEphTime, EphTimeToMJD, MJDtoUnix, EphTimeReadout, slowTime, speedTime, setTime, localSiderealTime, getRA, altAz, riseSet, apparentMag, BVToRGB, extinction, planetary };