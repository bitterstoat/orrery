import * as ORR from "./init.js";

/**
 * Create a comet.
 * @constructor
 * @param {float} periapsis - Periapsis distance in AU
 * @param {float} periapsisTime - Time of periapsis in simple timecode
 */


export class Comet extends ORR.Body {
    constructor(params) {
        super (params);
        
        this.name = this.name;
        this.label = this.name;
        this.periapsis = this.hasData(params.q) ? parseFloat(params.q) : 1;
        this.periapsisTime = this.hasData(params.Tp) ? ORR.dateCodeToMJD(params.Tp) : ORR.unixToMJD(Date.parse("2000-01-01T00:00:00"));
        this.semiMajorAxis = this.periapsis / (1 - this.eccentricity);
        this.apoapsis = (1 + this.eccentricity) * this.semiMajorAxis;
        this.period = Math.pow(this.semiMajorAxis, 1.5) / 100; // store period in century time
        this.lDot = 360 / this.period * ORR.toRad; // get lDot from period
        this.longPeriapsis = this.w;
        this.argPeriapsis = this.longPeriapsis - this.longAscNode;

        this.meanAnomaly = this.hasData(params.m) ? parseFloat(params.m) * ORR.toRad : 0;
        this.phase = 0;
        this.slope = this.hasData(params.G) ? parseFloat(params.G) : 0.15;
        // this.classifications = this.sieve(this);
        this.info = (this.info == "default") ? "Periodic comet" : this.info;
        this.wiki = (this.wiki == "default" && this.catalogNumber > 0 && this.name != "Unnamed") ? "https://en.wikipedia.org/wiki/" + this.name.replace(" ", "_") : this.wiki;
        
        // retain initial epoch values
        this.mStart = this.meanAnomaly;
        this.incStart = this.inclination;
        this.wStart = this.longPeriapsis;
        this.phaseStart = this.phase;
    } 



    /**
     * Update Keplerian orbital elements from the given epoch.
     * @param {float} t - Ephemeris time 
     */
    set(t) {
        const offset = t - ORR.MJDToEphTime(this.periapsisTime);
        this.meanLongitude = offset * this.lDot + this.wStart;
        this.phase = this.phaseStart;
    }

    /**
     * Plot full orbit in local space.
     */
    updateOrbit() {
        this.localOrbit = this.longPoints(this.meanLongitude, this.longPeriapsis, this.eccentricity, this.semiMajorAxis, ORR.orbitPlot.points);

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
        this.localOrbit = this.longPoints(this.meanLongitude, this.longPeriapsis, this.eccentricity, this.semiMajorAxis);
        this.celestialPos = ORR.celestial_THREE(this.argPeriapsis, this.longAscNode, this.inclination, this.localOrbit[0].x, this.localOrbit[0].y);
    }

    /**
     * Plot longitude points in the orbital plane.
     * @param {float} meanLongitude
     * @param {float} longPeriapsis
     * @param {float} eccentricity 
     * @param {float} semiMajorAxis 
     * @param {number} points - Number of points, default 1 
     * @returns {array} [THREE.Vector3]
     */
    longPoints(meanLongitude, longPeriapsis, eccentricity, semiMajorAxis, points = 1) {
        const orbitArray = [];
        const span = Math.PI * 2 / points;
        let meanAnomaly = meanLongitude - longPeriapsis;
        for (let i=0; i<points; i++) {
            meanAnomaly += span;            
            const point = ORR.plotPoint(meanAnomaly, eccentricity, semiMajorAxis, i==0);
            orbitArray.push(point);
        }
        return orbitArray;
    }
}
