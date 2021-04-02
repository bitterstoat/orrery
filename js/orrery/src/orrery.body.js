class Body { // superclass for orbiting bodies - do not use directly
    constructor (params) {
        this.name = this.hasData(params.name) ? params.name : "Unnamed";
        this.type = this.hasData(params.type) ? parseFloat(params.type) : 4;
        /* BODY TYPES
            0: planet
            1: dwarf planets
            2: large asteroids or moons
            3: small moons (3 and up not labeled at launch)
            4: small asteroids or comets (default type)
        */
        this.epoch = this.hasData(params.epoch) ? parseFloat(params.epoch) : 51544.5;
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
        this.absoluteMag = this.hasData(params.H) ? parseFloat(params.H) : 10;
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