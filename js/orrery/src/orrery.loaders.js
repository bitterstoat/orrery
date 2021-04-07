import * as Body from './orrery.classes.js';
import * as Orrery from "./orrery.init.js";
import { animate } from './orrery.js';
let planetData, asteroidData, moonData, cometData, starData;
let datasets = 0;
let flags = 0;
let smallAsteroids = 0;
let tags = [];

/* INITITALIZATION */
$(document).ready( function() {
    fullLoad();
    Orrery.makeGraticules();
    Orrery.makeRefPoints();
    Orrery.cameraLocked.graticule.visible = false;
});

function fullLoad() {
    $.ajax({ // load planet data
        url: "data/planets_3000bc_to_3000ad.csv",
        async: true,
        beforeSend: function() { datasets++; },
        success: function(list) { planetData = $.csv.toObjects(list); },
        dataType: "text",
        complete: function () {
            for (let i = 0; i < planetData.length; i++) {
                let newPlanet = new Body.Planet(planetData[i]);
                Orrery.system.push(newPlanet);
                Orrery.searchLists.planetNames.push(newPlanet.name);
                Orrery.precessing.push(newPlanet.name);
            }
            finalize();
        }
    });


    $.ajax({ // load asteroid data
        url: "data/asteroids.csv",
        async: true,
        beforeSend: function() { datasets++; },
        success: function(list) { asteroidData = $.csv.toObjects(list); },
        dataType: "text",
        complete: function () {
            for (let i = 0; i < asteroidData.length; i++) {
                let newAsteroid = new Body.Asteroid(asteroidData[i]);
                Orrery.system.push(newAsteroid);
                Orrery.searchLists.asteroidNames.push(newAsteroid.name);
            }
            finalize();
        }
    });

    $.ajax({ // load extended asteroid data
        url: "data/asteroids2.csv",
        async: true,
        beforeSend: function() { datasets++; },
        success: function(list) { asteroidData = $.csv.toObjects(list); },
        dataType: "text",
        complete: function () {
            smallAsteroids = asteroidData.length;
            for (let i = 0; i < asteroidData.length; i++) {
                if (i > Orrery.vars.n) { break; } // these can be reduced to improve frame rate
                let newAsteroid = new Body.Asteroid(asteroidData[i]);
                Orrery.system.push(newAsteroid);
                Orrery.searchLists.asteroidNames.push(newAsteroid.name);
            }
            finalize();
        }
    });

    $.ajax({ // load moon data
        url: "data/moons.csv",
        async: true,
        beforeSend: function() { datasets++; },
        success: function(list) { moonData = $.csv.toObjects(list); },
        dataType: "text",
        complete: function () {
            for (let i = 0; i < moonData.length; i++) {
                let newMoon = new Body.Moon(moonData[i]);
                Orrery.system.push(newMoon);
                Orrery.moons.push(newMoon);
                Orrery.searchLists.moonNames.push(newMoon.name);
            }
            finalize();
        }
    });

    $.ajax({ // load comet data
        url: "data/comets.csv",
        async: true,
        beforeSend: function() { datasets++; },
        success: function(list) { cometData = $.csv.toObjects(list); },
        dataType: "text",
        complete: function () {
            for (let i = 0; i < cometData.length; i++) {
                let newComet = new Body.Comet(cometData[i]);
                Orrery.system.push(newComet);
                Orrery.searchLists.cometNames.push(newComet.name);
            }
            finalize();
        }
    });

    /*
    $.ajax({ // load non-periodic object data
        url: "data/hyperbolic.csv",
        async: true,
        beforeSend: function() { datasets++; },
        success: function(list) { hyperData = $.csv.toObjects(list); },
        dataType: "text",
        complete: function () {
            for (let i = 0; i < hyperData.length; i++) {
                let newHyperbolic = new Hyperbolic(hyperData[i]);
                Orrery.system.push(newHyperbolic);
                Orrery.searchLists.combined.push(newHyperbolic.name);
            }
            finalize();
        }
    });
    */

    $.ajax({ // load background star data
        url: "data/stars_7mag.csv",
        async: true,
        success: function(list) { starData = $.csv.toObjects(list); },
        dataType: "text",
        complete: function () {
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const colors = [];
            for (let i = 0; i < starData.length; i++) {
                const vector = Orrery.RADecToVector(parseFloat(starData[i].ra), parseFloat(starData[i].dec)).multiplyScalar(900);
                positions.push( vector.x, vector.y, vector.z );
                const luma = Math.pow(10 / (parseFloat(starData[i].mag) + 10), 4);
                const cindex = (typeof starData[i].ci != "undefined" && starData[i].ci.length > 0) ? parseFloat(starData[i].ci) : 0;
                const chroma = Orrery.BVToRGB(cindex);
                colors.push( luma * chroma.r, luma * chroma.g, luma * chroma.b );
            }
            geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
            geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
            geometry.computeBoundingSphere();
            const material = new THREE.PointsMaterial( { size: 4, vertexColors: true, alphaMap: Orrery.loader.load('data/disc.png'), transparent: true } );
            const starfield = new THREE.Points( geometry, material );
            starfield.name = "starfield";
            Orrery.scene.add( starfield );
            Orrery.cameraLocked.starfieldObj = starfield;
        }
    });
}

function finalize() {
    flags++;
    if (flags == datasets) {
        if (Orrery.timeManager.parsedDate != 0 && !isNaN(Orrery.timeManager.parsedDate)) {
            Orrery.timeManager.ephTime = MJDToEphTime(unixToMJD(Orrery.timeManager.parsedDate));
        }
        for (let i = 0; i < Orrery.system.length; i++) {
            Orrery.searchLists.orderedNames.push(Orrery.system[i].name);
        }
        for (let i = 0; i < Orrery.moons.length; i++) {
            Orrery.moons[i].orbitId = Orrery.searchLists.orderedNames.findIndex( function(e) {
                return e == Orrery.moons[i].orbiting;
            });
        }

        for (let i = 0; i < Orrery.system.length; i++) {
            Orrery.system[i].set(Orrery.timeManager.ephTime);
            const path = Orrery.orbitPath(i);
            Orrery.paths.push(path);
            Orrery.system[i].sysId = i;
            Orrery.system[i].path = Orrery.paths.length - 1;
            if (Orrery.system[i].type < 3 || Orrery.system[i] instanceof Body.Moon == true ) {
                Orrery.scene.add(path);
                Orrery.majorBodies.push(Orrery.system[i]);
                Orrery.scene.add(Orrery.makeBody(Orrery.loader, Orrery.system[i].texture, Orrery.system[i].exagRadius, Orrery.system[i].name, i, Orrery.system[i].ringRadius, Orrery.system[i].ringTexture, Orrery.system[i].axisDec, Orrery.system[i].axisRA, Orrery.system[i].phase, Orrery.system[i].thetaDot));
                Orrery.makeLabel(i);
            } else {
                Orrery.scene.add(Orrery.makePoint(Orrery.system[i].name, i));
            }
            Orrery.system[i].childId = Orrery.scene.children.length-1;
        }
        
        for (let i = 0; i < Orrery.moons.length; i++) {
            Orrery.paths[Orrery.moons[i].path].orbitId = Orrery.moons[i].orbitId;
            Orrery.system[Orrery.moons[i].orbitId].moons++;
            const rad = parseFloat(Orrery.moons[i].radius);
            if (rad > Orrery.system[Orrery.moons[i].orbitId].largestMoonRadius) {
                Orrery.system[Orrery.moons[i].orbitId].secondMoon = Orrery.system[Orrery.moons[i].orbitId].largestMoon;
                Orrery.system[Orrery.moons[i].orbitId].largestMoon = Orrery.moons[i].name;
                Orrery.system[Orrery.moons[i].orbitId].largestMoonRadius = rad;
            }
            $("#" + Orrery.moons[i].sysId ).hide();
        }

        // barycentric bodies
        Orrery.specialID.earth = Orrery.searchLists.orderedNames.findIndex( function(e) { return e == "Earth" });
        Orrery.specialID.moon = Orrery.searchLists.orderedNames.findIndex( function(e) { return e == "Moon" });
        Orrery.specialID.pluto = Orrery.searchLists.orderedNames.findIndex( function(e) { return e == "Pluto" });
        Orrery.specialID.charon = Orrery.searchLists.orderedNames.findIndex( function(e) { return e == "Charon" });

        for (let i = 0; i < Orrery.precessing.length; i++) {
            Orrery.precessing[i] = Orrery.searchLists.orderedNames.findIndex( function(e) { return e == Orrery.precessing[i] });
        }

        $( "#smallRoids" ).html(smallAsteroids);

        Orrery.searchLists.combined = Orrery.searchLists.planetNames.concat(Orrery.searchLists.moonNames, Orrery.searchLists.asteroidNames, Orrery.searchLists.cometNames);

        tags = $(".label");

        animate(); // start the main loop
    }
}

export { tags };