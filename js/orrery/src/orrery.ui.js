import { toDeg, AU, daysPerCent, displayLatLong, unixToMJD, slowTime, speedTime, setTime, rates, pauseRate, 
    initialPoint, initialFOV, exagScale,initMinDistance, initMaxDistance, system, majorBodies, moons, paths, 
    specialID, center, cameraLocked, timeManager, planetMoons, searchLists, stateManager, planetScale, groundPosition, 
    scene, renderer, pathMaterials, selectedPathMat, pointMaterial, transparentMaterial, bloomComposer, finalComposer, 
    sun, controls, makeLabel, camera } from "./orrery.init.js";

function windowResize() { // window setup and resize handler
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setPixelRatio( window.devicePixelRatio );
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    bloomComposer.setSize( window.innerWidth, window.innerHeight );
    finalComposer.setSize( window.innerWidth, window.innerHeight );
    center.x = window.innerWidth * 0.5;
    center.y = window.innerHeight * 0.5;
    placeWidgets();
}
window.addEventListener('resize', windowResize );
windowResize();

window.addEventListener('mousemove', onMouseMove );
function onMouseMove(e) { 
    stateManager.mousePos.x = e.clientX; 
    stateManager.mousePos.y = e.clientY;
}

function pauseResume() {
    if (timeManager.speed == pauseRate) { // resume
        timeManager.speed = timeManager.lastSpeed;
    } else { // pause but remeber previous speed
        timeManager.lastSpeed = timeManager.speed;
        timeManager.speed = pauseRate;
    }
    timeManager.rate = rates[timeManager.speed];
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
            setTime(unixToMJD(Date.now()));
        break;
        case 32 :
            pauseResume();
        break;
        case 27 : // unclick clicked tag
            if (stateManager.clickedLabel != "") {
                closeTag(stateManager.clickedLabel);
            }
        break;
        case 38 :
            zoomToggle();
        break;
        case 113:
            $("#inputBox").toggle(300);
        break;
        case 115:
            cameraLocked.graticule.visible = !cameraLocked.graticule.visible;
        break;
        case 119:
            stateManager.extraData = !stateManager.extraData;
        break;
    }
    timeManager.rate = rates[timeManager.speed]; // apply speed changes
});

function clickTag(t) {
    if ($('#' + t).length < 1) {
        makeLabel(t);
    }
    stateManager.clickedLabel = $('#' + t);
    stateManager.clickedLabel.addClass( "active" ).show();
    if (jQuery.isEmptyObject(stateManager.lastClickedPlanet) == false) {
        paths[stateManager.clickedPlanet.path].material = pathMaterials[Math.min(stateManager.lastClickedPlanet.type, 3)];
    }
    stateManager.clickedPlanet = system[t];
    paths[stateManager.clickedPlanet.path].material = selectedPathMat;
    if (system[t].type > 3) {
        scene.add(paths[stateManager.clickedPlanet.path]);
    }
    $("#distToActive").remove();
    stateManager.lastClickedPlanet = stateManager.clickedPlanet;
    controls.minDistance = 0.1;
    const tweenTo = new TWEEN.Tween(controls.target)
        .to( { x:stateManager.clickedPlanet.celestialPos.x, y:stateManager.clickedPlanet.celestialPos.y, z:stateManager.clickedPlanet.celestialPos.z}, 1000 ).easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate( function() { this.to({ x:stateManager.clickedPlanet.celestialPos.x, y:stateManager.clickedPlanet.celestialPos.y, z:stateManager.clickedPlanet.celestialPos.z })} )
        .start();

    $("#info a").attr("href", stateManager.clickedPlanet.wiki);
    $("#infohead").html(stateManager.clickedLabel[0].innerHTML);
    if (stateManager.clickedPlanet.wikipic != "default") {
        $("#info img").attr("src", stateManager.clickedPlanet.wikipic).show();
    } else {
        $("#info img").hide();
    }
    const planetInfo = stateManager.clickedPlanet.info;
    let moonInfo = ""
    if (stateManager.clickedPlanet.moons > 0) {
        moonInfo = '<br><a id="moonZoom">Moons: ' + stateManager.clickedPlanet.moons + ' (' + stateManager.clickedPlanet.largestMoon;
        moonInfo +=  (stateManager.clickedPlanet.moons > 1) ? ',&nbsp;&nbsp;' + stateManager.clickedPlanet.secondMoon : '';
        moonInfo += (stateManager.clickedPlanet.moons > 2) ? ', et al.)</a>' : ')</a>';
    }
    $("#planetInfo").html( planetInfo + moonInfo );
        $("#moonZoom").click( function() {
        zoomToggle();
    })
    const adjustedA = (stateManager.clickedPlanet.semiMajorAxis < 0.1 ) ? (stateManager.clickedPlanet.semiMajorAxis * AU).toFixed(1) + '&nbsp;km' : stateManager.clickedPlanet.semiMajorAxis.toFixed(4) + '&nbsp;AU';
    $("#semiMajorAxis").html(adjustedA);
    const adjustedP = (stateManager.clickedPlanet.period < 0.01 ) ? (stateManager.clickedPlanet.period * daysPerCent).toFixed(3) + '&nbsp;days' : (stateManager.clickedPlanet.period * 100).toFixed(3) + '&nbsp;years'
    $("#period").html(adjustedP);
    $("#eccentricity").html(stateManager.clickedPlanet.eccentricity.toFixed(3));
    $("#inclination").html((stateManager.clickedPlanet.inclination * toDeg).toFixed(2));
    $("#radius").html(parseFloat(stateManager.clickedPlanet.radius).toFixed(1));
    $("#absMag").html(stateManager.clickedPlanet.absoluteMag.toFixed(2));
    $("#info").show(300);
    if (t == specialID.earth) { 
        $("#earthRel").hide(); 
        $("#earth").show(); 
    } else { 
        $("#earthRel").show(); 
        $("#earth").hide(); 
    }
}

function updateScale() {
    for (let i = 0; i < majorBodies.length; i++) {
        const scaleBody = scene.children[majorBodies[i].childId];
        scaleBody.scale.set(planetScale.f, planetScale.f, planetScale.f);
        sun.scale.set(planetScale.f, planetScale.f, planetScale.f);
    }
}

function zoomIn() {
    controls.minDistance = stateManager.clickedPlanet.radius / AU * 100000;
    const currentCam = camera.position.clone().sub(stateManager.clickedPlanet.celestialPos).length();
    const tweenPushIn = new TWEEN.Tween(controls).to( {maxDistance: initMaxDistance / stateManager.clickedPlanet.zoomRatio}, 1000 )
        .easing(TWEEN.Easing.Quadratic.InOut).start();

    const tweenZoomIn = new TWEEN.Tween(camera).to( {fov:.001}, 1000 )
        .onUpdate( function() { camera.updateProjectionMatrix() } )
        .easing(TWEEN.Easing.Quadratic.InOut).start();
    
    const tweenShrink = new TWEEN.Tween(planetScale).to( {f: 1/exagScale}, 1000 )
        .onUpdate( function() { updateScale(); } )
        .onComplete( function() { 
            pointMaterial.size = 0.005;
            if (stateManager.clickedPlanet.type < 2) {
                paths[stateManager.clickedPlanet.path].material = transparentMaterial;
                for (let i = 0; i < moons.length; i++) {
                    if (moons[i].orbitId == stateManager.clickedPlanet.sysId) {
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
    const currentCam = camera.position.clone().sub(stateManager.lastClickedPlanet.celestialPos).length();
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
    planetMoons.splice(0, planetMoons.length);
}

function zoomToggle() {
    const scaleRadius = stateManager.clickedPlanet.exagRadius / 2000;
    stateManager.following = (stateManager.clickedLabel != "") ? !stateManager.following : false;
    (stateManager.following) ? zoomIn(scaleRadius) : zoomOut(scaleRadius);
}

$( "#autocomplete" ).autocomplete({
    minLength: 2,
    source: function( request, response ) {
          var matcher = new RegExp( $.ui.autocomplete.escapeRegex( request.term ), "i" );
          response( $.grep( searchLists.combined, function( item ){
              return matcher.test( item );
          }));
      },
      select: function( e, ui ) {
        if (stateManager.clickedLabel != "") {
            closeTag(stateManager.clickedLabel);
        }
        clickTag(orderedNames.indexOf(ui.item.value));
        this.value = "";
        return false;
    }
});

$( function() {
    $( "#inputBox" ).accordion({
        heightStyle: "content"
    });
    placeWidgets();
    $( "#button, #input" ).tooltip();
});

function placeWidgets() {
    $( "#inputBox" ).position({
        my: "left top",
        at: "left top",
        of: document
      });
}

$("#reverse").click( function() {
    slowTime();
});

$("#forward").click( function() {
    speedTime();
});

$("#play").click( function() {
    pauseResume();
    $("#playpause").attr('src', (timeManager.speed==7) ? 'data/play.png' : 'data/pause.png');
});

$("#now").click( function() {
    setTime(unixToMJD(Date.now()));
});

$("#moonBox, #asteroidBox, #cometBox").click( function() {
    $("#autocomplete")[0].value = "";
    searchLists.combined = searchLists.planetNames.concat( 
        ($("#moonBox")[0].checked) ? searchLists.moonNames : null, 
        ($("#asteroidBox")[0].checked) ? searchLists.asteroidNames : null, 
        ($("#cometBox")[0].checked) ? searchLists.cometNames : null );
});

$("#setCoords").click( function() {
    const lat = parseFloat($("#manualLat").val());
    const lon = parseFloat($("#manualLon").val());
    groundPosition.latitude = (Math.abs(lat) <=90) ? lat : 0;
    groundPosition.longitude = (Math.abs(lon) <=180) ? lon : 0;
    displayLatLong(groundPosition.latitude, groundPosition.longitude);
});

$("#setTime").click( function() {
    let day = $("#manualDay").val();
    day = (day.length > 0) ? day: "0101";
    let time = $("#manualTime").val();
    time = (time.length > 0) ? time: "0000";
    let year = $("#manualYear").val();
    const yearNum = Math.min(Math.max(parseFloat(year), -9999), 9999);
    year = (yearNum > 0) ? ("000" + year).slice(-4) : "-00" + ("000" + Math.abs(yearNum)).slice(-4) ;
    const date = year + "-" + day.substr(0, 2) + "-" + day.substr(2,2) + "T" + 
    time.substr(0,2) + ":" + time.substr(2,2);
    setTime(unixToMJD(Date.parse(date)));
});

$("#clearSplash").click( function() {
    $("#splashScreen").hide(300);
    stateManager.showSplash = false;
});

$("#openSplash").click( function() {
    stateManager.showSplash = true;
    $("#splashScreen").show(300);
    $("#clearSplash").css({"visibility": "visible"});
});

function closeTag(t) {
    t.removeClass( "active" );

    if (t.hasClass( "tag3" )) {
        t.removeClass( "tag3" );
        t.addClass( "tag2" );
    }
    stateManager.clickedLabel = "";
    paths[stateManager.clickedPlanet.path].material = pathMaterials[Math.min(stateManager.clickedPlanet.type, 3)];
    if (stateManager.following) {
        zoomOut(stateManager.lastClickedPlanet.exagRadius / 2000);
    }
    stateManager.following = false;
    controls.maxDistance = 100;
    const tweenMin = new TWEEN.Tween(controls).to( {minDistance: 1}, 1000 ).easing(TWEEN.Easing.Quadratic.InOut).start();
    const tweenHome = new TWEEN.Tween(controls.target).to( {x:0, y:0, z:0}, 1000 ).easing(TWEEN.Easing.Quadratic.InOut).start();
    $("#info").hide(300);
}

export { clickTag };