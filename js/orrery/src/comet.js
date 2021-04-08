import * as ORR from "./init.js" 

export class Comet extends ORR.Asteroid {
    constructor(params) {
        super (params);
        this.info = (this.info == "default") ? "Periodic comet" : this.info;
        this.periapsis = this.hasData(params.q) ? parseFloat(params.q) : 1;
        this.periapsisTime = this.hasData(params.Tp) ? this.cometDate(params.Tp) : ORR.unixToMJD(Date.parse("2000-01-01T00:00:00"));
        this.semiMajorAxis = this.periapsis / (1 - this.eccentricity);
        this.apoapsis = (1 + this.eccentricity) * this.semiMajorAxis;
        this.period = Math.pow(this.semiMajorAxis, 1.5) / 100; // store period in century time
        this.lDot = 360 / this.period * ORR.toRad; // get lDot from period
        this.longPeriapsis = this.w;
        this.argPeriapsis = this.longPeriapsis - this.longAscNode;
        this.meanAnomaly = this.meanLongitude - this.longPeriapsis;

        // retain initial epoch values
        this.incStart = this.inclination;
        this.wStart = this.longPeriapsis;
    }

    set(t) { // update Keplerian orbital elements from the given epoch
        const offset = t - ORR.MJDToEphTime(this.periapsisTime);
        this.meanLongitude = offset * this.lDot + this.wStart;
        this.phase = this.phaseStart;
    }

    updateOrbit() {
        // plot full orbit in local space
        this.localOrbit = this.longPoints(this.meanLongitude, this.longPeriapsis, this.eccentricity, this.semiMajorAxis, ORR.orbitPlot.points);

        this.celestial = []; // compute celestial coordinates; celestialPos is current location
        for (let i=0; i<this.localOrbit.length; i++) {
            this.celestial.push(ORR.celestial(this.argPeriapsis, this.longAscNode, this.inclination, this.localOrbit[i].x, this.localOrbit[i].y));
        }
        this.celestialPos = this.celestial[0];
    }

    update(dt) {
        this.meanLongitude += (this.lDot * dt); // update groundPosition.longitude
        this.localOrbit = this.longPoints(this.meanLongitude, this.longPeriapsis, this.eccentricity, this.semiMajorAxis);
        this.celestialPos = ORR.celestial(this.argPeriapsis, this.longAscNode, this.inclination, this.localOrbit[0].x, this.localOrbit[0].y);
    }

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

    cometDate(d) {
        const dayPart = ORR.decToMinSec(parseFloat(d.substr(8))*24);
        const date = d.substr(0, 4) + "-" + d.substr(4, 2) + "-" + d.substr(6, 2) + "T" + ("0" + dayPart.deg.toString().slice(-1)) + 
        ":" + ("0" + dayPart.min.toString().slice(-1)) + ":" + ("0" + dayPart.sec.toString().slice(-1));
        return ORR.unixToMJD(Date.parse(date));
    }
}
