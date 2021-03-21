document.body.appendChild( renderer.domElement );
$("#info").hide();

/* MAIN LOOP */
function animate(time) {
    let liveData = false;
    let clockElapsed = 1/clock.getDelta();
    fpsBuffer.push(clockElapsed);
    if (fpsBuffer.length > 4) {
        let sum = 0;
        for (let i = 0; i < fpsBuffer.length; i++) { sum += fpsBuffer[i]; }
        avgFPS = sum / fpsBuffer.length;
        fpsBuffer = [];
        liveData = true;
    }

    // update clock
    rate = rates[speed] * (fps / clockElapsed);
    ephTime += rate;
    sun.rotateOnAxis( new THREE.Vector3(0, 1, 0), sun.thetaDot * rate );
    let readout = ephTimeReadout(ephTime).a;
    readout += (speed > (pauseRate-3) && speed < (pauseRate+3)) ? ephTimeReadout(ephTime).b : "";
    readout += (speed > (pauseRate-2) && speed < (pauseRate+2)) ? ephTimeReadout(ephTime).c : "";
    readout += (speed > (pauseRate-3) && speed < (pauseRate+3)) ? ephTimeReadout(ephTime).d : "";
    $("#date").html( readout );
    $("#speed").html( rateDesc[speed] );
    $("#fps").html(avgFPS.toFixed(2));
    $("#mjd").html(ephTimeToMJD(ephTime).toFixed(3));
    $("#lst").html(localSiderealTime(ephTime).toFixed(3));

    for (let i = 0; i < system.length; i++) {
        // update position and rotation
        (orbitPoints > 1) ? system[i].updateOrbit(rate): system[i].update(rate);
        const body = scene.children[system[i].childId];
        body.position.x = system[i].celestialPos.x;
        body.position.y = system[i].celestialPos.y;
        body.position.z = system[i].celestialPos.z;
        body.rotateOnAxis( new THREE.Vector3(0, 1, 0), system[i].thetaDot * rate );
        system[i].toSun = system[i].celestialPos.length();
        system[i].toEarth = system[i].celestialPos.clone().sub(system[earthID].celestialPos);

        // compute body's tagspace coordinates and place label
        const tag = $('#' + i);
        let tagPos = new THREE.Vector3().setFromMatrixPosition(body.matrixWorld).project(camera);
        tagPos.x = (tagPos.x * centerX) + centerX;
        tagPos.y = (tagPos.y * centerY * -1) + centerY;
        if (tag.length) {
            if (Math.abs(tagPos.x - centerX) < centerX && Math.abs(tagPos.y - centerY) < centerY && tagPos.z < 1) {
                tag.css({ "left" : tagPos.x + 10, "top": tagPos.y - 5, "visibility" : "visible" });
            } else {
                tag.css({ "visibility" : "hidden" });
            }
        } else {
            const d = tagPos.distanceTo(mousePos);
            if (d < 15) {
                makeLabel(i);
                tempLabels.push(i);
            }
        }
        if (tempLabels.length > 4) {
            const tag = $("#" + tempLabels.shift());
            if (!tag.hasClass("active")) {
                tag.remove();
            }
        }
    }

    if (graticule.visible) {
        $(".gratLabel").show();
        for (let i = 0; i < gratLabels.length; i++) {
            const tag = gratLabels[i].label;
            let tagPos = new THREE.Vector3(gratLabels[i].x, gratLabels[i].y, gratLabels[i].z).add(camera.position);
            tagPos.project(camera);
            tagPos.x = (tagPos.x * centerX) + centerX;
            tagPos.y = (tagPos.y * centerY * -1) + centerY;
            if (Math.abs(tagPos.x - centerX) < centerX && Math.abs(tagPos.y - centerY) < centerY && tagPos.z < 1) {
                tag.css({ "left" : tagPos.x-20, "top": tagPos.y-5, "visibility" : "visible" });
            } else {
                tag.css({ "visibility" : "hidden" });
            }
        }
    } else {
        $(".gratLabel").hide();
    }

    for (let i = 0; i < moons.length; i++) {
        paths[moons[i].path].position.x = system[paths[moons[i].path].orbitId].celestialPos.x;
        paths[moons[i].path].position.y = system[paths[moons[i].path].orbitId].celestialPos.y;
        paths[moons[i].path].position.z = system[paths[moons[i].path].orbitId].celestialPos.z;
    }

    // update live info
    if (clickedLabel != "") {
        const RADec = vectorToRADec(clickedPlanet.toEarth);
        const AltAz = altAz(RADec.ra, RADec.dec);
        const elongation = 180 - clickedPlanet.toEarth.angleTo(system[earthID].celestialPos) * toDeg;
        if (liveData) {
            if (typeof clickedPlanet.orbitId == "undefined") {
                $("#orbitVel").html(visViva(sunGravConstant, clickedPlanet.toSun, clickedPlanet.semiMajorAxis).toFixed(3));
            } else {
                const toOrbiting = clickedPlanet.celestialPos.clone().sub(system[clickedPlanet.orbitId].celestialPos).length();
                $("#orbitVel").html(visViva(system[clickedPlanet.orbitId].mass * gravConstant, toOrbiting, clickedPlanet.semiMajorAxis).toFixed(3));
            }
            $("#appMag").html(apparentMag(clickedPlanet).toFixed(2));
            $("#toSun").html(clickedPlanet.toSun.toFixed(4));
            $("#toEarth").html(clickedPlanet.toEarth.length().toFixed(4));
            const raDMS = decToMinSec(RADec.ra);
            const decDMS = decToMinSec(RADec.dec);
            const altDMS = decToMinSec(AltAz.alt);
            const azDMS = decToMinSec(AltAz.az);
            const haDMS = decToMinSec(AltAz.ha);
            $("#RA").html(raDMS.deg + 'h ' + raDMS.min + '&rsquo; ' + raDMS.sec.toFixed(1));
            $("#dec").html(decDMS.deg + '&deg; ' + decDMS.min + '&rsquo; ' + decDMS.sec.toFixed(1));
            $("#alt").html(altDMS.deg + '&deg; ' + altDMS.min + '&rsquo; ' + altDMS.sec.toFixed(1));
            $("#az").html(azDMS.deg + '&deg; ' + azDMS.min + '&rsquo; ' + azDMS.sec.toFixed(1));
            $("#ha").html(haDMS.deg + 'h ' + haDMS.min + '&rsquo; ' + haDMS.sec.toFixed(1));
            $("#elong").html(elongation.toFixed(3));
        }
    }

    orbitPoints = 1; // don't need to plot full orbit after first update or precess

    TWEEN.update(time); // update tweens
    if (TWEEN.getAll().length == 0) { // lock on target after the tween
        controls.target = (clickedLabel == "") ? new THREE.Vector3() : clickedPlanet.celestialPos;

        if ( following ) {
            const followPosition = controls.target;
            const followDelta = lastFollow.sub(followPosition);
            camera.translateX(followDelta.x);
            camera.translateY(followDelta.y);
            camera.translateZ(followDelta.z);
            lastFollow = followPosition;
        } else {
            lastFollow = controls.target;
        }
    }

    starfieldObj.position.x = camera.position.x;
    starfieldObj.position.y = camera.position.y;
    starfieldObj.position.z = camera.position.z;
    graticule.position.x = camera.position.x;
    graticule.position.y = camera.position.y;
    graticule.position.z = camera.position.z;

    // render the entire scene, then render bloom scene on top
    controls.update(); // update the camera controls
    scene.traverse(darkenNonBloomed);
    bloomComposer.render();
    scene.traverse(restoreMaterial);
    finalComposer.render();
    
    requestAnimationFrame( animate );
    if (!showSplash) {
        $("#splashScreen").hide(300);
    }
}

function darkenNonBloomed( obj ) {
    if ( typeof obj.glow == "undefined" || obj.glow == false ) {
        materials[ obj.uuid ] = obj.material;
        obj.material = darkMaterial;
    }
}

function restoreMaterial( obj ) {
    if ( materials[ obj.uuid ] ) {
        obj.material = materials[ obj.uuid ];
        delete materials[ obj.uuid ];
    }
}