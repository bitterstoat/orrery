import * as ORR from './init.js';

/**
 * Create a planet.
 * @constructor
 * @param {float} aDot - rate of semimajor axis precession in AU per century
 * @param {float} eDot - rate of eccentricity precession per century
 * @param {float} iDot - rate in inclination precession in degrees per century
 * @param {float} meanLongitude - in degrees
 * @param {float} lDot - rate of longitude in degrees per century
 * @param {float} wDot - rate of argument of periapsis precession in degrees per century
 * @param {float} omegaDot - rate of longitude of ascending node precession in drgees per century
 * @param {float} b - extended ephemeris parameter b
 * @param {float} c - extended ephemeris parameter c
 * @param {float} s - extended ephemeris parameter s
 * @param {float} f - extended ephemeris parameter f in degrees
 * @param {float} phase - rotation angle at epoch in degrees
 */
export class Planet extends ORR.Body {
    constructor(params) {
        super (params);
        this.aDot = this.hasData(params.aDot) ? parseFloat(params.aDot) : 0;
        this.eDot = this.hasData(params.eDot) ? parseFloat(params.eDot) : 0;
        this.iDot = this.hasData(params.iDot) ? parseFloat(params.iDot) * ORR.toRad : 0; // convert angles to radians
        this.meanLongitude = this.hasData(params.l) ? parseFloat(params.l) * ORR.toRad : 0;
        this.longPeriapsis = this.w;
        this.argPeriapsis = this.longPeriapsis - this.longAscNode;
        this.lDot = this.hasData(params.lDot) ? parseFloat(params.lDot) * ORR.toRad : 100;
        this.wDot = this.hasData(params.wDot) ? parseFloat(params.wDot) * ORR.toRad : 0;
        this.omegaDot = this.hasData(params.omegaDot) ? parseFloat(params.omegaDot) * ORR.toRad : 0;
        this.b = this.hasData(params.b) ? parseFloat(params.b) : 0;
        this.c = this.hasData(params.c) ? parseFloat(params.c) : 0;
        this.s = this.hasData(params.s) ? parseFloat(params.s) : 0;
        this.f = this.hasData(params.f) ? parseFloat(params.f) * ORR.toRad : 0;

        this.phase = this.hasData(params.phase) ? parseFloat(params.phase) * ORR.toRad : 0;
        this.moons = 0;
        this.largestMoon = "";
        this.largestMoonRadius = 0;
        this.secondMoon = "";
    
        // retain initial epoch values
        this.aStart = this.semiMajorAxis;
        this.eStart = this.eccentricity;
        this.incStart = this.inclination;
        this.lStart = this.meanLongitude;
        this.wStart = this.longPeriapsis;
        this.omegaStart = this.longAscNode;
        this.phaseStart = this.phase;
    } 

    /**
     * Update Keplerian orbital elements from the given epoch.
     * @param {float} t - Ephemeris time 
     */
    set(t) { // update Keplerian orbital elements from the given epoch
        const offset = t - ORR.MJDToEphTime(this.epoch);
        this.semiMajorAxis = offset * this.aDot + this.aStart;
        this.eccentricity = offset * this.eDot + this.eStart;
        this.inclination = offset * this.iDot + this.incStart;
        this.meanLongitude = offset * this.lDot + this.lStart;
        this.longPeriapsis = offset * this.wDot + this.wStart;
        this.longAscNode = offset * this.omegaDot + this.omegaStart;
        this.phase = offset * this.thetaDot + this.phaseStart;
    }

    /**
     * Plot full orbit in local space.
     */
    updateOrbit() {
        this.localOrbit = this.longPoints(this.meanLongitude, this.longPeriapsis, this.eccentricity, this.semiMajorAxis, this.b, this.c, this.s, this.f, ORR.orbitPlot.points);

        this.celestial = []; // compute celestial coordinates; celestialPos is current location
        for (let i=0; i<this.localOrbit.length; i++) {
            this.celestial.push(ORR.celestial_THREE(this.argPeriapsis, this.longAscNode, this.inclination, this.localOrbit[i].x, this.localOrbit[i].y));
        }
        this.celestialPos = this.celestial[0];
    }

    /**
     * Update longitude.
     * @param {float} dt - Delta time
     */
    update(dt) {  
        this.meanLongitude += (this.lDot * dt);
        this.localOrbit = this.longPoints(this.meanLongitude, this.longPeriapsis, this.eccentricity, this.semiMajorAxis, this.b, this.c, this.s, this.f)
        this.celestialPos = ORR.celestial_THREE(this.argPeriapsis, this.longAscNode, this.inclination, this.localOrbit[0].x, this.localOrbit[0].y);
    }

    /**
     * Periodic updates to the orbital elements.
     * @param {float} dt - Delta time
     */
    precess(dt) {
        this.semiMajorAxis += (this.aDot * dt);
        this.eccentricity += (this.eDot * dt);
        this.inclination += (this.iDot * dt);
        this.longPeriapsis += (this.wDot * dt);
        this.longAscNode += (this.omegaDot * dt);
    }

    /**
     * Plot longitude points in the orbital plane.
     * @param {float} meanAnomaly 
     * @param {float} eccentricity 
     * @param {float} semiMajorAxis 
     * @param {number} points - Number of points, default 1 
     * @returns {array} [THREE.Vector3]
     */
    longPoints(meanLongitude, longPeriapsis, eccentricity, semiMajorAxis, b, c, s, f, points = 1) {
        const orbitArray = [];
        const span = Math.PI * 2 / points;
        let meanAnomaly = meanLongitude - longPeriapsis + (b * ORR.times.ephTime * ORR.times.ephTime) + (c * Math.cos(f * ORR.times.ephTime)) + (s * Math.sin(f * ORR.times.ephTime));
        for (let i=0; i<points; i++) {
            meanAnomaly += span;
            const point = ORR.plotPoint(meanAnomaly, eccentricity, semiMajorAxis, i==0);
            orbitArray.push(point);
        }
        return orbitArray;
    }
}