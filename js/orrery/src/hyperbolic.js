import * as ORR from './init.js';

/**
 * Create a body with a hyperbolic orbit
 * @constructor
 */
export class Hyperbolic extends ORR.Comet {
    constructor(params) {
        super (params);
        this.semiMajorAxis = Infinity;
        this.apoapsis = Infinity;
        this.period = Infinity;
    }
}