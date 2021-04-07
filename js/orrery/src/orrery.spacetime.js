import * as Orrery from "./orrery.init.js"

// spatial functions
export function plotPoint(meanAnomaly, eccentricity, semiMajorAxis, runKepler) { // plot Orrery.groundPosition.longitudes to orbital path
    const eccAnomaly = (runKepler && Orrery.orbitPlot.points == 1) ? kepler(eccentricity, meanAnomaly) : meanAnomaly;
    const localPoint = new THREE.Vector2( semiMajorAxis * (Math.cos(eccAnomaly) - eccentricity), semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(eccAnomaly));
    return localPoint;
}

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

export function celestial_THREE(longPeriapsis, longAscNode, inclination, xLocal, yLocal) { // transform to Cartesian coordinates relative to the celestial sphere
    const v = new THREE.Vector3(xLocal, 0, yLocal);
    v.applyAxisAngle( Orrery.celestialZAxis, longPeriapsis ).applyAxisAngle( Orrery.celestialXAxis, inclination ).applyAxisAngle( Orrery.celestialZAxis, longAscNode );
    return v.applyAxisAngle( Orrery.celestialXAxis, Orrery.eclInclination );
}

export function planetary(longPeriapsis, longAscNode, inclination, ra, dec, xLocal, yLocal, orbitRef, orbitId) { // transform to Cartesian coordinates relative to an arbitrary axis
    let v = new THREE.Vector3(xLocal, 0, yLocal).applyAxisAngle( Orrery.celestialZAxis, longPeriapsis + longAscNode );
    const y = new THREE.Vector3(0, 0, 1);
    switch (orbitRef) {
        case "L" : // relative to local Lagrangian
            v.applyAxisAngle(y, Math.PI/2 - dec).applyAxisAngle(Orrery.celestialZAxis, ra);
        break;
        case "Q" : // relative to the planet's equator
            v.applyAxisAngle(y, Math.PI/2 - Orrery.system[orbitId].axisDec + inclination).applyAxisAngle(Orrery.celestialZAxis, Orrery.system[orbitId].axisRA);
        break;
        default: // aka "E", relative to the ecliptic
            v = celestial(longPeriapsis, longAscNode, inclination, xLocal, yLocal);
    }
    return v;
}

export function celestial(longPeriapsis, longAscNode, inclination, xLocal, yLocal) { // legacy version as written in the textbook
    const cosW = Math.cos(longPeriapsis); const sinW = Math.sin(longPeriapsis);
    const cosO = Math.cos(longAscNode); const sinO = Math.sin(longAscNode);
    const cosI = Math.cos(inclination); const sinI = Math.sin(inclination);
    const x = (cosW * cosO - sinW * sinO * cosI) * xLocal + (-1 * sinW * cosO - cosW * sinO * cosI) * yLocal;
    const y = (cosW * sinO + sinW * cosO * cosI) * xLocal + (-1 * sinW * sinO + cosW * cosO * cosI) * yLocal;
    const z = (sinW * sinI) * xLocal + (cosW * sinI) * yLocal;
    return new THREE.Vector3(x, z, y).applyAxisAngle( new THREE.Vector3(1, 0, 0), Orrery.eclInclination);
}

export function reAxis(obj, ra, dec) {
    obj.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), Math.PI/2 - dec);
    obj.rotateOnWorldAxis(Orrery.celestialZAxis, ra);
}

export function orbitPath(i) { // plot orbital paths
    Orrery.system[i].updateOrbit();
    const orbitPath = Orrery.system[i].celestial;
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints( orbitPath );
    const path = new THREE.LineLoop( orbitGeometry, Orrery.pathMaterials[Orrery.system[i].type]);
    path.initMaterial = Orrery.pathMaterials[Orrery.system[i].type];
    path.name = "path" + i;
    return path;
}

export function redraw(i) { // plot orbital paths
    Orrery.orbitPlot.points = Orrery.pointCount;
    Orrery.system[i].updateOrbit();
    Orrery.paths[i].geometry = new THREE.BufferGeometry().setFromPoints( Orrery.system[i].celestial );
    Orrery.orbitPlot.points = 1;
}

export function RADecToVector(ra, dec) { // right ascension and declination to vector
    const v = new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), (90-dec)*Orrery.toRad);
    return v.applyAxisAngle(new THREE.Vector3(0, 1, 0), ((ra + 6) % 24) * 15 * Orrery.toRad );
}

export function vectortoRadec(v) { // vector to right ascension and declination
    return { ra: (Math.atan2(v.x, v.z) * Orrery.toDeg / 15 + 42 ) % 24, 
        dec:v.angleTo(new THREE.Vector3(v.x, 0, v.z)) * Math.sign(v.y) * Orrery.toDeg 
    };
}

export function decToMinSec(n) { // decimal angle to DMS
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

export function estRadius(h, p = 0.15) { // estimate asteroid radius from absolute magnitude
    return 664.5 / Math.sqrt(p) * Math.pow( 10, h * -0.2);
}

export function visViva(mu, r, a) { // compute instantaneous orbital speed
    return Math.sqrt(mu * (2/r/Orrery.AU - 1/a/Orrery.AU )) / 1000;
}

export function displayLatLong(a, b) {
    const lat = decToMinSec(a);
    const lon = decToMinSec(b);
    $("#lat").html(Math.abs(lat.deg) + '&deg;&nbsp;' + lat.min + '&rsquo;&nbsp;' + lat.sec.toFixed(1) + '&rdquo;&nbsp;' + ((lat.sign == "-") ? 'S,' : 'N,'));
    $("#long").html(Math.abs(lon.deg) + '&deg;&nbsp;' + lon.min + '&rsquo;&nbsp;' + lon.sec.toFixed(1) + '&rdquo;&nbsp;' + ((lon.sign == "-") ? 'W' : 'E'));
}

export function getLatLong(response) {
    Orrery.groundPosition.latitude = response.coords.latitude;
    Orrery.groundPosition.longitude = response.coords.longitude;
    Orrery.groundPosition.default = false;
    displayLatLong(Orrery.groundPosition.latitude, Orrery.groundPosition.longitude);
}

// temporal functions 
export function unixToMJD(d) { // Unix time to modified Julian Date
    return d / Orrery.DayInMillis + Orrery.UnixTimeZeroInMJD; 
} 

export function MJDToEphTime(d) { // MJD to fractional centuries since J2000
    return (d - Orrery.J2KInMJD) / Orrery.daysPerCent; 
}

export function EphTimeToMJD(d) { // inverse MJDToEphTime
    return d * Orrery.daysPerCent + Orrery.J2KInMJD;
}

export function MJDtoUnix(d) { // inverse unixToMJD
    return new Date((d - Orrery.UnixTimeZeroInMJD) * Orrery.DayInMillis);
}

export function EphTimeReadout(d) { // display time
    const t = new Date((d * Orrery.daysPerCent + Orrery.J2KInMJD - Orrery.UnixTimeZeroInMJD) * Orrery.DayInMillis);
    const era = (t.getFullYear() >= 0) ? "" : " BC";
    const b = (t.getHours() % 12 == 0) ? 12 : t.getHours() % 12;
    return { a:Orrery.months[t.getMonth()] + " " + (" " + t.getDate()).slice(-2) +", " + Math.abs(parseInt(t.getFullYear())).toString() + era, 
             b: "&nbsp;&nbsp;&bull;&nbsp;&nbsp;" + (" " +  b).slice(-2) + ":" + ("0" + t.getMinutes()).slice(-2), 
             c: ":" + ("0" + t.getSeconds()).slice(-2),
             d: (t.getHours() < 12) ? " AM" : " PM"
            };
}

export function slowTime() { // slow/reverse time
    Orrery.timeManager.speed = Math.max(Orrery.timeManager.speed-1, 0);
    Orrery.timeManager.rate = Orrery.rates[Orrery.timeManager.speed];
}

export function speedTime() { // speeed up time
    Orrery.timeManager.speed = Math.min(Orrery.timeManager.speed+1, Orrery.rates.length-1);
    Orrery.timeManager.rate = Orrery.rates[Orrery.timeManager.speed];
}

export function setTime(time) { // reset to arbitrary time
    const oldTime = Orrery.timeManager.ephTime;
    Orrery.timeManager.ephTime = MJDToEphTime(time);
    const delta = Orrery.timeManager.ephTime - oldTime;
    for (let i = 0; i < Orrery.system.length; i++) {
        Orrery.system[i].set(Orrery.timeManager.ephTime);
    }
    Orrery.orbitPlot.points = Orrery.pointCount;
    for (let i = 0; i < Orrery.precessing.length; i++) {
        redraw(i);
    }
    Orrery.orbitPlot.points = 1;
    Orrery.timeManager.speed = 8;
    Orrery.timeManager.rate = Orrery.rates[Orrery.timeManager.speed];
}

export function localSiderealTime(ephTime) {
    const t = MJDtoUnix(EphTimeToMJD(ephTime));
    const timeUTC = t.getUTCHours() + t.getUTCMinutes()/60 + t.getUTCSeconds()/3600 + t.getUTCMilliseconds()/3600000;
    return (100.46 + (0.985647 * ephTime * Orrery.daysPerCent) + Orrery.groundPosition.longitude + (15 * timeUTC) + 360) % 360;
}

export function getRA(obj) {
    const earthRad = Orrery.system[Orrery.specialID.earth].radius / Orrery.AU;
        const earthSurfPos = new THREE.Vector3( earthRad * Math.cos(Orrery.groundPosition.longitude * Orrery.toRad + Orrery.system[Orrery.specialID.earth].phase), earthRad * Math.sin(Orrery.groundPosition.latitude * Orrery.toRad), earthRad * Math.sin(Orrery.groundPosition.longitude * Orrery.toRad + Orrery.system[Orrery.specialID.earth].phase));
        const parallaxPos = Orrery.system[Orrery.specialID.earth].celestialPos.clone().add(earthSurfPos).add(Orrery.system[Orrery.specialID.earth].baryPos);
        return vectortoRadec( (obj.sysId == Orrery.specialID.earth) ? parallaxPos.multiplyScalar(-1) : obj.celestialPos.clone().sub(parallaxPos) );
}

export function altAz(ra, dec, t) {
    const hourAngle = ((localSiderealTime(t) - (ra * 15) + 360) % 360) * Orrery.toRad;
    dec *= Orrery.toRad;
    const cD = Math.cos(dec);
    const lat = (90 - Orrery.groundPosition.latitude) * Orrery.toRad;
    const cL = Math.cos(lat);
    const sL = Math.sin(lat);
    const x = Math.cos(hourAngle) * cD;
    const y = Math.sin(hourAngle) * cD;
    const z = Math.sin(dec);

    const az = Math.atan2(y, x * cL - z * sL) * Orrery.toDeg + 180;
    const alt = Math.asin(x * sL + z * cL) * Orrery.toDeg;

    return { alt: alt, az: az, ha: hourAngle * Orrery.toDeg / 15 };
}

export function riseSet(obj) { // brute force rise/set time solver
    const RADec = getRA(obj);
    const day = (1 / Orrery.daysPerCent);
    const min = day / 1440; 
    const startTime = Orrery.timeManager.ephTime - 0.5 * day;
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
export function apparentMag(i) { // apparent magnitude
    const dBO = i.toEarth.length();
    const dBS = i.toSun;
    const cAlpha = (dBO * dBO + dBS * dBS - 1) / (2 * dBO * dBS);
    const alpha = (Math.abs(cAlpha) > 1) ? 1 : Math.acos(cAlpha); // patch for the Moon
    return i.absoluteMag + 5 * Math.log10( dBS * dBO ) - 2.5 * Math.log10(i.phaseIntegral(alpha));
}

export function BVToRGB(bv) { // BV color index to RGB
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

export function extinction(magnitude, alt) {
    const angle = 90-alt;
    const airmass = Math.min(1/Math.cos(angle * Orrery.toRad), Math.max(20, 6.2 * (angle) - 520));
    const extMag = 0.129 * airmass + magnitude;
    return { mag: extMag, airmass: airmass }
}