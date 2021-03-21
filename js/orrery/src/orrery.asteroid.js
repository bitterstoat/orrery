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

