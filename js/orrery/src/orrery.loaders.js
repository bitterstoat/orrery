import { Planet, Asteroid, Moon, Comet } from './orrery.classes.js';
import { makeGraticules, makeRefPoints, cameraLocked, RADecToVector, BVToRGB, vars, loader, scene, system, planetNames, asteroidNames, moonNames, cometNames, moons, precessing, timeManager, orderedNames, orbitPath, paths, majorBodies, makeBody, makeLabel, makePoint, specialID, searchLists } from './orrery.init.js'
import { animate } from './orrery.js';
let planetData, asteroidData, moonData, cometData, starData;
let datasets = 0;
let flags = 0;
let smallAsteroids = 0;

/* INITITALIZATION */
$(document).ready( function() {
    fullLoad();
    makeGraticules();
    makeRefPoints();
    cameraLocked.graticule.visible = false;
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
                let newPlanet = new Planet(planetData[i]);
                system.push(newPlanet);
                planetNames.push(newPlanet.name);
                precessing.push(newPlanet.name);
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
                let newAsteroid = new Asteroid(asteroidData[i]);
                system.push(newAsteroid);
                asteroidNames.push(newAsteroid.name);
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
                if (i > vars.n) { break; } // these can be reduced to improve frame timeManager.rate
                let newAsteroid = new Asteroid(asteroidData[i]);
                system.push(newAsteroid);
                asteroidNames.push(newAsteroid.name);
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
                let newMoon = new Moon(moonData[i]);
                system.push(newMoon);
                moons.push(newMoon);
                moonNames.push(newMoon.name);
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
                let newComet = new Comet(cometData[i]);
                system.push(newComet);
                cometNames.push(newComet.name);
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
                system.push(newHyperbolic);
                searchLists.combined.push(newHyperbolic.name);
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
                const vector = RADecToVector(parseFloat(starData[i].ra), parseFloat(starData[i].dec)).multiplyScalar(900);
                positions.push( vector.x, vector.y, vector.z );
                const luma = Math.pow(10 / (parseFloat(starData[i].mag) + 10), 4);
                const cindex = (typeof starData[i].ci != "undefined" && starData[i].ci.length > 0) ? parseFloat(starData[i].ci) : 0;
                const chroma = BVToRGB(cindex);
                colors.push( luma * chroma.r, luma * chroma.g, luma * chroma.b );
            }
            geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
            geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
            geometry.computeBoundingSphere();
            const material = new THREE.PointsMaterial( { size: 4, vertexColors: true, alphaMap: loader.load('data/disc.png'), transparent: true } );
            const starfield = new THREE.Points( geometry, material );
            starfield.name = "starfield";
            scene.add( starfield );
            cameraLocked.starfieldObj = starfield;
        }
    });
}

function finalize() {
    flags++;
    if (flags == datasets) {
        if (timeManager.parsedDate != 0 && !isNaN(timeManager.parsedDate)) {
            timeManager.ephTime = MJDToEphTime(unixToMJD(timeManager.parsedDate));
        }
        for (let i = 0; i < system.length; i++) {
            orderedNames.push(system[i].name);
        }
        for (let i = 0; i < moons.length; i++) {
            moons[i].orbitId = orderedNames.findIndex( function(e) {
                return e == moons[i].orbiting;
            });
        }

        for (let i = 0; i < system.length; i++) {
            system[i].set(timeManager.ephTime);
            const path = orbitPath(i);
            paths.push(path);
            system[i].sysId = i;
            system[i].path = paths.length - 1;
            if (system[i].type < 3 || system[i] instanceof Moon == true ) {
                scene.add(path);
                majorBodies.push(system[i]);
                scene.add(makeBody(loader, system[i].texture, system[i].exagRadius, system[i].name, i, system[i].ringRadius, system[i].ringTexture, system[i].axisDec, system[i].axisRA, system[i].phase, system[i].thetaDot));
                makeLabel(i);
            } else {
                scene.add(makePoint(system[i].name, i));
            }
            system[i].childId = scene.children.length-1;
        }
        
        for (let i = 0; i < moons.length; i++) {
            paths[moons[i].path].orbitId = moons[i].orbitId;
            system[moons[i].orbitId].moons++;
            const rad = parseFloat(moons[i].radius);
            if (rad > system[moons[i].orbitId].largestMoonRadius) {
                system[moons[i].orbitId].secondMoon = system[moons[i].orbitId].largestMoon;
                system[moons[i].orbitId].largestMoon = moons[i].name;
                system[moons[i].orbitId].largestMoonRadius = rad;
            }
            $("#" + moons[i].sysId ).hide();
        }

        // barycentric bodies
        specialID.earth = orderedNames.findIndex( function(e) { return e == "Earth" });
        specialID.moon = orderedNames.findIndex( function(e) { return e == "Moon" });
        specialID.pluto = orderedNames.findIndex( function(e) { return e == "Pluto" });
        specialID.charon = orderedNames.findIndex( function(e) { return e == "Charon" });

        for (let i = 0; i < precessing.length; i++) {
            precessing[i] = orderedNames.findIndex( function(e) { return e == precessing[i] });
        }

        $( "#smallRoids" ).html(smallAsteroids);

        searchLists.combined = planetNames.concat(moonNames, asteroidNames, cometNames);

        animate(); // start the main loop
    }
}