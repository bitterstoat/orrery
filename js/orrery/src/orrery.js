import * as ORR from "./orrery.init.js";
import { VRButton } from "./../../three/VRButton.js";

export let liveData = false;
const tempLabels = [];

export const renderEl = document.body.appendChild( ORR.renderer.domElement );
/*
document.body.appendChild( VRButton.createButton( ORR.renderer ) );
ORR.renderer.xr.enabled = true;
setTimeout( function() {
    if ($("#VRButton")[0].innerHTML == "VR NOT SUPPORTED") { $("#VRButton").hide(500); } 
}, 3000);
*/

$("#info").hide();
$("#earth").hide();

if (!ORR.groundPosition.default) {
    ORR.displayLatLong(ORR.groundPosition.latitude, ORR.groundPosition.longitude);
}

/* MAIN LOOP */
export function animate(time) {
    let clockElapsed = 1/ORR.clock.getDelta();
    ORR.fpsBuffer.push(clockElapsed);
    if (ORR.fpsBuffer.length > 7) {
        let sum = 0;
        for (let i = 0; i < ORR.fpsBuffer.length; i++) { sum += ORR.fpsBuffer[i]; }
        ORR.times.avgFPS = sum / ORR.fpsBuffer.length;
        ORR.fpsBuffer.splice(0, ORR.fpsBuffer.length);
        liveData = true;
    }

    // update clock
    ORR.times.rate = ORR.rates[ORR.times.speed] * (ORR.fps / clockElapsed);
    ORR.times.ephTime += ORR.times.rate;
    ORR.sun.rotateOnAxis( new THREE.Vector3(0, 1, 0), ORR.sun.thetaDot * ORR.times.rate );
    let readout = ORR.EphTimeReadout(ORR.times.ephTime).a;
    readout += (ORR.times.speed > (ORR.pauseRate-4) && ORR.times.speed < (ORR.pauseRate+4)) ? ORR.EphTimeReadout(ORR.times.ephTime).b : "";
    readout += (ORR.times.speed > (ORR.pauseRate-2) && ORR.times.speed < (ORR.pauseRate+2)) ? ORR.EphTimeReadout(ORR.times.ephTime).c : "";
    readout += (ORR.times.speed > (ORR.pauseRate-4) && ORR.times.speed < (ORR.pauseRate+4)) ? ORR.EphTimeReadout(ORR.times.ephTime).d : "";
    $("#date").html( readout );
    $("#speed").html( ORR.rateDesc[ORR.times.speed] );
    $("#fps").html(ORR.times.avgFPS.toFixed(2));
    if (ORR.state.extraData) {
        $(".extraData").show();
        $("#mjd").html(ORR.EphTimeToMJD(ORR.times.ephTime).toFixed(3));
        $("#lst").html(ORR.localSiderealTime(ORR.times.ephTime).toFixed(3));
    } else {
        $(".extraData").hide();
    }

    for (let i = 0; i< ORR.precessing.length; i++) {
        ORR.system[ORR.precessing[i]].precess(ORR.times.rate);
        ORR.redraw(i);
    }

    for (let i = 0; i < ORR.system.length; i++) {
        // update position and rotation
        ORR.system[i].update(ORR.times.rate);
        const body = ORR.scene.children[ORR.system[i].childId];
        body.position.x = ORR.system[i].celestialPos.x;
        body.position.y = ORR.system[i].celestialPos.y;
        body.position.z = ORR.system[i].celestialPos.z;
        body.rotateOnAxis( new THREE.Vector3(0, 1, 0), ORR.system[i].thetaDot * ORR.times.rate );
        ORR.system[i].toSun = ORR.system[i].celestialPos.length();
        ORR.system[i].toEarth = ORR.system[i].celestialPos.clone().sub(ORR.system[ORR.specialID.earth].celestialPos);

        // compute body's tagspace coordinates and place label
        const tag = $('#' + i);
        const tagPos = new THREE.Vector3().setFromMatrixPosition(body.matrixWorld).project(ORR.camera);
        tagPos.x = (tagPos.x * ORR.center.x) + ORR.center.x;
        tagPos.y = (tagPos.y * ORR.center.y * -1) + ORR.center.y;
        if (tag.length) {
            if (Math.abs(tagPos.x - ORR.center.x) < ORR.center.x && Math.abs(tagPos.y - ORR.center.y) < ORR.center.y && tagPos.z < 1) {
                tag.css({ "left" : Math.round(tagPos.x) + 10, "top": Math.round(tagPos.y) - 5, "visibility" : "visible" });
            } else {
                tag.css({ "visibility" : "hidden" });
            }
        } else {
            const d = tagPos.distanceTo(ORR.state.mousePos);
            if (d < 15) {
                ORR.makeLabel(i);
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
    if (ORR.cameraLocked.graticule.visible) {
        $(".gratLabel").show();
        for (let i = 0; i < ORR.gratLabels.length; i++) {
            const tag = ORR.gratLabels[i].label;
            const tagPos = new THREE.Vector3(ORR.gratLabels[i].x, ORR.gratLabels[i].y, ORR.gratLabels[i].z).add(ORR.camera.position);
            tagPos.project(ORR.camera);
            tagPos.x = (tagPos.x * ORR.center.x) + ORR.center.x;
            tagPos.y = (tagPos.y * ORR.center.y * -1) + ORR.center.y;
            if (Math.abs(tagPos.x - ORR.center.x) < ORR.center.x && Math.abs(tagPos.y - ORR.center.y) < ORR.center.y && tagPos.z < 1) {
                tag.css({ "left" : tagPos.x-20, "top": tagPos.y-5, "visibility" : "visible" });
            } else {
                tag.css({ "visibility" : "hidden" });
            }
        }
    } else {
        $(".gratLabel").hide();
    }

    for (let i = 0; i < ORR.moons.length; i++) {
        ORR.paths[ORR.moons[i].path].position.x = ORR.system[ORR.paths[ORR.moons[i].path].orbitId].celestialPos.x;
        ORR.paths[ORR.moons[i].path].position.y = ORR.system[ORR.paths[ORR.moons[i].path].orbitId].celestialPos.y;
        ORR.paths[ORR.moons[i].path].position.z = ORR.system[ORR.paths[ORR.moons[i].path].orbitId].celestialPos.z;
    }
    ORR.system[ORR.specialID.earth].baryPos = ORR.system[ORR.specialID.earth].celestialPos.clone().sub(ORR.system[ORR.specialID.moon].celestialPos).multiplyScalar(ORR.earthBary);
    const earthBody = ORR.scene.children[ORR.system[ORR.specialID.earth].childId];
    earthBody.position.x += ORR.system[ORR.specialID.earth].baryPos.x;
    earthBody.position.y += ORR.system[ORR.specialID.earth].baryPos.y;
    earthBody.position.z += ORR.system[ORR.specialID.earth].baryPos.z;
    const plutoBaryOffset = ORR.system[ORR.specialID.pluto].celestialPos.clone().sub(ORR.system[ORR.specialID.charon].celestialPos).multiplyScalar(ORR.plutoBary, );
    const plutoBody = ORR.scene.children[ORR.system[ORR.specialID.pluto].childId];
    plutoBody.position.x += plutoBaryOffset.x;
    plutoBody.position.y += plutoBaryOffset.y;
    plutoBody.position.z += plutoBaryOffset.z;

    // update live info
    if (ORR.state.clickedLabel != "") {
        const RADec = ORR.getRA(ORR.state.clickedPlanet);
        const AltAz = ORR.altAz(RADec.ra, RADec.dec, ORR.times.ephTime);
        const elongation = 180 - ORR.state.clickedPlanet.toEarth.angleTo(ORR.system[ORR.specialID.earth].celestialPos) * ORR.toDeg;
        if (liveData) {
            if (typeof ORR.state.clickedPlanet.orbitId == "undefined") {
                $("#orbitVel").html(ORR.visViva(ORR.sunGravConstant, ORR.state.clickedPlanet.toSun, ORR.state.clickedPlanet.semiMajorAxis).toFixed(3));
            } else {
                const toOrbiting = ORR.state.clickedPlanet.celestialPos.clone().sub(ORR.system[ORR.state.clickedPlanet.orbitId].celestialPos).length();
                $("#orbitVel").html(ORR.visViva(ORR.system[ORR.state.clickedPlanet.orbitId].mass * ORR.gravConstant, toOrbiting, ORR.state.clickedPlanet.semiMajorAxis).toFixed(3));
            }
            const appMag = ORR.apparentMag(ORR.state.clickedPlanet);
            let magNote = ""
            if (AltAz.alt > 0) {
                const adjMag = ORR.extinction(appMag, AltAz.alt);
                magNote = "<br>(" + adjMag.mag.toFixed(2) + " under " + adjMag.airmass.toFixed(2) + " airmasses)";
            }
            $("#appMag").html(appMag.toFixed(2) + magNote);
            $("#toSun, #earthToSun").html(ORR.state.clickedPlanet.toSun.toFixed(4));
            $("#toEarth").html(ORR.state.clickedPlanet.toEarth.length().toFixed(4));
            const raDMS = ORR.decToMinSec(RADec.ra);
            const decDMS = ORR.decToMinSec(RADec.dec);
            const altDMS = ORR.decToMinSec(AltAz.alt);
            const azDMS = ORR.decToMinSec(AltAz.az);
            $("#RA, #sunRA").html(raDMS.sign + raDMS.deg + 'h ' + raDMS.min + '&rsquo; ' + raDMS.sec.toFixed(1));
            $("#dec, #sunDec").html(decDMS.sign + decDMS.deg + '&deg; ' + decDMS.min + '&rsquo; ' + decDMS.sec.toFixed(1));
            $("#alt, #sunAlt").html(altDMS.sign + altDMS.deg + '&deg; ' + altDMS.min + '&rsquo; ' + altDMS.sec.toFixed(1));
            $("#az, #sunAz").html(azDMS.sign + azDMS.deg + '&deg; ' + azDMS.min + '&rsquo; ' + azDMS.sec.toFixed(1));
            ORR.riseSet(ORR.state.clickedPlanet);
            if (ORR.state.extraData) {
                const haDMS = ORR.decToMinSec(AltAz.ha);
                $("#ha").html(haDMS.deg + 'h ' + haDMS.min + '&rsquo; ' + haDMS.sec.toFixed(1));
            }
            $("#elong").html(elongation.toFixed(3));
            if (ORR.state.hoverLabel) {
                const toActive = ORR.state.clickedPlanet.celestialPos.clone().sub(ORR.system[ORR.state.hoverLabel[0].id].celestialPos).length();
                const activeOut = (toActive < 0.001) ? (toActive * ORR.AU).toFixed(1) + ' km' : (toActive).toFixed(3) + ' AU';
                $("#distToActive").html('<br>' + activeOut);
            }
        }
        liveData = false;
    }

    TWEEN.update(time); // update tweens
    if (TWEEN.getAll().length == 0) { // lock on target after the tween
        ORR.controls.target = (ORR.state.clickedLabel == "") ? new THREE.Vector3() : ORR.state.clickedPlanet.celestialPos;

        if ( ORR.state.following ) {
            const followPosition = ORR.controls.target;
            const followDelta = ORR.state.lastFollow.sub(followPosition);
            ORR.camera.translateX(followDelta.x);
            ORR.camera.translateY(followDelta.y);
            ORR.camera.translateZ(followDelta.z);
            ORR.state.lastFollow = followPosition;
        } else {
            ORR.state.lastFollow = ORR.controls.target;
        }
    }

    ORR.cameraLocked.starfieldObj.position.x = ORR.camera.position.x;
    ORR.cameraLocked.starfieldObj.position.y = ORR.camera.position.y;
    ORR.cameraLocked.starfieldObj.position.z = ORR.camera.position.z;
    ORR.cameraLocked.graticule.position.x = ORR.camera.position.x;
    ORR.cameraLocked.graticule.position.y = ORR.camera.position.y;
    ORR.cameraLocked.graticule.position.z = ORR.camera.position.z;

    // render the entire scene, then render bloom scene on top
    ORR.controls.update(); // update the camera controls
    ORR.scene.traverse(darkenNonBloomed);
    ORR.bloomComposer.render();
    ORR.scene.traverse(restoreMaterial);
    ORR.finalComposer.render();

    const animateID = requestAnimationFrame( animate );

    /*
    ORR.renderer.setAnimationLoop( function () {
        ORR.renderer.render( scene, ORR.camera );
    });
    */

    if (!ORR.state.showSplash) {
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
        ORR.materials[ obj.uuid ] = obj.material;
        obj.material = ORR.darkMaterial;
    }
}

export function restoreMaterial( obj ) {
    if ( ORR.materials[ obj.uuid ] ) {
        obj.material = ORR.materials[ obj.uuid ];
        delete ORR.materials[ obj.uuid ];
    }
}