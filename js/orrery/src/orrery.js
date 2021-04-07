import * as Orrery from "./orrery.init.js";
// import { tags } from "./orrery.loaders.js"

import { VRButton } from "./../../three/VRButton.js";

export let liveData = false;
const tempLabels = [];

export const renderEl = document.body.appendChild( Orrery.renderer.domElement );
/*
document.body.appendChild( VRButton.createButton( Orrery.renderer ) );
Orrery.renderer.xr.enabled = true;
setTimeout( function() {
    if ($("#VRButton")[0].innerHTML == "VR NOT SUPPORTED") { $("#VRButton").hide(500); } 
}, 3000);
*/

$("#info").hide();
$("#earth").hide();

if (!Orrery.groundPosition.default) {
    Orrery.displayLatLong(Orrery.groundPosition.latitude, Orrery.groundPosition.longitude);
}

/* MAIN LOOP */
export function animate(time) {
    let clockElapsed = 1/Orrery.clock.getDelta();
    Orrery.fpsBuffer.push(clockElapsed);
    if (Orrery.fpsBuffer.length > 7) {
        let sum = 0;
        for (let i = 0; i < Orrery.fpsBuffer.length; i++) { sum += Orrery.fpsBuffer[i]; }
        Orrery.timeManager.avgFPS = sum / Orrery.fpsBuffer.length;
        Orrery.fpsBuffer.splice(0, Orrery.fpsBuffer.length);
        liveData = true;
    }

    // update clock
    Orrery.timeManager.rate = Orrery.rates[Orrery.timeManager.speed] * (Orrery.fps / clockElapsed);
    Orrery.timeManager.ephTime += Orrery.timeManager.rate;
    Orrery.sun.rotateOnAxis( new THREE.Vector3(0, 1, 0), Orrery.sun.thetaDot * Orrery.timeManager.rate );
    let readout = Orrery.EphTimeReadout(Orrery.timeManager.ephTime).a;
    readout += (Orrery.timeManager.speed > (Orrery.pauseRate-4) && Orrery.timeManager.speed < (Orrery.pauseRate+4)) ? Orrery.EphTimeReadout(Orrery.timeManager.ephTime).b : "";
    readout += (Orrery.timeManager.speed > (Orrery.pauseRate-2) && Orrery.timeManager.speed < (Orrery.pauseRate+2)) ? Orrery.EphTimeReadout(Orrery.timeManager.ephTime).c : "";
    readout += (Orrery.timeManager.speed > (Orrery.pauseRate-4) && Orrery.timeManager.speed < (Orrery.pauseRate+4)) ? Orrery.EphTimeReadout(Orrery.timeManager.ephTime).d : "";
    $("#date").html( readout );
    $("#speed").html( Orrery.rateDesc[Orrery.timeManager.speed] );
    $("#fps").html(Orrery.timeManager.avgFPS.toFixed(2));
    if (Orrery.stateManager.extraData) {
        $(".extraData").show();
        $("#mjd").html(Orrery.EphTimeToMJD(Orrery.timeManager.ephTime).toFixed(3));
        $("#lst").html(Orrery.localSiderealTime(Orrery.timeManager.ephTime).toFixed(3));
    } else {
        $(".extraData").hide();
    }

    for (let i = 0; i< Orrery.precessing.length; i++) {
        Orrery.system[Orrery.precessing[i]].precess(Orrery.timeManager.rate);
        Orrery.redraw(i);
    }

    for (let i = 0; i < Orrery.system.length; i++) {
        // update position and rotation
        Orrery.system[i].update(Orrery.timeManager.rate);
        const body = Orrery.scene.children[Orrery.system[i].childId];
        body.position.x = Orrery.system[i].celestialPos.x;
        body.position.y = Orrery.system[i].celestialPos.y;
        body.position.z = Orrery.system[i].celestialPos.z;
        body.rotateOnAxis( new THREE.Vector3(0, 1, 0), Orrery.system[i].thetaDot * Orrery.timeManager.rate );
        Orrery.system[i].toSun = Orrery.system[i].celestialPos.length();
        Orrery.system[i].toEarth = Orrery.system[i].celestialPos.clone().sub(Orrery.system[Orrery.specialID.earth].celestialPos);

        // compute body's tagspace coordinates and place label
        const tag = $('#' + i);
        const tagPos = new THREE.Vector3().setFromMatrixPosition(body.matrixWorld).project(Orrery.camera);
        tagPos.x = (tagPos.x * Orrery.center.x) + Orrery.center.x;
        tagPos.y = (tagPos.y * Orrery.center.y * -1) + Orrery.center.y;
        if (tag.length) {
            if (Math.abs(tagPos.x - Orrery.center.x) < Orrery.center.x && Math.abs(tagPos.y - Orrery.center.y) < Orrery.center.y && tagPos.z < 1) {
                tag.css({ "left" : Math.round(tagPos.x) + 10, "top": Math.round(tagPos.y) - 5, "visibility" : "visible" });
            } else {
                tag.css({ "visibility" : "hidden" });
            }
        } else {
            const d = tagPos.distanceTo(Orrery.stateManager.mousePos);
            if (d < 15) {
                Orrery.makeLabel(i);
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

    // update graticule labels
    if (Orrery.cameraLocked.graticule.visible) {
        $(".gratLabel").show();
        for (let i = 0; i < Orrery.gratLabels.length; i++) {
            const tag = Orrery.gratLabels[i].label;
            const tagPos = new THREE.Vector3(Orrery.gratLabels[i].x, Orrery.gratLabels[i].y, Orrery.gratLabels[i].z).add(Orrery.camera.position);
            tagPos.project(Orrery.camera);
            tagPos.x = (tagPos.x * Orrery.center.x) + Orrery.center.x;
            tagPos.y = (tagPos.y * Orrery.center.y * -1) + Orrery.center.y;
            if (Math.abs(tagPos.x - Orrery.center.x) < Orrery.center.x && Math.abs(tagPos.y - Orrery.center.y) < Orrery.center.y && tagPos.z < 1) {
                tag.css({ "left" : tagPos.x-20, "top": tagPos.y-5, "visibility" : "visible" });
            } else {
                tag.css({ "visibility" : "hidden" });
            }
        }
    } else {
        $(".gratLabel").hide();
    }

    for (let i = 0; i < Orrery.moons.length; i++) {
        Orrery.paths[Orrery.moons[i].path].position.x = Orrery.system[Orrery.paths[Orrery.moons[i].path].orbitId].celestialPos.x;
        Orrery.paths[Orrery.moons[i].path].position.y = Orrery.system[Orrery.paths[Orrery.moons[i].path].orbitId].celestialPos.y;
        Orrery.paths[Orrery.moons[i].path].position.z = Orrery.system[Orrery.paths[Orrery.moons[i].path].orbitId].celestialPos.z;
    }
    Orrery.system[Orrery.specialID.earth].baryPos = Orrery.system[Orrery.specialID.earth].celestialPos.clone().sub(Orrery.system[Orrery.specialID.moon].celestialPos).multiplyScalar(Orrery.earthBary);
    const earthBody = Orrery.scene.children[Orrery.system[Orrery.specialID.earth].childId];
    earthBody.position.x += Orrery.system[Orrery.specialID.earth].baryPos.x;
    earthBody.position.y += Orrery.system[Orrery.specialID.earth].baryPos.y;
    earthBody.position.z += Orrery.system[Orrery.specialID.earth].baryPos.z;
    const plutoBaryOffset = Orrery.system[Orrery.specialID.pluto].celestialPos.clone().sub(Orrery.system[Orrery.specialID.charon].celestialPos).multiplyScalar(Orrery.plutoBary, );
    const plutoBody = Orrery.scene.children[Orrery.system[Orrery.specialID.pluto].childId];
    plutoBody.position.x += plutoBaryOffset.x;
    plutoBody.position.y += plutoBaryOffset.y;
    plutoBody.position.z += plutoBaryOffset.z;

    // update live info
    if (Orrery.stateManager.clickedLabel != "") {
        const RADec = Orrery.getRA(Orrery.stateManager.clickedPlanet);
        const AltAz = Orrery.altAz(RADec.ra, RADec.dec, Orrery.timeManager.ephTime);
        const elongation = 180 - Orrery.stateManager.clickedPlanet.toEarth.angleTo(Orrery.system[Orrery.specialID.earth].celestialPos) * Orrery.toDeg;
        if (liveData) {
            if (typeof Orrery.stateManager.clickedPlanet.orbitId == "undefined") {
                $("#orbitVel").html(Orrery.visViva(Orrery.sunGravConstant, Orrery.stateManager.clickedPlanet.toSun, Orrery.stateManager.clickedPlanet.semiMajorAxis).toFixed(3));
            } else {
                const toOrbiting = Orrery.stateManager.clickedPlanet.celestialPos.clone().sub(Orrery.system[Orrery.stateManager.clickedPlanet.orbitId].celestialPos).length();
                $("#orbitVel").html(Orrery.visViva(Orrery.system[Orrery.stateManager.clickedPlanet.orbitId].mass * Orrery.gravConstant, toOrbiting, Orrery.stateManager.clickedPlanet.semiMajorAxis).toFixed(3));
            }
            const appMag = Orrery.apparentMag(Orrery.stateManager.clickedPlanet);
            let magNote = ""
            if (AltAz.alt > 0) {
                const adjMag = Orrery.extinction(appMag, AltAz.alt);
                magNote = "<br>(" + adjMag.mag.toFixed(2) + " under " + adjMag.airmass.toFixed(2) + " airmasses)";
            }
            $("#appMag").html(appMag.toFixed(2) + magNote);
            $("#toSun, #earthToSun").html(Orrery.stateManager.clickedPlanet.toSun.toFixed(4));
            $("#toEarth").html(Orrery.stateManager.clickedPlanet.toEarth.length().toFixed(4));
            const raDMS = Orrery.decToMinSec(RADec.ra);
            const decDMS = Orrery.decToMinSec(RADec.dec);
            const altDMS = Orrery.decToMinSec(AltAz.alt);
            const azDMS = Orrery.decToMinSec(AltAz.az);
            $("#RA, #sunRA").html(raDMS.sign + raDMS.deg + 'h ' + raDMS.min + '&rsquo; ' + raDMS.sec.toFixed(1));
            $("#dec, #sunDec").html(decDMS.sign + decDMS.deg + '&deg; ' + decDMS.min + '&rsquo; ' + decDMS.sec.toFixed(1));
            $("#alt, #sunAlt").html(altDMS.sign + altDMS.deg + '&deg; ' + altDMS.min + '&rsquo; ' + altDMS.sec.toFixed(1));
            $("#az, #sunAz").html(azDMS.sign + azDMS.deg + '&deg; ' + azDMS.min + '&rsquo; ' + azDMS.sec.toFixed(1));
            Orrery.riseSet(Orrery.stateManager.clickedPlanet);
            if (Orrery.stateManager.extraData) {
                const haDMS = Orrery.decToMinSec(AltAz.ha);
                $("#ha").html(haDMS.deg + 'h ' + haDMS.min + '&rsquo; ' + haDMS.sec.toFixed(1));
            }
            $("#elong").html(elongation.toFixed(3));
            if (Orrery.stateManager.hoverLabel) {
                const toActive = Orrery.stateManager.clickedPlanet.celestialPos.clone().sub(Orrery.system[Orrery.stateManager.hoverLabel[0].id].celestialPos).length();
                const activeOut = (toActive < 0.001) ? (toActive * Orrery.AU).toFixed(1) + ' km' : (toActive).toFixed(3) + ' AU';
                $("#distToActive").html('<br>' + activeOut);
            }
        }
        liveData = false;
    }

    TWEEN.update(time); // update tweens
    if (TWEEN.getAll().length == 0) { // lock on target after the tween
        Orrery.controls.target = (Orrery.stateManager.clickedLabel == "") ? new THREE.Vector3() : Orrery.stateManager.clickedPlanet.celestialPos;

        if ( Orrery.stateManager.following ) {
            const followPosition = Orrery.controls.target;
            const followDelta = Orrery.stateManager.lastFollow.sub(followPosition);
            Orrery.camera.translateX(followDelta.x);
            Orrery.camera.translateY(followDelta.y);
            Orrery.camera.translateZ(followDelta.z);
            Orrery.stateManager.lastFollow = followPosition;
        } else {
            Orrery.stateManager.lastFollow = Orrery.controls.target;
        }
    }

    Orrery.cameraLocked.starfieldObj.position.x = Orrery.camera.position.x;
    Orrery.cameraLocked.starfieldObj.position.y = Orrery.camera.position.y;
    Orrery.cameraLocked.starfieldObj.position.z = Orrery.camera.position.z;
    Orrery.cameraLocked.graticule.position.x = Orrery.camera.position.x;
    Orrery.cameraLocked.graticule.position.y = Orrery.camera.position.y;
    Orrery.cameraLocked.graticule.position.z = Orrery.camera.position.z;

    // render the entire scene, then render bloom scene on top
    Orrery.controls.update(); // update the camera controls
    Orrery.scene.traverse(darkenNonBloomed);
    Orrery.bloomComposer.render();
    Orrery.scene.traverse(restoreMaterial);
    Orrery.finalComposer.render();

    const animateID = requestAnimationFrame( animate );

    /*
    Orrery.renderer.setAnimationLoop( function () {
        Orrery.renderer.render( scene, Orrery.camera );
    });
    */

    if (!Orrery.stateManager.showSplash) {
        $("#splashScreen").hide(300);
    }
}

/*
renderEl.addEventListener("webglcontextlost", function(event) {
    event.preventDefault();
    cancelAnimationFrame(animationID);
}, false);
*/

export function darkenNonBloomed( obj ) {
    if ( typeof obj.glow == "undefined" || obj.glow == false ) {
        Orrery.materials[ obj.uuid ] = obj.material;
        obj.material = Orrery.darkMaterial;
    }
}

export function restoreMaterial( obj ) {
    if ( Orrery.materials[ obj.uuid ] ) {
        obj.material = Orrery.materials[ obj.uuid ];
        delete Orrery.materials[ obj.uuid ];
    }
}