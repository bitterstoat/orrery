import * as ORR from "./init.js";
import * as THREE from "../../../node_modules/three/build/three.module.js";
import * as TWEEN from "../../tween/tween.esm.js";

export let liveData = false;
const tempLabels = [];
const fpsBuffer = [];
const rateDesc = [ "-5 years/sec", "-1 year/sec", "-100 days/sec", "-20 days/sec", "-1 day/sec", "-1 hour/sec", "Reversed Time", "Paused", "Realtime", "1 hour/sec", "1 day/sec", "20 days/sec", "100 days/sec", "1 year/sec", "5 years/sec"];
const gravConstant = 6.6743015e-11;
const sunGravConstant = 1.32712440042e+20; // gravitational constant for heliocentric orbits
const earthBary = 4670 / 388400; // Earth barycentric offset relative to Moon's semimajor axis
const plutoBary = 2110 / 19600; // Pluto barycentric offset relative to Charon's semimajor axis
let redrawLabels = false;

/**
 * MAIN LOOP
 * @param {float} time
 */
export function animate(time) {
    redrawLabels = !redrawLabels;
    let clockElapsed = 1 / ORR.clock.getDelta();
    fpsBuffer.push(clockElapsed);
    if (fpsBuffer.length > 19) {
        let sum = 0;
        for (let i = 0; i < fpsBuffer.length; i++) { sum += fpsBuffer[i]; }
        ORR.times.avgFPS = sum / fpsBuffer.length;
        fpsBuffer.splice(0, fpsBuffer.length);
        liveData = true;
    }

    // update clock
    ORR.times.rate = ORR.rates[ORR.times.speed] * (ORR.fps / clockElapsed);
    ORR.times.ephTime += ORR.times.rate;
    ORR.sun.rotateOnAxis( new THREE.Vector3(0, 1, 0), ORR.sun.thetaDot * ORR.times.rate );
    let readout = ORR.EphTimeReadout(ORR.times.ephTime).a;
    readout += (ORR.times.speed > (ORR.times.pauseRate-4) && ORR.times.speed < (ORR.times.pauseRate+4)) ? ORR.EphTimeReadout(ORR.times.ephTime).b : "";
    readout += (ORR.times.speed > (ORR.times.pauseRate-2) && ORR.times.speed < (ORR.times.pauseRate+2)) ? ORR.EphTimeReadout(ORR.times.ephTime).c : "";
    readout += (ORR.times.speed > (ORR.times.pauseRate-4) && ORR.times.speed < (ORR.times.pauseRate+4)) ? ORR.EphTimeReadout(ORR.times.ephTime).d : "";
    document.getElementById("date").innerHTML = readout;
    document.getElementById("speed").innerHTML = rateDesc[ORR.times.speed];
    document.getElementById("fps").innerHTML = ORR.times.avgFPS.toFixed(2);

    if (ORR.state.extraData) {
        document.getElementById("mjd").innerHTML = ORR.EphTimeToMJD(ORR.times.ephTime).toFixed(3);
        document.getElementById("lst").innerHTML = ORR.localSiderealTime(ORR.times.ephTime).toFixed(3);
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

        // compute body's screenspace coordinates and place label
        const tag = document.getElementById(i);
        const tagPos = new THREE.Vector3().setFromMatrixPosition(body.matrixWorld).project(ORR.camera);
        tagPos.x = (tagPos.x * ORR.center.x) + ORR.center.x;
        tagPos.y = (tagPos.y * ORR.center.y * -1) + ORR.center.y;
        if (redrawLabels) {
            if (tag != undefined) {
                if (Math.abs(tagPos.x - ORR.center.x) < ORR.center.x && Math.abs(tagPos.y - ORR.center.y) < ORR.center.y && tagPos.z < 1) {
                    tag.style.left = Math.round(tagPos.x) + 10 + "px";
                    tag.style.top = Math.round(tagPos.y) - 5 + "px";
                    tag.style.visibility = "visible";
                } else {
                    tag.style.visibility = "hidden";
                }
            } else {
                const d = tagPos.distanceTo(ORR.state.mousePos);
                if (d < 15) {
                    ORR.makeLabel(i);
                    tempLabels.push(i);
                }
            }
            if (tempLabels.length > 4) {
                const tag = document.getElementById(tempLabels.shift());
                if (!tag.classList.contains("active")) {
                    tag.remove();
                }
            }
        }
    }

    // update graticule labels
    if (ORR.cameraLocked.graticule.visible) {
        for (let i = 0; i < ORR.gratLabels.length; i++) {
            const tag = document.getElementById(ORR.gratLabels[i].label);
            tag.style.visibility = "hidden";
            const tagPos = new THREE.Vector3(ORR.gratLabels[i].x, ORR.gratLabels[i].y, ORR.gratLabels[i].z).add(ORR.camera.position);
            tagPos.project(ORR.camera);
            tagPos.x = (tagPos.x * ORR.center.x) + ORR.center.x;
            tagPos.y = (tagPos.y * ORR.center.y * -1) + ORR.center.y;
            if (Math.abs(tagPos.x - ORR.center.x) < ORR.center.x && Math.abs(tagPos.y - ORR.center.y) < ORR.center.y && tagPos.z < 1) {
                tag.style.left = Math.round(tagPos.x) - 20 + "px";
                tag.style.top = Math.round(tagPos.y) - 5 + "px";
                tag.style.visibility = "visible";
            }
        }
    }

    for (let i = 0; i < ORR.moons.length; i++) {
        ORR.paths[ORR.moons[i].path].position.x = ORR.system[ORR.paths[ORR.moons[i].path].orbitId].celestialPos.x;
        ORR.paths[ORR.moons[i].path].position.y = ORR.system[ORR.paths[ORR.moons[i].path].orbitId].celestialPos.y;
        ORR.paths[ORR.moons[i].path].position.z = ORR.system[ORR.paths[ORR.moons[i].path].orbitId].celestialPos.z;
    }
    ORR.system[ORR.specialID.earth].baryPos = ORR.system[ORR.specialID.earth].celestialPos.clone().sub(ORR.system[ORR.specialID.moon].celestialPos).multiplyScalar(earthBary);
    const earthBody = ORR.scene.children[ORR.system[ORR.specialID.earth].childId];
    earthBody.position.x += ORR.system[ORR.specialID.earth].baryPos.x;
    earthBody.position.y += ORR.system[ORR.specialID.earth].baryPos.y;
    earthBody.position.z += ORR.system[ORR.specialID.earth].baryPos.z;
    const plutoBaryOffset = ORR.system[ORR.specialID.pluto].celestialPos.clone().sub(ORR.system[ORR.specialID.charon].celestialPos).multiplyScalar(plutoBary, );
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
                document.getElementById("orbitVel").innerHTML = ORR.visViva(sunGravConstant, ORR.state.clickedPlanet.toSun, ORR.state.clickedPlanet.semiMajorAxis).toFixed(3);
            } else {
                const toOrbiting = ORR.state.clickedPlanet.celestialPos.clone().sub(ORR.system[ORR.state.clickedPlanet.orbitId].celestialPos).length();
                document.getElementById("orbitVel").innerHTML = ORR.visViva(ORR.system[ORR.state.clickedPlanet.orbitId].mass * gravConstant, toOrbiting, ORR.state.clickedPlanet.semiMajorAxis).toFixed(3);
            }
            const appMag = ORR.apparentMag(ORR.state.clickedPlanet);
            let magNote = ""
            if (AltAz.alt > 0) {
                const adjMag = ORR.extinction(appMag, AltAz.alt);
                magNote = "<br>(" + adjMag.mag.toFixed(2) + " under " + adjMag.airmass.toFixed(2) + " airmasses)";
            }
            document.getElementById("appMag").innerHTML = appMag.toFixed(2) + magNote;
            document.getElementById("toSun").innerHTML = ORR.state.clickedPlanet.toSun.toFixed(4);
            document.getElementById("earthToSun").innerHTML = ORR.state.clickedPlanet.toSun.toFixed(4);
            document.getElementById("toEarth").innerHTML = ORR.state.clickedPlanet.toEarth.length().toFixed(4);
            const raDMS = ORR.decToMinSec(RADec.ra);
            const decDMS = ORR.decToMinSec(RADec.dec);
            const altDMS = ORR.decToMinSec(AltAz.alt);
            const azDMS = ORR.decToMinSec(AltAz.az);
            const formattedRA = raDMS.sign + raDMS.deg + 'h ' + raDMS.min + '&rsquo; ' + raDMS.sec.toFixed(1);
            const formattedDec = decDMS.sign + decDMS.deg + '&deg; ' + decDMS.min + '&rsquo; ' + decDMS.sec.toFixed(1);
            const formattedAlt = altDMS.sign + altDMS.deg + '&deg; ' + altDMS.min + '&rsquo; ' + altDMS.sec.toFixed(1);
            const formattedAz = azDMS.sign + azDMS.deg + '&deg; ' + azDMS.min + '&rsquo; ' + azDMS.sec.toFixed(1);
            document.getElementById("RA").innerHTML = formattedRA;
            document.getElementById("sunRA").innerHTML = formattedRA;
            document.getElementById("dec").innerHTML = formattedDec;
            document.getElementById("sunDec").innerHTML = formattedDec;
            document.getElementById("alt").innerHTML = formattedAlt;
            document.getElementById("sunAlt").innerHTML = formattedAlt;
            document.getElementById("az").innerHTML = formattedAz;
            document.getElementById("sunAz").innerHTML = formattedAz;
            ORR.riseSet(ORR.state.clickedPlanet);
            if (ORR.state.extraData) {
                const haDMS = ORR.decToMinSec(AltAz.ha);
                document.getElementById("ha").innerHTML = haDMS.deg + 'h ' + haDMS.min + '&rsquo; ' + haDMS.sec.toFixed(1);
            }
            document.getElementById("elong").innerHTML = elongation.toFixed(3);
            if (ORR.state.hoverLabel) {
                const toActive = ORR.state.clickedPlanet.celestialPos.clone().sub(ORR.system[ORR.state.hoverLabel[0].id].celestialPos).length();
                const activeOut = (toActive < 0.001) ? (toActive * ORR.AU).toFixed(1) + ' km' : (toActive).toFixed(3) + ' AU';
                const distTag = document.querySelector("#distToActive");
                if (distTag != null) {
                    distTag.innerHTML = '<br>' + activeOut;
                }
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
    ORR.scene.traverse(ORR.darkenNonBloomed);
    ORR.bloomComposer.render();
    ORR.scene.traverse(ORR.restoreMaterial);
    ORR.finalComposer.render();

    const animateID = requestAnimationFrame( animate );

    if (!ORR.state.showSplash) {
        document.getElementById("splashScreen").style.display = "none";
    }
}