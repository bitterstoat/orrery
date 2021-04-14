import * as ORR from './init.js';

/**
 * Create a moon.
 * @constructor
 * @param {float} meanAnomaly - in degrees
 * @param {string} orbiting - Body this moon is orbiting
 * @param {string} orbitRef - Orbit frame of reference. E: Ecliptic (default), L: Lagrangian plane, Q: Equatorial
 * @param {float} orbitRA - Right ascension of orbit's axis in hours
 * @param {float} orbitDec - Declination of orbit's axis in degrees
 * @param {float} tilt - Tilt relative to the planet's equator in degrees
 * @param {float} period - in days
 * @param {float} lDot - rate of longitude in degrees per century
 */
export class Moon extends ORR.Body {
    constructor(params) {
        super (params);
        this.argPeriapsis = this.w;
        this.meanAnomaly = this.hasData(params.m) ? parseFloat(params.m) * ORR.toRad : 0;
        this.phase = 0;
        this.orbiting = this.hasData(params.orbiting) ? params.orbiting : "default";
        this.orbitRef = this.hasData(params.orbitRef) ? params.orbitRef : "E";
        this.orbitRA = this.hasData(params.orbitRA) ? parseFloat(params.orbitRA) * ORR.toRad : 0;
        this.orbitDec = this.hasData(params.orbitDec) ? parseFloat(params.orbitDec) * ORR.toRad : 90;
        this.tilt = this.hasData(params.tilt) ? parseFloat(params.tilt) * ORR.toRad : 0;
        this.period = this.hasData(params.P) ? parseFloat(params.P) / ORR.daysPerCent : this.period;
        this.lDot = this.hasData(params.lDot) ? parseFloat(params.lDot) * ORR.toRad : 100;
        this.exagRadius = this.radius / ORR.AU;
        this.semiMajorAxis = this.semiMajorAxis / ORR.AU;
        this.info = (this.info == "default") ? "Moon of " + this.orbiting : this.info;
        this.orbitId = 0;
        // this.type = 2;
        
        // retain initial epoch values
        this.mStart = this.meanAnomaly;
        this.wStart = this.argPeriapsis;
        this.phaseStart = this.phase;
    } 

    /**
     * Update Keplerian orbital elements from the given epoch.
     * @param {float} t - Ephemeris time 
     */
    set(t) { // update Keplerian orbital elements from the given epoch
        const offset = t - ORR.MJDToEphTime(this.epoch);
        this.meanAnomaly = offset * this.lDot + this.mStart;
        this.phase = this.phaseStart;
    }

    /**
     * Plot full orbit in local space.
     */
    updateOrbit() {
        // plot full orbit in local space
        this.localOrbit = this.longPoints(this.meanAnomaly, this.eccentricity, this.semiMajorAxis, ORR.orbitPlot.points);
        this.celestial = []; // compute celestial coordinates; celestialPos is current location
        for (let i=0; i<this.localOrbit.length; i++) {
            this.planetary = ORR.planetary(this.argPeriapsis, this.longAscNode, this.incStart, this.orbitRA, this.orbitDec, this.localOrbit[i].x, this.localOrbit[i].y, this.orbitRef, this.orbitId);
            this.celestial.push(this.planetary.add(ORR.scene.children[ORR.system[this.orbitId].childId].position));
        }
        this.celestialPos = this.celestial[0];
    }

    /**
     * Update longitude.
     * @param {float} dt - Delta time
     */
    update(dt) {
        this.meanAnomaly += (this.lDot * dt);
        this.localOrbit = this.longPoints(this.meanAnomaly, this.eccentricity, this.semiMajorAxis);
        this.planetaryPos = ORR.planetary(this.argPeriapsis, this.longAscNode, this.incStart, this.orbitRA, this.orbitDec, this.localOrbit[0].x, this.localOrbit[0].y, this.orbitRef, this.orbitId);
        this.celestialPos = this.planetaryPos.add(ORR.scene.children[ORR.system[this.orbitId].childId].position);
    }

    /**
     * Plot longitude points in the orbital plane.
     * @param {float} meanAnomaly 
     * @param {float} eccentricity 
     * @param {float} semiMajorAxis 
     * @param {number} points - Number of points, default 1 
     * @returns {array} [THREE.Vector3]
     */
    longPoints(meanAnomaly, eccentricity, semiMajorAxis, points = 1) {
        const orbitArray = [];
        const span = Math.PI * 2 / points;
        for (let i=0; i<points; i++) {
            meanAnomaly += span;
            const point = ORR.plotPoint(meanAnomaly, eccentricity, semiMajorAxis, i==0);
            orbitArray.push(point);
        }
        return orbitArray;
    }
}

