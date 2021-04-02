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

        this.phase = this.hasData(params.phase) ? parseFloat(params.phase) * toRad : 0;
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

    set(t) { // update Keplerian orbital elements from the given epoch
        const offset = t - MJDToEphTime(this.epoch);
        this.semiMajorAxis = offset * this.aDot + this.aStart;
        this.eccentricity = offset * this.eDot + this.eStart;
        this.inclination = offset * this.iDot + this.incStart;
        this.meanLongitude = offset * this.lDot + this.lStart;
        this.longPeriapsis = offset * this.wDot + this.wStart;
        this.longAscNode = offset * this.omegaDot + this.omegaStart;
        this.phase = offset * this.thetaDot + this.phaseStart;
    }

    updateOrbit() {
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

    precess(dt) { // periodic updates to the orbital elements
        this.semiMajorAxis += (this.aDot * dt);
        this.eccentricity += (this.eDot * dt);
        this.inclination += (this.iDot * dt);
        this.longPeriapsis += (this.wDot * dt);
        this.longAscNode += (this.omegaDot * dt);
    }

    longPoints(meanLongitude, longPeriapsis, eccentricity, semiMajorAxis, b, c, s, f, points = 1) { // generate longitude points
        const orbitPoints = [];
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