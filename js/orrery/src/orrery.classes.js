class Body { // superclass for orbiting bodies - do not use directly
    constructor (params) {
        this.name = this.hasData(params.name) ? params.name : "Unnamed";
        this.displayName = this.name;
        this.type = this.hasData(params.type) ? parseFloat(params.type) : 3;
        this.epoch = this.hasData(params.epoch) ? parseFloat(params.epoch) : 51543;
        this.semiMajorAxis = this.hasData(params.a) ? parseFloat(params.a) : 1;
        this.eccentricity = this.hasData(params.e) ? parseFloat(params.e) : 0;
        this.inclination = this.hasData(params.inc) ? parseFloat(params.inc) * toRad : 0; // convert angles to radians
        this.w = this.hasData(params.w) ? parseFloat(params.w) * toRad : 0;
        this.longAscNode = this.hasData(params.omega) ? parseFloat(params.omega) * toRad : 0;
        this.period = Math.pow(this.semiMajorAxis, 1.5) / 100; // store period in century time
        this.thetaDot = this.hasData(params.thetaDot) ? parseFloat(params.thetaDot) * toRad : 0;
        this.ringRadius = this.hasData(params.ringRadius) ? parseFloat(params.ringRadius) : 0;
        this.texture = this.hasData(params.texture) ? params.texture : "default";
        this.ringTexture = this.hasData(params.ringTexture) ? params.ringTexture : "";
        this.absoluteMag = this.hasData(params.H) ? parseFloat(params.H) : 7;
        this.zoomRatio = this.hasData(params.zoomRatio) ? parseFloat(params.zoomRatio) : 1000;
        this.radius = this.hasData(params.radius) ? parseFloat(params.radius).toFixed(3) : estRadius(this.absoluteMag).toFixed(3);
        this.mass = this.hasData(params.mass) ? (parseFloat(params.mass) * 10e+17).toFixed(3) : (8.7523e+9 * Math.pow(this.radius, 3)).toFixed(3); // mass estimation for 2.5g/cm^-3
        this.exagRadius = this.radius / AU * exagScale;
        this.meanOrbit = this.semiMajorAxis * (1 + this.eccentricity * this.eccentricity / 2);
        this.periapsis = (1 - this.eccentricity) * this.semiMajorAxis;
        this.apoapsis = (1 + this.eccentricity) * this.semiMajorAxis;

        // associated links
        this.info = this.hasData(params.info) ? params.info : "default";
        this.wiki = this.hasData(params.wiki) ? "https://en.wikipedia.org/wiki/" + params.wiki : "default";
        this.wikipic = this.hasData(params.wikipic) ? "https://upload.wikimedia.org/wikipedia/commons/" + params.wikipic : "default"
        
        this.axisRA = (typeof params.axisRA != "undefined") ? parseFloat(params.axisRA) * toRad : 0;
        this.axisDec = (typeof params.axisDec != "undefined") ? parseFloat(params.axisDec) * toRad : Math.PI /2;
        this.path = {};
        this.toSun = 0;
        this.toEarth = 0;

        // retain initial epoch values
        this.aStart = this.semiMajorAxis;
        this.eStart = this.eccentricity;    
        this.incStart = this.inclination;
        this.omegaStart = this.longAscNode;
    }

    hasData(ref) {
        return (typeof ref != "undefined" && ref.length > 0);
    }

    phaseIntegral(alpha) { // metric for reflected light
        return (2 / 3) * ((1 - alpha / Math.PI) * Math.cos(alpha) + 1 / Math.PI * Math.sin(alpha));
    }
}

class Planet extends Body {
    constructor(params) {
        super (params);
        this.aDot = this.hasData(params.aDot) ? parseFloat(params.aDot) : 0;
        this.eDot = this.hasData(params.eDot) ? parseFloat(params.eDot) : 0;
        this.iDot = this.hasData(params.iDot) ? parseFloat(params.iDot) * toRad : 0; // convert angles to radians
        this.meanLongitude = this.hasData(params.l) ? parseFloat(params.l) * toRad : 0;
        this.longPeriapsis = this.w;
        this.argPeriapsis = this.longPeriapsis - this.longAscNode;
        this.lDot = this.hasData(params.lDot) ? parseFloat(params.lDot) * toRad : 100;
        this.wDot = this.hasData(params.wDot) ? parseFloat(params.wDot) * toRad : 0;
        this.omegaDot = this.hasData(params.omegaDot) ? parseFloat(params.omegaDot) * toRad : 0;
        this.b = this.hasData(params.b) ? parseFloat(params.b) : 0;
        this.c = this.hasData(params.c) ? parseFloat(params.c) : 0;
        this.s = this.hasData(params.s) ? parseFloat(params.s) : 0;
        this.f = this.hasData(params.f) ? parseFloat(params.f) * toRad : 0;
        this.phase = this.hasData(params.phase) ? parseFloat(params.phase) * toRad : 1.4;
    
        // retain initial epoch values
        this.aStart = this.semiMajorAxis;
        this.eStart = this.eccentricity;
        this.incStart = this.inclination;
        this.lStart = this.meanLongitude;
        this.wStart = this.longPeriapsis;
        this.omegaStart = this.longAscNode;
        this.phaseStart = this.phase;
    } 

    set(t) { // update Keplerian orbital elements from the given epoch
        const offset = t - MJDToEphTime(this.epoch);
        this.semiMajorAxis = offset * this.aDot + this.aStart;
        this.eccentricity = offset * this.eDot + this.eStart;
        this.inclination = offset * this.iDot + this.incStart;
        this.meanLongitude = offset * this.lDot + this.lStart;
        this.longPeriapsis = offset * this.wDot + this.wStart;
        this.omegaDot = offset * this.omegaDot + this.omegaStart;
        this.phase = offset * this.thetaDot + this.phaseStart;
    }

    updateOrbit(dt) {
        this.meanLongitude += (this.lDot * dt); // update longitude

        // plot full orbit in local space
        this.localOrbit = this.longPoints(this.meanLongitude, this.longPeriapsis, this.eccentricity, this.semiMajorAxis, this.b, this.c, this.s, this.f, orbitPoints);

        this.celestial = []; // compute celestial coordinates; celestialPos is current location
        for (let i=0; i<this.localOrbit.length; i++) {
            this.celestial.push(celestial(this.argPeriapsis, this.longAscNode, this.inclination, this.localOrbit[i].x, this.localOrbit[i].y));
        }
        this.celestialPos = this.celestial[0];
    }

    update(dt) {
        this.meanLongitude += (this.lDot * dt);
        this.localOrbit = this.longPoints(this.meanLongitude, this.longPeriapsis, this.eccentricity, this.semiMajorAxis, this.b, this.c, this.s, this.f)
        this.celestialPos = celestial(this.argPeriapsis, this.longAscNode, this.inclination, this.localOrbit[0].x, this.localOrbit[0].y);
    }

    precess(dt) { // periodic updates to the orbital elements - expand to redraw orbital paths
        this.semiMajorAxis += (this.aDot * dt);
        this.eccentricity += (this.eDot * dt);
        this.inclination += (this.iDot * dt);
        this.longPeriapsis += (this.wDot * dt);
        this.longAscNode += (this.omegaDot * dt);
    }

    longPoints(meanLongitude, longPeriapsis, eccentricity, semiMajorAxis, b, c, s, f, points = 1) { // generate longitude points
        let orbitPoints = [];
        const span = Math.PI * 2 / points;
        let meanAnomaly = meanLongitude - longPeriapsis + (b * ephTime * ephTime) + (c * Math.cos(f * ephTime)) + (s * Math.sin(f * ephTime));
        for (let i=0; i<points; i++) {
            meanAnomaly += span;
            const point = plotPoint(meanAnomaly, eccentricity, semiMajorAxis, i==0);
            orbitPoints.push(point);
        }
        return orbitPoints;
    }
}

class Asteroid extends Body {
    constructor(params) {
        super (params);
        this.name += "Asteroid";
        this.catalogNumber = this.hasData(params.num) ? parseFloat(params.num) : 0;
        this.lDot = 360 / this.period * toRad; // get lDot from period
        this.argPeriapsis = this.w;
        this.meanAnomaly = (typeof params.m != "undefined") ? parseFloat(params.m) * toRad : 0;
        this.meanLongitude = 0;
        this.phase = 0;
        this.slope = this.hasData(params.G) ? parseFloat(params.G) : 0.15;
        this.info = (this.info == "default" && this.catalogNumber > 0) ? "Asteroid (" + this.catalogNumber + ")" : this.info;
        this.wiki = (this.wiki == "default" && this.catalogNumber > 0 && this.displayName != "Unnamed") ? "https://en.wikipedia.org/wiki/" + this.catalogNumber + "_" + this.displayName : this.wiki;

        // retain initial epoch values
        this.lStart = this.meanLongitude;
        this.wStart = this.argPeriapsis;
        this.phaseStart = this.phase;
    } 

    set(t) { // update Keplerian orbital elements from the given epoch
        const offset = t - MJDToEphTime(this.epoch);
        this.meanLongitude = offset * this.lDot + this.lStart;
        this.phase = this.phaseStart;
    }

    updateOrbit(dt) {
        this.meanLongitude += (this.lDot * dt); // update longitude

        // plot full orbit in local space
        this.localOrbit = this.longPoints(this.meanAnomaly, this.eccentricity, this.semiMajorAxis, orbitPoints);

        this.celestial = []; // compute celestial coordinates; celestialPos is current location
        for (let i=0; i<this.localOrbit.length; i++) {
            this.celestial.push(celestial(this.argPeriapsis, this.longAscNode, this.inclination, this.localOrbit[i].x, this.localOrbit[i].y));
        }
        this.celestialPos = this.celestial[0];
    }

    update(dt) {
        this.meanLongitude += (this.lDot * dt); // update longitude
        this.localOrbit = this.longPoints(this.meanAnomaly, this.eccentricity, this.semiMajorAxis);
        this.celestialPos = celestial(this.argPeriapsis, this.longAscNode, this.inclination, this.localOrbit[0].x, this.localOrbit[0].y);
    }

    longPoints(meanAnomaly, eccentricity, semiMajorAxis, points = 1) { // generate longitude points
        let orbitPoints = [];
        meanAnomaly += this.meanLongitude;
        const span = Math.PI * 2 / points;
        for (let i=0; i<points; i++) {
            meanAnomaly += span;
            const point = plotPoint(meanAnomaly, eccentricity, semiMajorAxis, i==0);
            orbitPoints.push(point);
        }
        return orbitPoints;
    }

    phaseIntegral(alpha) {
        const a = Math.pow(-3.332 * Math.pow(Math.tan(alpha / 2), 0.631 ), 10);
        const b = Math.pow(-1.862 * Math.pow(Math.tan(alpha / 2), 1.218 ), 10);
        return (1 - this.slope) * a  + this.slope * b;
    }
}

class Moon extends Body {
    constructor(params) {
        super (params);
        this.name += "Moon";
        this.argPeriapsis = this.w;
        this.meanAnomaly = (typeof params.m != "undefined") ? parseFloat(params.m) * toRad : 0;
        this.meanLongitude = 0;
        this.phase = 0;
        this.orbiting = this.hasData(params.orbiting) ? params.orbiting : "default";
        this.orbitRef = this.hasData(params.orbitRef) ? params.orbitRef : "E";
        this.orbitRA = this.hasData(params.orbitRA) ? parseFloat(params.orbitRA) * toRad : 0;
        this.orbitDec = this.hasData(params.orbitDec) ? parseFloat(params.orbitDec) * toRad : 90;
        this.tilt = this.hasData(params.tilt) ? parseFloat(params.tilt) * toRad : 0;
        this.period = this.hasData(params.P) ? parseFloat(params.P) / daysPerCent : this.period;
        this.lDot = this.hasData(params.lDot) ? parseFloat(params.lDot) * toRad : 100;
        this.exagRadius = this.radius / AU;
        this.semiMajorAxis = this.semiMajorAxis / AU;
        this.info = (this.info == "default") ? "Moon of " + this.orbiting : this.info;
        this.orbitId = 0;
        
        // retain initial epoch values
        this.lStart = this.meanLongitude;
        this.wStart = this.argPeriapsis;
        this.phaseStart = this.phase;
    } 

    set(t) { // update Keplerian orbital elements from the given epoch
        const offset = t - MJDToEphTime(this.epoch);
        this.meanLongitude = offset * this.lDot + this.lStart;
        this.phase = this.phaseStart;
    }

    updateOrbit(dt) {
        this.meanLongitude += (this.lDot * dt); // update longitude

        // plot full orbit in local space
        this.localOrbit = this.longPoints(this.meanAnomaly, this.eccentricity, this.semiMajorAxis, (this.orbitRef == "Q" || this.orbitRef == "B") ? 1 : orbitPoints) // skip paths for Q and B until that's figured out
        this.celestial = []; // compute celestial coordinates; celestialPos is current location
        for (let i=0; i<this.localOrbit.length; i++) {
            this.planetary = planetary(this.argPeriapsis, this.longAscNode, this.incStart, this.orbitRA, this.orbitDec, this.localOrbit[i].x, this.localOrbit[i].y, this.orbitRef, this.orbitId);
            this.celestial.push(this.planetary.add(scene.children[system[this.orbitId].childId].position));
        }
        this.celestialPos = this.celestial[0];
    }

    update(dt) {
        this.meanLongitude += (this.lDot * dt); // update longitude
        this.localOrbit = this.longPoints(this.meanAnomaly, this.eccentricity, this.semiMajorAxis);
        this.planetaryPos = planetary(this.argPeriapsis, this.longAscNode, this.incStart, this.orbitRA, this.orbitDec, this.localOrbit[0].x, this.localOrbit[0].y, this.orbitRef, this.orbitId);
        this.celestialPos = this.planetaryPos.add(scene.children[system[this.orbitId].childId].position);
    }

    longPoints(meanAnomaly, eccentricity, semiMajorAxis, points = 1) { // generate longitude points
        let orbitPoints = [];
        meanAnomaly += this.meanLongitude;
        const span = Math.PI * 2 / points;
        for (let i=0; i<points; i++) {
            meanAnomaly += span;
            const point = plotPoint(meanAnomaly, eccentricity, semiMajorAxis, i==0);
            orbitPoints.push(point);
        }
        return orbitPoints;
    }
}

class Comet extends Asteroid {
    constructor(params) {
        super (params);
        this.name += "Comet";
        this.info = (this.info == "default") ? "Periodic comet" : this.info;
        this.periapsis = this.hasData(params.q) ? parseFloat(params.q) : 1;
        this.periapsisTime = this.hasData(params.Tp) ? this.cometDate(params.Tp) : unixToMJD(Date.parse("2000-01-01T00:00:00"));

        if (this.eccentricity < 1) { // periodic comets
            this.semiMajorAxis = this.periapsis / (1 - this.eccentricity);
            this.apoapsis = (1 + this.eccentricity) * this.semiMajorAxis;
        }
        this.period = Math.pow(this.semiMajorAxis, 1.5) / 100; // store period in century time
        this.lDot = 360 / this.period * toRad; // get lDot from period
        this.longPeriapsis = this.w;
        this.argPeriapsis = this.longPeriapsis - this.longAscNode;
        this.meanAnomaly = this.meanLongitude - this.longPeriapsis;

        // retain initial epoch values
        this.incStart = this.inclination;
        this.wStart = this.longPeriapsis;
    }

    set(t) { // update Keplerian orbital elements from the given epoch
        const offset = t - MJDToEphTime(this.periapsisTime);
        this.meanLongitude = offset * this.lDot + this.wStart;
        this.phase = this.phaseStart;
    }

    updateOrbit(dt) {
        this.meanLongitude += (this.lDot * dt); // update longitude

        // plot full orbit in local space
        this.localOrbit = this.longPoints(this.meanLongitude, this.longPeriapsis, this.eccentricity, this.semiMajorAxis, orbitPoints);

        this.celestial = []; // compute celestial coordinates; celestialPos is current location
        for (let i=0; i<this.localOrbit.length; i++) {
            this.celestial.push(celestial(this.argPeriapsis, this.longAscNode, this.inclination, this.localOrbit[i].x, this.localOrbit[i].y));
        }
        this.celestialPos = this.celestial[0];
    }

    update(dt) {
        this.meanLongitude += (this.lDot * dt); // update longitude
        this.localOrbit = this.longPoints(this.meanLongitude, this.longPeriapsis, this.eccentricity, this.semiMajorAxis);
        this.celestialPos = celestial(this.argPeriapsis, this.longAscNode, this.inclination, this.localOrbit[0].x, this.localOrbit[0].y);
    }

    longPoints(meanLongitude, longPeriapsis, eccentricity, semiMajorAxis, points = 1) { // generate longitude points
        let orbitPoints = [];
        const span = Math.PI * 2 / points;
        let meanAnomaly = meanLongitude - longPeriapsis;
        for (let i=0; i<points; i++) {
            meanAnomaly += span;            
            const point = plotPoint(meanAnomaly, eccentricity, semiMajorAxis, i==0);
            orbitPoints.push(point);
        }
        return orbitPoints;
    }

    cometDate(d) {
        const dayPart = decToMinSec(parseFloat(d.substr(8))*24);
        const date = d.substr(0, 4) + "-" + d.substr(4, 2) + "-" + d.substr(6, 2) + "T" + ("0" + dayPart.deg.toString().slice(-1)) + 
        ":" + ("0" + dayPart.min.toString().slice(-1)) + ":" + ("0" + dayPart.sec.toString().slice(-1));
        return unixToMJD(Date.parse(date));
    }
}
