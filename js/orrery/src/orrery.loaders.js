/* INITITALIZATION */
$(document).ready( function () {
    $.ajax({ // load planet data
        url: "data/planets_1850ad_to_2050ad.csv",
        async: true,
        beforeSend: function() { datasets++; },
        success: function(list) { planetData = $.csv.toObjects(list); },
        dataType: "text",
        complete: function () {
            for (let i = 0; i < planetData.length; i++) {
                let newPlanet = new Planet(planetData[i]);
                system.push(newPlanet);
                contents.push(newPlanet.displayName);
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
                contents.push(newMoon.displayName);
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
                contents.push(newAsteroid.displayName);
            }
            finalize();
        }
    });

    $.ajax({ // load more asteroid data
        url: "data/asteroids2.csv",
        async: true,
        beforeSend: function() { datasets++; },
        success: function(list) { asteroidData = $.csv.toObjects(list); },
        dataType: "text",
        complete: function () {
            for (let i = 0; i < asteroidData.length; i++) {
                let newAsteroid = new Asteroid(asteroidData[i]);
                system.push(newAsteroid);
                contents.push(newAsteroid.displayName);
            }
            finalize();
        }
    });

    $.ajax({ // load asteroid moon data
        url: "data/comets.csv",
        async: true,
        beforeSend: function() { datasets++; },
        success: function(list) { cometData = $.csv.toObjects(list); },
        dataType: "text",
        complete: function () {
            for (let i = 0; i < cometData.length; i++) {
                let newComet = new Comet(cometData[i]);
                system.push(newComet);
                contents.push(newComet.displayName);
            }
            finalize();
        }
    });

    /*
    $.ajax({ // load asteroid moon data
        url: "data/moons2.csv",
        async: true,
        beforeSend: function() { datasets++; },
        success: function(list) { moonData = $.csv.toObjects(list); },
        dataType: "text",
        complete: function () {
            for (let i = 0; i < moonData.length; i++) {
                let newMoon = new Moon(moonData[i]);
                system.push(newMoon);
                moons.push(newMoon);
                contents.push(newMoon.displayName);
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
            starfieldObj = starfield;
        }
    });
});

function finalize() {
    flags++;
    if (flags == datasets) {
        for (let i = 0; i < system.length; i++) {
            system[i].set(ephTime);
            const path = orbitPath(i);
            paths.push(path);
            system[i].sysId = i;
            system[i].path = paths.length - 1;
            let added;
            if (system[i].type < 3 ) {
                scene.add(path);
                majorBodies.push(system[i]);
                added = scene.add(makeBody(loader, system[i].texture, system[i].exagRadius, system[i].name, i, system[i].ringRadius, system[i].ringTexture, system[i].axisDec, system[i].axisRA, system[i].phase, system[i].thetaDot));
                makeLabel(i);
            } else {
                added = scene.add(makePoint(system[i].name, i));
            }
            system[i].childId = scene.children.length-1;
        }
        earthID = scene.getObjectByName("Earth").sysId;
        for (let i = 0; i < moons.length; i++) {
            const orbitId = scene.getObjectByName(moons[i].orbiting).sysId;
            const sysId = scene.children[moons[i].childId].sysId;
            moons[i].orbitId = orbitId;
            moons[i].sysId = sysId;
            paths[moons[i].path].orbitId = orbitId;
            if (moons[i].type > 2) {
                scene.add(paths[moons[i].path]);
                makeLabel(moons[i].sysId);
            }
            $("#" + sysId ).hide();
        }
        makeGraticules();
        makeRefPoints();
        graticule.visible = false;
        animate(); // start the main loop
    }
}