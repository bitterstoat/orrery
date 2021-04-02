class Moon extends Body {
    constructor(params) {
        super (params);
        this.argPeriapsis = this.w;
        this.meanAnomaly = this.hasData(params.m) ? parseFloat(params.m) * toRad : 0;
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
        // this.type = 2;
        
        // retain initial epoch values
        this.mStart = this.meanAnomaly;
        this.wStart = this.argPeriapsis;
        this.phaseStart = this.phase;
    } 

    set(t) { // update Keplerian orbital elements from the given epoch
        const offset = t - MJDToEphTime(this.epoch);
        this.meanAnomaly = offset * this.lDot + this.mStart;
        this.phase = this.phaseStart;
    }

    updateOrbit() {
        // plot full orbit in local space
        this.localOrbit = this.longPoints(this.meanAnomaly, this.eccentricity, this.semiMajorAxis, orbitPoints);
        this.celestial = []; // compute celestial coordinates; celestialPos is current location
        for (let i=0; i<this.localOrbit.length; i++) {
            this.planetary = planetary(this.argPeriapsis, this.longAscNode, this.incStart, this.orbitRA, this.orbitDec, this.localOrbit[i].x, this.localOrbit[i].y, this.orbitRef, this.orbitId);
            this.celestial.push(this.planetary.add(scene.children[system[this.orbitId].childId].position));
        }
        this.celestialPos = this.celestial[0];
    }

    update(dt) {
        this.meanAnomaly += (this.lDot * dt); // update longitude
        this.localOrbit = this.longPoints(this.meanAnomaly, this.eccentricity, this.semiMajorAxis);
        this.planetaryPos = planetary(this.argPeriapsis, this.longAscNode, this.incStart, this.orbitRA, this.orbitDec, this.localOrbit[0].x, this.localOrbit[0].y, this.orbitRef, this.orbitId);
        this.celestialPos = this.planetaryPos.add(scene.children[system[this.orbitId].childId].position);
    }

    longPoints(meanAnomaly, eccentricity, semiMajorAxis, points = 1) { // generate longitude points
        const orbitPoints = [];
        const span = Math.PI * 2 / points;
        for (let i=0; i<points; i++) {
            meanAnomaly += span;
            const point = plotPoint(meanAnomaly, eccentricity, semiMajorAxis, i==0);
            orbitPoints.push(point);
        }
        return orbitPoints;
    }
}

