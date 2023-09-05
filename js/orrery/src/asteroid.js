import * as ORR from './init.js';

/**
 * Create an asteroid.
 * @constructor
 * @param {number} catalogNumber - Minor Planet Designation
 * @param {float} meanAnomaly - Mean anomaly
 * @param {float} slope - Magnitude slope
 */
export class Asteroid extends ORR.Body {
    constructor(params) {
        super (params);
        this.catalogNumber = this.hasData(params.num) ? parseFloat(params.num) : 0;
        this.info = (this.info == "default") ? "Asteroid" : this.info;
        if (this.catalogNumber > 0) {
            this.info += " (Minor Planet " + this.catalogNumber + ")";
        }
        this.label = this.name;
        this.name = (this.catalogNumber != 0) ? this.catalogNumber + " " + this.name : this.name;
        this.lDot = 360 / this.period * ORR.toRad; // get lDot from period
        this.argPeriapsis = this.w;
        this.meanAnomaly = this.hasData(params.m) ? parseFloat(params.m) * ORR.toRad : 0;
        this.phase = 0;
        this.slope = this.hasData(params.G) ? parseFloat(params.G) : 0.15;
        // this.classifications = this.sieve(this);
        this.wiki = (this.wiki == "default" && this.catalogNumber > 0 && this.name != "Unnamed") ? "https://en.wikipedia.org/wiki/" + this.name.replace(" ", "_") : this.wiki;
        this.moons = 0;
        this.largestMoon = "";
        this.largestMoonRadius = 0;
        this.secondMoon = "";
        
        // retain initial epoch values
        this.mStart = this.meanAnomaly;
        this.wStart = this.argPeriapsis;
        this.phaseStart = this.phase;
    } 

    /**
     * Update Keplerian orbital elements from the given epoch.
     * @param {float} t - Ephemeris time 
     */
    set(t) { 
        const offset = t - ORR.MJDToEphTime(this.epoch);
        this.meanAnomaly = offset * this.lDot + this.mStart;
        this.phase = this.phaseStart;
    }

    /**
     * Plot full orbit in local space.
     */
    updateOrbit() {
        this.localOrbit = this.longPoints(this.meanAnomaly, this.eccentricity, this.semiMajorAxis, ORR.orbitPlot.points);

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
        this.meanAnomaly += (this.lDot * dt);
        this.localOrbit = this.longPoints(this.meanAnomaly, this.eccentricity, this.semiMajorAxis);
        this.celestialPos = ORR.celestial_THREE(this.argPeriapsis, this.longAscNode, this.inclination, this.localOrbit[0].x, this.localOrbit[0].y);
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

    phaseIntegral(alpha) {
        const a = Math.pow(-3.332 * Math.pow(Math.tan(alpha / 2), 0.631 ), 10);
        const b = Math.pow(-1.862 * Math.pow(Math.tan(alpha / 2), 1.218 ), 10);
        return (1 - this.slope) * a  + this.slope * b;
    }

    /*
    sieve(obj) {
        const aClasses = [1, 2.5, 2.706, 2.82, 3.03, 3.27];
        const periClasses = [0.7184, 0.9833, 1.1, 29];
        const MORClasses = [1.78, 2, 2.25, 2.5, 2.7, 2.8, 3.1, 3.27, 3.7, 4.2, 5.05, 5.4, 30, 39, 40.5, 47];
        const a = aClasses.findIndex( function(e) { return e > obj.semiMajorAxis });
        const p = periClasses.findIndex( function(e) { return e > obj.periapsis });
        const m = MORClasses.findIndex( function(e) { return e > obj.meanOrbit });
        const aNames = ["Aten", "Apollo", "Inner main belt", "Middle main belt", "Outer main belt"];
        const pNames = ["Mercury-crosser", "Venus-crosser", "Amor", "Scattered disc object", "Detached object"];
        const mNames = ["Hungaria", "Phocaea", "Alinda", "Pallas", "Griqua", "Cybele", "Hilda", "Trojan", "Centaur", "KBO", "Plutino", "Cubewano"];
        return {aN: a, a: aNames[a], pN:p, p: pNames[p], mN: m, m: mNames[m]};
    }
    */
}