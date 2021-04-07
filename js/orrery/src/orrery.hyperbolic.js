import * as ORR from './orrery.body.js';

export class Hyperbolic extends ORR.Comet {
    constructor(params) {
        super (params);
        this.semiMajorAxis = Infinity;
        this.apoapsis = Infinity;
        this.period = Infinity;
    }
}