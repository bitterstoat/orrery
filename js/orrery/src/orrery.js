import { toDeg, AU, gravConstant, sunGravConstant, earthBary, plutoBary, redraw, decToMinSec, visViva, displayLatLong, 
    EphTimeToMJD, EphTimeReadout, localSiderealTime, getRA, altAz, riseSet, apparentMag, extinction, fps, rates, rateDesc, 
    materials, pauseRate, system, moons, paths, gratLabels, precessing, specialID, center, stateManager, 
    cameraLocked, fpsBuffer, timeManager, groundPosition, scene, clock, renderer, darkMaterial, bloomComposer, finalComposer, 
    sun, controls, makeLabel, camera } from "./orrery.init.js";

// import { tags } from "./orrery.loaders.js"

import { VRButton } from "./../../three/VRButton.js";

let liveData = false;
const tempLabels = [];

const renderEl = document.body.appendChild( renderer.domElement );
document.body.appendChild( VRButton.createButton( renderer ) );
renderer.xr.enabled = true;
setTimeout( function() {
    if ($("#VRButton")[0].innerHTML == "VR NOT SUPPORTED") { $("#VRButton").hide(500); } 
}, 3000);

$("#info").hide();
$("#earth").hide();

if (!groundPosition.default) {
    displayLatLong(groundPosition.latitude, groundPosition.longitude);
}

/* MAIN LOOP */
function animate(time) {
    let clockElapsed = 1/clock.getDelta();
    fpsBuffer.push(clockElapsed);
    if (fpsBuffer.length > 7) {
        let sum = 0;
        for (let i = 0; i < fpsBuffer.length; i++) { sum += fpsBuffer[i]; }
        timeManager.avgFPS = sum / fpsBuffer.length;
        fpsBuffer.splice(0, fpsBuffer.length);
        liveData = true;
    }

    // update clock
    timeManager.rate = rates[timeManager.speed] * (fps / clockElapsed);
    timeManager.ephTime += timeManager.rate;
    sun.rotateOnAxis( new THREE.Vector3(0, 1, 0), sun.thetaDot * timeManager.rate );
    let readout = EphTimeReadout(timeManager.ephTime).a;
    readout += (timeManager.speed > (pauseRate-4) && timeManager.speed < (pauseRate+4)) ? EphTimeReadout(timeManager.ephTime).b : "";
    readout += (timeManager.speed > (pauseRate-2) && timeManager.speed < (pauseRate+2)) ? EphTimeReadout(timeManager.ephTime).c : "";
    readout += (timeManager.speed > (pauseRate-4) && timeManager.speed < (pauseRate+4)) ? EphTimeReadout(timeManager.ephTime).d : "";
    $("#date").html( readout );
    $("#speed").html( rateDesc[timeManager.speed] );
    $("#fps").html(timeManager.avgFPS.toFixed(2));
    if (stateManager.extraData) {
        $(".extraData").show();
        $("#mjd").html(EphTimeToMJD(timeManager.ephTime).toFixed(3));
        $("#lst").html(localSiderealTime(timeManager.ephTime).toFixed(3));
    } else {
        $(".extraData").hide();
    }

    for (let i = 0; i< precessing.length; i++) {
        system[precessing[i]].precess(timeManager.rate);
        redraw(i);
    }

    for (let i = 0; i < system.length; i++) {
        // update position and rotation
        system[i].update(timeManager.rate);
        const body = scene.children[system[i].childId];
        body.position.x = system[i].celestialPos.x;
        body.position.y = system[i].celestialPos.y;
        body.position.z = system[i].celestialPos.z;
        body.rotateOnAxis( new THREE.Vector3(0, 1, 0), system[i].thetaDot * timeManager.rate );
        system[i].toSun = system[i].celestialPos.length();
        system[i].toEarth = system[i].celestialPos.clone().sub(system[specialID.earth].celestialPos);

        // compute body's tagspace coordinates and place label
        const tag = $('#' + i);
        const tagPos = new THREE.Vector3().setFromMatrixPosition(body.matrixWorld).project(camera);
        tagPos.x = (tagPos.x * center.x) + center.x;
        tagPos.y = (tagPos.y * center.y * -1) + center.y;
        if (tag.length) {
            if (Math.abs(tagPos.x - center.x) < center.x && Math.abs(tagPos.y - center.y) < center.y && tagPos.z < 1) {
                tag.css({ "left" : Math.round(tagPos.x) + 10, "top": Math.round(tagPos.y) - 5, "visibility" : "visible" });
            } else {
                tag.css({ "visibility" : "hidden" });
            }
        } else {
            const d = tagPos.distanceTo(stateManager.mousePos);
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

    // update cameraLocked.graticule labels
    if (cameraLocked.graticule.visible) {
        $(".gratLabel").show();
        for (let i = 0; i < gratLabels.length; i++) {
            const tag = gratLabels[i].label;
            const tagPos = new THREE.Vector3(gratLabels[i].x, gratLabels[i].y, gratLabels[i].z).add(camera.position);
            tagPos.project(camera);
            tagPos.x = (tagPos.x * center.x) + center.x;
            tagPos.y = (tagPos.y * center.y * -1) + center.y;
            if (Math.abs(tagPos.x - center.x) < center.x && Math.abs(tagPos.y - center.y) < center.y && tagPos.z < 1) {
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
    system[specialID.earth].baryPos = system[specialID.earth].celestialPos.clone().sub(system[specialID.moon].celestialPos).multiplyScalar(earthBary);
    const earthBody = scene.children[system[specialID.earth].childId];
    earthBody.position.x += system[specialID.earth].baryPos.x;
    earthBody.position.y += system[specialID.earth].baryPos.y;
    earthBody.position.z += system[specialID.earth].baryPos.z;
    const plutoBaryOffset = system[specialID.pluto].celestialPos.clone().sub(system[specialID.charon].celestialPos).multiplyScalar(plutoBary);
    const plutoBody = scene.children[system[specialID.pluto].childId];
    plutoBody.position.x += plutoBaryOffset.x;
    plutoBody.position.y += plutoBaryOffset.y;
    plutoBody.position.z += plutoBaryOffset.z;

    // update live info
    if (stateManager.clickedLabel != "") {
        const RADec = getRA(stateManager.clickedPlanet);
        const AltAz = altAz(RADec.ra, RADec.dec, timeManager.ephTime);
        const elongation = 180 - stateManager.clickedPlanet.toEarth.angleTo(system[specialID.earth].celestialPos) * toDeg;
        if (liveData) {
            if (typeof stateManager.clickedPlanet.orbitId == "undefined") {
                $("#orbitVel").html(visViva(sunGravConstant, stateManager.clickedPlanet.toSun, stateManager.clickedPlanet.semiMajorAxis).toFixed(3));
            } else {
                const toOrbiting = stateManager.clickedPlanet.celestialPos.clone().sub(system[stateManager.clickedPlanet.orbitId].celestialPos).length();
                $("#orbitVel").html(visViva(system[stateManager.clickedPlanet.orbitId].mass * gravConstant, toOrbiting, stateManager.clickedPlanet.semiMajorAxis).toFixed(3));
            }
            const appMag = apparentMag(stateManager.clickedPlanet);
            let magNote = ""
            if (AltAz.alt > 0) {
                const adjMag = extinction(appMag, AltAz.alt);
                magNote = "<br>(" + adjMag.mag.toFixed(2) + " under " + adjMag.airmass.toFixed(2) + " airmasses)";
            }
            $("#appMag").html(appMag.toFixed(2) + magNote);
            $("#toSun, #earthToSun").html(stateManager.clickedPlanet.toSun.toFixed(4));
            $("#toEarth").html(stateManager.clickedPlanet.toEarth.length().toFixed(4));
            const raDMS = decToMinSec(RADec.ra);
            const decDMS = decToMinSec(RADec.dec);
            const altDMS = decToMinSec(AltAz.alt);
            const azDMS = decToMinSec(AltAz.az);
            $("#RA, #sunRA").html(raDMS.sign + raDMS.deg + 'h ' + raDMS.min + '&rsquo; ' + raDMS.sec.toFixed(1));
            $("#dec, #sunDec").html(decDMS.sign + decDMS.deg + '&deg; ' + decDMS.min + '&rsquo; ' + decDMS.sec.toFixed(1));
            $("#alt, #sunAlt").html(altDMS.sign + altDMS.deg + '&deg; ' + altDMS.min + '&rsquo; ' + altDMS.sec.toFixed(1));
            $("#az, #sunAz").html(azDMS.sign + azDMS.deg + '&deg; ' + azDMS.min + '&rsquo; ' + azDMS.sec.toFixed(1));
            riseSet(stateManager.clickedPlanet);
            if (stateManager.extraData) {
                const haDMS = decToMinSec(AltAz.ha);
                $("#ha").html(haDMS.deg + 'h ' + haDMS.min + '&rsquo; ' + haDMS.sec.toFixed(1));
            }
            $("#elong").html(elongation.toFixed(3));
            if (stateManager.hoverLabel) {
                const toActive = stateManager.clickedPlanet.celestialPos.clone().sub(system[stateManager.hoverLabel[0].id].celestialPos).length();
                const activeOut = (toActive < 0.001) ? (toActive * AU).toFixed(1) + ' km' : (toActive).toFixed(3) + ' AU';
                $("#distToActive").html('<br>' + activeOut);
            }
        }
        liveData = false;
    }

    TWEEN.update(time); // update tweens
    if (TWEEN.getAll().length == 0) { // lock on target after the tween
        controls.target = (stateManager.clickedLabel == "") ? new THREE.Vector3() : stateManager.clickedPlanet.celestialPos;

        if ( stateManager.following ) {
            const followPosition = controls.target;
            const followDelta = stateManager.lastFollow.sub(followPosition);
            camera.translateX(followDelta.x);
            camera.translateY(followDelta.y);
            camera.translateZ(followDelta.z);
            stateManager.lastFollow = followPosition;
        } else {
            stateManager.lastFollow = controls.target;
        }
    }

    cameraLocked.starfieldObj.position.x = camera.position.x;
    cameraLocked.starfieldObj.position.y = camera.position.y;
    cameraLocked.starfieldObj.position.z = camera.position.z;
    cameraLocked.graticule.position.x = camera.position.x;
    cameraLocked.graticule.position.y = camera.position.y;
    cameraLocked.graticule.position.z = camera.position.z;

    // render the entire scene, then render bloom scene on top
    controls.update(); // update the camera controls
    scene.traverse(darkenNonBloomed);
    bloomComposer.render();
    scene.traverse(restoreMaterial);
    finalComposer.render();

    const animateID = requestAnimationFrame( animate );

    /*
    renderer.setAnimationLoop( function () {
        renderer.render( scene, camera );
    });
    */

    if (!stateManager.showSplash) {
        $("#splashScreen").hide(300);
    }
}

/*
renderEl.addEventListener("webglcontextlost", function(event) {
    event.preventDefault();
    cancelAnimationFrame(animationID);
}, false);
*/

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

export { liveData, renderEl, animate, darkenNonBloomed, restoreMaterial };