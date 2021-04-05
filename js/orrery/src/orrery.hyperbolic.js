import * as Orrery from './orrery.body.js';

export class Hyperbolic extends Orrery.Comet {
    constructor(params) {
        super (params);
        this.semiMajorAxis = Infinity;
        this.apoapsis = Infinity;
        this.period = Infinity;
    }
}