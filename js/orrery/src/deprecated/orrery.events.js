function windowResize() { // window setup and resize handler
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setPixelRatio( window.devicePixelRatio );
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    bloomComposer.setSize( window.innerWidth, window.innerHeight );
    finalComposer.setSize( window.innerWidth, window.innerHeight );
    centerX = window.innerWidth * 0.5;
    centerY = window.innerHeight * 0.5;
    placeWidgets();
}
window.addEventListener('resize', windowResize );
windowResize();

window.addEventListener('mousemove', onMouseMove );
function onMouseMove(e) { 
    mousePos.x = e.clientX; 
    mousePos.y = e.clientY;
}

function pauseResume() {
    if (speed == pauseRate) { // resume
        speed = lastSpeed;
    } else { // pause but remeber previous speed
        lastSpeed = speed;
        speed = pauseRate;
    }
}

$(document).keydown(function(event) { // keystroke handler
    switch(event.keyCode) {
        case 37 : 
            slowTime();
        break;
        case 39 : 
            speedTime();
        break;
        case 40 : 
            realTime();
        break;
        case 32 :
            pauseResume();
        break;
        case 27 : // unclick clicked tag
            if (clickedLabel != "") {
                closeTag(clickedLabel);
            }
        break;
        case 38 :
            const scaleRadius = clickedPlanet.exagRadius / 2000;
            following = (clickedLabel != "") ? !following : false;
            (following) ? zoomIn(scaleRadius) : zoomOut(scaleRadius);
        break;
        case 113:
            $("#inputBox, #outputBox").toggle(300);
        break;
        case 115:
            graticule.visible = !graticule.visible;
        break;
    }
    rate = rates[speed]; // apply speed changes
});

function clickTag(t) {
    if ($('#' + t).length < 1) {
        makeLabel(t);
    }
    clickedLabel = $('#' + t);
    clickedLabel.addClass( "active" ).show();
    if (jQuery.isEmptyObject(lastClickedPlanet) == false) {
        paths[clickedPlanet.path].material = pathMaterials[Math.min(lastClickedPlanet.type, 3)];
    }
    clickedPlanet = system[t];
    paths[clickedPlanet.path].material = selectedPathMat;
    if (system[t].type > 3) {
        scene.add(paths[clickedPlanet.path]);
    }
    lastClickedPlanet = clickedPlanet;
    controls.minDistance = 0.1;
    const tweenTo = new TWEEN.Tween(controls.target)
        .to( { x:clickedPlanet.celestialPos.x, y:clickedPlanet.celestialPos.y, z:clickedPlanet.celestialPos.z}, 1000 ).easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate( function() { this.to({ x:clickedPlanet.celestialPos.x, y:clickedPlanet.celestialPos.y, z:clickedPlanet.celestialPos.z })} )
        .start();

    $("#info a").attr("href", clickedPlanet.wiki);
    $("#infohead").html(clickedLabel[0].innerHTML);
    if (clickedPlanet.wikipic != "default") {
        $("#info img").attr("src", clickedPlanet.wikipic).show();
    } else {
        $("#info img").hide();
    }
    $("#planetInfo").html(clickedPlanet.info);
    const adjustedA = (clickedPlanet.semiMajorAxis < 0.1 ) ? (clickedPlanet.semiMajorAxis * AU).toFixed(1) + '&nbsp;km' : clickedPlanet.semiMajorAxis.toFixed(4) + '&nbsp;AU';
    $("#semiMajorAxis").html(adjustedA);
    const adjustedP = (clickedPlanet.period < 0.01 ) ? (clickedPlanet.period * daysPerCent).toFixed(3) + '&nbsp;days' : (clickedPlanet.period * 100).toFixed(3) + '&nbsp;years'
    $("#period").html(adjustedP);
    $("#eccentricity").html(clickedPlanet.eccentricity.toFixed(3));
    $("#inclination").html((clickedPlanet.inclination * toDeg).toFixed(4));
    $("#radius").html(parseFloat(clickedPlanet.radius).toFixed(1));
    $("#absMag").html(clickedPlanet.absoluteMag.toFixed(2));
    $("#info").show(300);
    (t == earthID) ? $("#earthRel").hide() : $("#earthRel").show();
}

function updateScale() {
    for (let i = 0; i < majorBodies.length; i++) {
        const scaleBody = scene.children[majorBodies[i].childId];
        scaleBody.scale.set(planetScale.f, planetScale.f, planetScale.f);
        sun.scale.set(planetScale.f, planetScale.f, planetScale.f);
    }
}

function zoomIn() {
    controls.minDistance = clickedPlanet.radius / AU * 100000;
    const currentCam = camera.position.clone().sub(clickedPlanet.celestialPos).length();
    const tweenPushIn = new TWEEN.Tween(controls).to( {maxDistance: initMaxDistance / clickedPlanet.zoomRatio}, 1000 )
        .easing(TWEEN.Easing.Quadratic.InOut).start();

    const tweenZoomIn = new TWEEN.Tween(camera).to( {fov:.001}, 1000 )
        .onUpdate( function() { camera.updateProjectionMatrix() } )
        .easing(TWEEN.Easing.Quadratic.InOut).start();
    
    const tweenShrink = new TWEEN.Tween(planetScale).to( {f: 1/exagScale}, 1000 )
        .onUpdate( function() { updateScale(); } )
        .onComplete( function() { 
            pointMaterial.size = 0.005;
            if (clickedPlanet.type < 2) {
                paths[clickedPlanet.path].material = transparentMaterial;
                for (let i = 0; i < moons.length; i++) {
                    if (moons[i].orbitId == clickedPlanet.sysId) {
                        planetMoons.push(moons[i]);
                        $("#" + moons[i].sysId ).show();
                        scene.children[moons[i].childId].material = pathMaterials[0];
                    }
                }
            }
        } )
        .easing(TWEEN.Easing.Quadratic.InOut).start();
}

function zoomOut() {
    controls.maxDistance = initMaxDistance;
    const currentCam = camera.position.clone().sub(lastClickedPlanet.celestialPos).length();
    const tweenPushOut = new TWEEN.Tween(controls).to( {minDistance: initMinDistance}, 1000 )
        .easing(TWEEN.Easing.Quadratic.InOut).start();

    const tweenZoomOut = new TWEEN.Tween(camera).to( {fov:initialFOV}, 1000 )
    .onUpdate( function() { camera.updateProjectionMatrix() } )
    .easing(TWEEN.Easing.Quadratic.InOut).start();

    const tweenGrow = new TWEEN.Tween(planetScale).to( {f: 1.0}, 1000 )
        .onStart( function() { 
            pointMaterial.size = initialPoint;
            for (let i = 0; i < paths.length; i++) {
                paths[i].material = paths[i].initMaterial;
            } 
        })
        .onUpdate( function() { updateScale(); } )
        .easing(TWEEN.Easing.Quadratic.InOut).start();

    for (let i = 0; i < planetMoons.length; i++) {
        $("#" + planetMoons[i].sysId ).hide();
    }
    planetMoons = [];
}