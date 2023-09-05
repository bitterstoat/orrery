import * as ORR from "./init.js";
/**
 * Superclass for celestial bodies. Not intended for direct use.
 * @constructor
 * @param {string} name
 * @param {number} type - Body type (0: planet, 1: dwarf planets, 2: large asteroids or moons, 3: small moons (3 and up not labeled at launch), 4: small asteroids or comets (default type)
 * @param {float} epoch - in MJD
 * @param {float} semiMajorAxis - in AU
 * @param {float} eccentricity
 * @param {float} inclination - in degrees
 * @param {float} w - Argument of periapsis in degrees
 * @param {float} longAscNode - Longitude of ascending node in degrees
 * @param {float} thetaDot - Rotation rate in degrees per century
 * @param {float} ringRadius - Radius of ring system as a multiple of radius
 * @param {url} texture - Texture map for surface
 * @param {url} ringTexture - Texture map for rings
 * @param {float} asbsoluteMag - Absolute magnitude
 * @param {float} zoomRatio - Initial scale of orrery view
 * @param {float} radius - in km
 * @param {float} mass - in 10^17 kg
 * @param {string} info - Display info
 * @param {url} wiki - Wikipedia entry
 * @param {url} wikipic - Wikipedia image
 */
export class Body {
    constructor (params) {
        this.name = this.hasData(params.name) ? params.name : "Unnamed";
        this.label = this.name;
        this.type = this.hasData(params.type) ? parseFloat(params.type) : 4;
        this.epoch = this.hasData(params.epoch) ? parseFloat(params.epoch) : 51544.5;
        this.semiMajorAxis = this.hasData(params.a) ? parseFloat(params.a) : 1;
        this.eccentricity = this.hasData(params.e) ? parseFloat(params.e) : 0;
        this.inclination = this.hasData(params.inc) ? parseFloat(params.inc) * ORR.toRad : 0; // convert angles to radians
        this.w = this.hasData(params.w) ? parseFloat(params.w) * ORR.toRad : 0;
        this.longAscNode = this.hasData(params.omega) ? parseFloat(params.omega) * ORR.toRad : 0;
        this.period = Math.pow(this.semiMajorAxis, 1.5) / 100; // store period in century time
        this.thetaDot = this.hasData(params.thetaDot) ? parseFloat(params.thetaDot) * ORR.toRad : 0;
        this.ringRadius = this.hasData(params.ringRadius) ? parseFloat(params.ringRadius) : 0;
        this.texture = this.hasData(params.texture) ? params.texture : "default";
        this.ringTexture = this.hasData(params.ringTexture) ? params.ringTexture : "";
        this.absoluteMag = this.hasData(params.H) ? parseFloat(params.H) : 10;
        this.zoomRatio = this.hasData(params.zoomRatio) ? parseFloat(params.zoomRatio) : 1000;
        this.radius = this.hasData(params.radius) ? parseFloat(params.radius) : ORR.estRadius(this.absoluteMag);
        this.mass = this.hasData(params.mass) ? (parseFloat(params.mass) * 10e+17) : (8.7523e+9 * Math.pow(this.radius, 3)); // mass estimation for 2.5g/cm^-3
        this.exagRadius = this.radius / ORR.AU * ORR.exagScale;
        this.meanOrbit = this.semiMajorAxis * (1 + this.eccentricity * this.eccentricity / 2);
        this.periapsis = (1 - this.eccentricity) * this.semiMajorAxis;
        this.apoapsis = (1 + this.eccentricity) * this.semiMajorAxis;

        // associated links
        this.info = this.hasData(params.info) ? params.info : "default";
        this.wiki = this.hasData(params.wiki) ? "https://en.wikipedia.org/wiki/" + params.wiki : "default";
        this.wikipic = this.hasData(params.wikipic) ? "https://upload.wikimedia.org/wikipedia/commons/" + params.wikipic : "default"
        
        this.axisRA = (typeof params.axisRA != "undefined") ? parseFloat(params.axisRA) * ORR.toRad : 0;
        this.axisDec = (typeof params.axisDec != "undefined") ? parseFloat(params.axisDec) * ORR.toRad : Math.PI /2;
        this.path = {};
        this.toSun = 0;
        this.toEarth = 0;

        // retain initial epoch values
        this.aStart = this.semiMajorAxis;
        this.eStart = this.eccentricity;    
        this.incStart = this.inclination;
        this.omegaStart = this.longAscNode;
    }

    /**
     * Test if parameter has data.
     * @param {parameter} ref - Parameter
     * @returns {boolean} Field has data
     */
    hasData(ref) {
        return (typeof ref != "undefined" && ref.length > 0);
    }

    /**
     * Return phase integral of the incident angle.
     * @param {float} alpha - Incidence angle
     * @returns {float} Illumination parameter
     */
    phaseIntegral(alpha) { // metric for reflected light
        return (2 / 3) * ((1 - alpha / Math.PI) * Math.cos(alpha) + 1 / Math.PI * Math.sin(alpha));
    }
}