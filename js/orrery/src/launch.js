import * as ORR from "./init.js";
import * as THREE from "../../../node_modules/three/build/three.module.js";
import $ from "../../jquery/jquery.module.js";

let planetData, asteroidData, moonData, cometData, starData;
let datasets = 0;
let flags = 0;
let smallAsteroids = 0;
export const renderEl = document.body.appendChild( ORR.renderer.domElement );

/* INITITALIZATION */
$( function() {
    fullLoad();
    ORR.makeGraticules();
    ORR.makeRefPoints();
    ORR.cameraLocked.graticule.visible = false;
    document.getElementById("info").style.display = "none";
    document.getElementById("earth").style.display = "none";
    if (!ORR.groundPosition.default) {
        ORR.displayLatLong(ORR.groundPosition.latitude, ORR.groundPosition.longitude);
    }
});

function fullLoad() {
    $.ajax({ // load planet data
        url: "data/planets_3000bc_to_3000ad.csv",
        async: true,
        beforeSend: () => datasets++,
        success: (list) => planetData = $.csv.toObjects(list),
        dataType: "text",
        complete: function () {
            for (let i = 0; i < planetData.length; i++) {
                let newPlanet = new ORR.Planet(planetData[i]);
                ORR.system.push(newPlanet);
                ORR.searchLists.planetNames.push(newPlanet.name);
                ORR.precessing.push(newPlanet.name);
            }
            launch();
        }
    });


    $.ajax({ // load asteroid data
        url: "data/asteroids.csv",
        async: true,
        beforeSend: () => datasets++,
        success: (list) => asteroidData = $.csv.toObjects(list),
        dataType: "text",
        complete: function () {
            for (let i = 0; i < asteroidData.length; i++) {
                let newAsteroid = new ORR.Asteroid(asteroidData[i]);
                ORR.system.push(newAsteroid);
                ORR.searchLists.asteroidNames.push(newAsteroid.name);
            }
            launch();
        }
    });

    $.ajax({ // load extended asteroid data
        url: "data/asteroids2.csv",
        async: true,
        beforeSend: () => datasets++,
        success: (list) => asteroidData = $.csv.toObjects(list),
        dataType: "text",
        complete: function () {
            smallAsteroids = asteroidData.length;
            for (let i = 0; i < asteroidData.length; i++) {
                if (i > ORR.vars.n) { break; } // these can be reduced to improve frame rate
                let newAsteroid = new ORR.Asteroid(asteroidData[i]);
                ORR.system.push(newAsteroid);
                ORR.searchLists.asteroidNames.push(newAsteroid.name);
            }
            launch();
        }
    });

    $.ajax({ // load moon data
        url: "data/moons.csv",
        async: true,
        beforeSend: () => datasets++,
        success: (list) => moonData = $.csv.toObjects(list),
        dataType: "text",
        complete: function () {
            for (let i = 0; i < moonData.length; i++) {
                let newMoon = new ORR.Moon(moonData[i]);
                ORR.system.push(newMoon);
                ORR.moons.push(newMoon);
                ORR.searchLists.moonNames.push(newMoon.name);
            }
            launch();
        }
    });

    $.ajax({ // load comet data
        url: "data/comets.csv",
        async: true,
        beforeSend: () => datasets++,
        success: (list) => cometData = $.csv.toObjects(list),
        dataType: "text",
        complete: function () {
            for (let i = 0; i < cometData.length; i++) {
                let newComet = new ORR.Comet(cometData[i]);
                ORR.system.push(newComet);
                ORR.searchLists.cometNames.push(newComet.name);
            }
            launch();
        }
    });

    /*
    $.ajax({ // load non-periodic object data
        url: "data/hyperbolic.csv",
        async: true,
       beforeSend: () => datasets++,
        success: (list) => hyperData = $.csv.toObjects(list),
        dataType: "text",
        complete: function () {
            for (let i = 0; i < hyperData.length; i++) {
                let newHyperbolic = new Hyperbolic(hyperData[i]);
                ORR.system.push(newHyperbolic);
                ORR.searchLists.combined.push(newHyperbolic.name);
            }
            launch();
        }
    });
    */

    $.ajax({ // load background star data
        url: "data/stars_7mag.csv",
        async: true,
        success: (list) => starData = $.csv.toObjects(list),
        dataType: "text",
        complete: function () {
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const colors = [];
            for (let i = 0; i < starData.length; i++) {
                const vector = ORR.RADecToVector(parseFloat(starData[i].ra), parseFloat(starData[i].dec)).multiplyScalar(900);
                positions.push( vector.x, vector.y, vector.z );
                const luma = Math.pow(10 / (parseFloat(starData[i].mag) + 10), 4);
                const cindex = (typeof starData[i].ci != "undefined" && starData[i].ci.length > 0) ? parseFloat(starData[i].ci) : 0;
                const chroma = ORR.BVToRGB(cindex);
                colors.push( luma * chroma.r, luma * chroma.g, luma * chroma.b );
            }
            geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
            geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
            geometry.computeBoundingSphere();
            const material = new THREE.PointsMaterial( { size: 4, vertexColors: true, alphaMap: ORR.loader.load('data/disc.png'), transparent: true } );
            const starfield = new THREE.Points( geometry, material );
            starfield.name = "starfield";
            ORR.scene.add( starfield );
            ORR.cameraLocked.starfieldObj = starfield;
        }
    });
}

function launch() {
    flags++;
    if (flags == datasets) {
        if (ORR.times.parsedDate != 0 && !isNaN(ORR.times.parsedDate)) {
            ORR.times.ephTime = MJDToEphTime(unixToMJD(ORR.times.parsedDate));
        }
        ORR.searchLists.orderedNames = ORR.system.map(i => i.name); 
        for (let i = 0; i < ORR.moons.length; i++) {
            ORR.moons[i].orbitId = ORR.searchLists.orderedNames.findIndex((e) => e == ORR.moons[i].orbiting);
        }
        for (let i = 0; i < ORR.system.length; i++) {
            ORR.system[i].set(ORR.times.ephTime);
            const path = ORR.orbitPath(i);
            ORR.paths.push(path);
            ORR.system[i].sysId = i;
            ORR.system[i].path = ORR.paths.length - 1;
            if (ORR.system[i] instanceof ORR.Planet == true) {
                ORR.majorBodies.push(ORR.system[i]);
            }
            if (ORR.system[i].type < 3 || ORR.system[i] instanceof ORR.Moon == true ) {
                ORR.scene.add(path);
                ORR.scene.add(ORR.makeBody(i, ORR.system[i].exagRadius, ORR.system[i].ringRadius));
                ORR.makeLabel(i);
            } else {
                ORR.scene.add(ORR.makePoint(ORR.system[i].name, i));
            }
            ORR.system[i].childId = ORR.scene.children.length-1;
        }
        
        for (let i = 0; i < ORR.moons.length; i++) {
            ORR.paths[ORR.moons[i].path].orbitId = ORR.moons[i].orbitId;
            ORR.system[ORR.moons[i].orbitId].moons++;
            const rad = parseFloat(ORR.moons[i].radius);
            if (rad > ORR.system[ORR.moons[i].orbitId].largestMoonRadius) {
                ORR.system[ORR.moons[i].orbitId].secondMoon = ORR.system[ORR.moons[i].orbitId].largestMoon;
                ORR.system[ORR.moons[i].orbitId].largestMoon = ORR.moons[i].name;
                ORR.system[ORR.moons[i].orbitId].largestMoonRadius = rad;
            }
            $("#" + ORR.moons[i].sysId ).hide();
        }

        // barycentric bodies
        ORR.specialID.earth = ORR.searchLists.orderedNames.findIndex((e) => e == "Earth");
        ORR.specialID.moon = ORR.searchLists.orderedNames.findIndex((e) => e == "Moon");
        ORR.specialID.pluto = ORR.searchLists.orderedNames.findIndex((e) => e == "Pluto");
        ORR.specialID.charon = ORR.searchLists.orderedNames.findIndex((e) => e == "Charon");

        for (let i = 0; i < ORR.precessing.length; i++) {
            ORR.precessing[i] = ORR.searchLists.orderedNames.findIndex((e) => e == ORR.precessing[i]);
        }

        document.getElementById("smallRoids").innerHTML = smallAsteroids;
        $(".gratLabel, .extraData").hide();
        ORR.searchLists.combined = ORR.searchLists.planetNames.concat(ORR.searchLists.moonNames, ORR.searchLists.asteroidNames, ORR.searchLists.cometNames);
        
        ORR.animate(); // start the main loop
    }
}