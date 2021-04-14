import * as ORR from "./init.js";
import * as TWEEN from "../../tween/tween.esm.js";
import $ from "../../jquery/jquery.module.js";

function windowResize() { // window setup and resize handler
    ORR.renderer.setSize( window.innerWidth, window.innerHeight );
    ORR.renderer.setPixelRatio( window.devicePixelRatio );
    ORR.camera.aspect = window.innerWidth/window.innerHeight;
    ORR.camera.updateProjectionMatrix();
    ORR.bloomComposer.setSize( window.innerWidth, window.innerHeight );
    ORR.finalComposer.setSize( window.innerWidth, window.innerHeight );
    ORR.center.x = window.innerWidth * 0.5;
    ORR.center.y = window.innerHeight * 0.5;
    placeWidgets();
}
window.addEventListener('resize', windowResize );
windowResize();

window.addEventListener('mousemove', onMouseMove );
function onMouseMove(e) { 
    ORR.state.mousePos.x = e.clientX; 
    ORR.state.mousePos.y = e.clientY;
}

function pauseResume() {
    if (ORR.times.speed == ORR.pauseRate) { // resume
        ORR.times.speed = ORR.times.lastSpeed;
    } else { // pause but remeber previous speed
        ORR.times.lastSpeed = ORR.times.speed;
        ORR.times.speed = ORR.pauseRate;
    }
    ORR.times.rate = ORR.rates[ORR.times.speed];
}

$(document).on("keydown", function(event) { // keystroke handler
    switch(event.keyCode) {
        case 37 : 
            ORR.slowTime();
        break;
        case 39 : 
            ORR.speedTime();
        break;
        case 40 : 
            ORR.setTime(ORR.unixToMJD(Date.now()));
        break;
        case 32 :
            document.activeElement.blur();
            pauseResume();
        break;
        case 27 : // unclick clicked tag
            if (ORR.state.clickedLabel != "") {
                closeTag(ORR.state.clickedLabel);
            }
        break;
        case 38 :
            zoomToggle();
        break;
        case 113:
            $("#inputBox").toggle(300);
        break;
        case 115:
            ORR.cameraLocked.graticule.visible = !ORR.cameraLocked.graticule.visible;
        break;
        case 119:
            ORR.state.extraData = !ORR.state.extraData;
        break;
    }
    ORR.times.rate = ORR.rates[ORR.times.speed]; // apply speed changes
});

/**
 * Handle tag clicks.
 * @param {number} t - System ID 
 */
export function clickTag(t) {
    if ($('#' + t).length < 1) {
        ORR.makeLabel(t);
    }
    ORR.state.clickedLabel = $('#' + t);
    ORR.state.clickedLabel.addClass( "active" ).show();
    if ($.isEmptyObject(ORR.state.lastClickedPlanet) == false) {
        ORR.paths[ORR.state.clickedPlanet.path].material = ORR.pathMaterials[Math.min(ORR.state.lastClickedPlanet.type, 3)];
    }
    ORR.state.clickedPlanet = ORR.system[t];
    ORR.paths[ORR.state.clickedPlanet.path].material = ORR.selectedPathMat;
    if (ORR.system[t].type > 3) {
        ORR.scene.add(ORR.paths[ORR.state.clickedPlanet.path]);
    }
    $("#distToActive").remove();
    ORR.state.lastClickedPlanet = ORR.state.clickedPlanet;
    ORR.controls.minDistance = 0.1;
    const tweenTo = new TWEEN.Tween(ORR.controls.target)
        .to( { x:ORR.state.clickedPlanet.celestialPos.x, y:ORR.state.clickedPlanet.celestialPos.y, z:ORR.state.clickedPlanet.celestialPos.z}, 1000 ).easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate( function() { this.to({ x:ORR.state.clickedPlanet.celestialPos.x, y:ORR.state.clickedPlanet.celestialPos.y, z:ORR.state.clickedPlanet.celestialPos.z })} )
        .start();

    $("#info a").attr("href", ORR.state.clickedPlanet.wiki);
    $("#infohead").html(ORR.state.clickedLabel[0].innerHTML);
    if (ORR.state.clickedPlanet.wikipic != "default") {
        $("#info img").attr("src", ORR.state.clickedPlanet.wikipic).show();
    } else {
        $("#info img").hide();
    }
    const planetInfo = ORR.state.clickedPlanet.info;
    let moonInfo = ""
    if (ORR.state.clickedPlanet.moons > 0) {
        moonInfo = '<br><a id="moonZoom">Moons: ' + ORR.state.clickedPlanet.moons + ' (' + ORR.state.clickedPlanet.largestMoon;
        moonInfo +=  (ORR.state.clickedPlanet.moons > 1) ? ',&nbsp;&nbsp;' + ORR.state.clickedPlanet.secondMoon : '';
        moonInfo += (ORR.state.clickedPlanet.moons > 2) ? ', et al.)</a>' : ')</a>';
    }
    $("#planetInfo").html( planetInfo + moonInfo );
        $("#moonZoom").on("click", function() {
        zoomToggle();
    })
    const adjustedA = (ORR.state.clickedPlanet.semiMajorAxis < 0.1 ) ? (ORR.state.clickedPlanet.semiMajorAxis * ORR.AU).toFixed(1) + '&nbsp;km' : ORR.state.clickedPlanet.semiMajorAxis.toFixed(4) + '&nbsp;AU';
    $("#semiMajorAxis").html(adjustedA);
    const adjustedP = (ORR.state.clickedPlanet.period < 0.01 ) ? (ORR.state.clickedPlanet.period * ORR.daysPerCent).toFixed(3) + '&nbsp;days' : (ORR.state.clickedPlanet.period * 100).toFixed(3) + '&nbsp;years'
    $("#period").html(adjustedP);
    $("#eccentricity").html(ORR.state.clickedPlanet.eccentricity.toFixed(3));
    $("#inclination").html((ORR.state.clickedPlanet.inclination * ORR.toDeg).toFixed(2));
    $("#radius").html(parseFloat(ORR.state.clickedPlanet.radius).toFixed(1));
    $("#absMag").html(ORR.state.clickedPlanet.absoluteMag.toFixed(2));
    $("#info").show(300);
    if (t == ORR.specialID.earth) { 
        $("#earthRel").hide(); 
        $("#earth").show(); 
    } else { 
        $("#earthRel").show(); 
        $("#earth").hide(); 
    }
}

/**
 * Unclick a tag.
 * @param {number} t - System ID
 */
export function closeTag(t) {
    t.removeClass( "active" );

    if (t.hasClass( "tag3" )) {
        t.removeClass( "tag3" );
        t.addClass( "tag2" );
    }
    ORR.state.clickedLabel = "";
    ORR.paths[ORR.state.clickedPlanet.path].material = ORR.pathMaterials[Math.min(ORR.state.clickedPlanet.type, 3)];
    if (ORR.state.following) {
        zoomOut(ORR.state.lastClickedPlanet.exagRadius / 2000);
    }
    ORR.state.following = false;
    ORR.controls.maxDistance = 100;
    const tweenMin = new TWEEN.Tween(ORR.controls).to( {minDistance: 1}, 1000 ).easing(TWEEN.Easing.Quadratic.InOut).start();
    const tweenHome = new TWEEN.Tween(ORR.controls.target).to( {x:0, y:0, z:0}, 1000 ).easing(TWEEN.Easing.Quadratic.InOut).start();
    $("#info").hide(300);
}

function updateScale() {
    for (let i = 0; i < ORR.majorBodies.length; i++) {
        const scaleBody = ORR.scene.children[ORR.majorBodies[i].childId];
        scaleBody.scale.set(ORR.planetScale.f, ORR.planetScale.f, ORR.planetScale.f);
        ORR.sun.scale.set(ORR.planetScale.f, ORR.planetScale.f, ORR.planetScale.f);
    }
}

function zoomIn() {
    ORR.controls.minDistance = ORR.state.clickedPlanet.radius / ORR.AU * 100000;
    const currentCam = ORR.camera.position.clone().sub(ORR.state.clickedPlanet.celestialPos).length();
    const tweenPushIn = new TWEEN.Tween(ORR.controls).to( {maxDistance: ORR.initMaxDistance / ORR.state.clickedPlanet.zoomRatio}, 1000 )
        .easing(TWEEN.Easing.Quadratic.InOut).start();

    const tweenZoomIn = new TWEEN.Tween(ORR.camera).to( {fov:.001}, 1000 )
        .onUpdate( () => ORR.camera.updateProjectionMatrix() )
        .easing(TWEEN.Easing.Quadratic.InOut).start();
    
    const tweenShrink = new TWEEN.Tween(ORR.planetScale).to( {f: 1/ORR.exagScale}, 1000 )
        .onUpdate( () => updateScale() )
        .onComplete( function() { 
            ORR.pointMaterial.size = 0.005;
            if (ORR.state.clickedPlanet.type < 2) {
                ORR.paths[ORR.state.clickedPlanet.path].material = ORR.transparentMaterial;
                for (let i = 0; i < ORR.moons.length; i++) {
                    if (ORR.moons[i].orbitId == ORR.state.clickedPlanet.sysId) {
                        ORR.planetMoons.push(ORR.moons[i]);
                        $("#" + ORR.moons[i].sysId ).show();
                        ORR.scene.children[ORR.moons[i].childId].material = ORR.pathMaterials[0];
                    }
                }
            }
        } )
        .easing(TWEEN.Easing.Quadratic.InOut).start();
}

function zoomOut() {
    ORR.controls.maxDistance = ORR.initMaxDistance;
    const currentCam = ORR.camera.position.clone().sub(ORR.state.lastClickedPlanet.celestialPos).length();
    const tweenPushOut = new TWEEN.Tween(ORR.controls).to( {minDistance: ORR.initMinDistance}, 1000 )
        .easing(TWEEN.Easing.Quadratic.InOut).start();

    const tweenZoomOut = new TWEEN.Tween(ORR.camera).to( {fov:ORR.initialFOV}, 1000 )
    .onUpdate( () => ORR.camera.updateProjectionMatrix() )
    .easing(TWEEN.Easing.Quadratic.InOut).start();

    const tweenGrow = new TWEEN.Tween(ORR.planetScale).to( {f: 1.0}, 1000 )
        .onStart( function() { 
            ORR.pointMaterial.size = ORR.initialPoint;
            for (let i = 0; i < ORR.paths.length; i++) {
                ORR.paths[i].material = ORR.paths[i].initMaterial;
            } 
        })
        .onUpdate( () => updateScale() )
        .easing(TWEEN.Easing.Quadratic.InOut).start();

    for (let i = 0; i < ORR.planetMoons.length; i++) {
        $("#" + ORR.planetMoons[i].sysId ).hide();
    }
    ORR.planetMoons.splice(0, ORR.planetMoons.length);
}

function zoomToggle() {
    const scaleRadius = ORR.state.clickedPlanet.exagRadius / 2000;
    ORR.state.following = (ORR.state.clickedLabel != "") ? !ORR.state.following : false;
    (ORR.state.following) ? zoomIn(scaleRadius) : zoomOut(scaleRadius);
}

$( "#autocomplete" ).autocomplete({
    minLength: 2,
    source: function( request, response ) {
          var matcher = new RegExp( $.ui.autocomplete.escapeRegex( request.term ), "i" );
          response( $.grep( ORR.searchLists.combined, function( item ){
              return matcher.test( item );
          }));
      },
      select: function( e, ui ) {
        if (ORR.state.clickedLabel != "") {
            closeTag(ORR.state.clickedLabel);
        }
        clickTag(ORR.searchLists.orderedNames.indexOf(ui.item.value));
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

$("#reverse").on("click", function() {
    ORR.slowTime();
});

$("#forward").on("click", function() {
    ORR.speedTime();
});

$("#play").on("click", function() {
    pauseResume();
    $("#playpause").attr('src', (ORR.times.speed == 7) ? 'data/play.png' : 'data/pause.png');
});

$("#now").on("click", function() {
    ORR.setTime(ORR.unixToMJD(Date.now()));
});

$("#moonBox, #asteroidBox, #cometBox").on("click", function() {
    $("#autocomplete")[0].value = "";
    ORR.searchLists.combined = ORR.searchLists.planetNames.concat( 
        ($("#moonBox")[0].checked) ? ORR.searchLists.moonNames : null, 
        ($("#asteroidBox")[0].checked) ? ORR.searchLists.asteroidNames : null, 
        ($("#cometBox")[0].checked) ? ORR.searchLists.cometNames : null );
});

$("#setCoords").on("click", function() {
    const lat = parseFloat($("#manualLat").val());
    const lon = parseFloat($("#manualLon").val());
    ORR.groundPosition.latitude = (Math.abs(lat) <=90) ? lat : 0;
    ORR.groundPosition.longitude = (Math.abs(lon) <=180) ? lon : 0;
    ORR.displayLatLong(ORR.groundPosition.latitude, ORR.groundPosition.longitude);
});

$("#setTime").on("click", function() {
    let day = $("#manualDay").val();
    day = (day.length > 0) ? day: "0101";
    let time = $("#manualTime").val();
    time = (time.length > 0) ? time: "0000";
    let year = $("#manualYear").val();
    year = (year == "") ? 2000 : year;
    const yearNum = Math.min(Math.max(parseFloat(year), -9999), 9999);
    year = (yearNum > 0) ? ("000" + year).slice(-4) : "-00" + ("000" + Math.abs(yearNum)).slice(-4) ;
    const date = year + "-" + day.substr(0, 2) + "-" + day.substr(2,2) + "T" + 
    time.substr(0,2) + ":" + time.substr(2,2);
    ORR.setTime(ORR.unixToMJD(Date.parse(date)));
});

$("#clearSplash").on("click", function() {
    $("#splashScreen").hide(300);
    ORR.state.showSplash = false;
});

$("#openSplash").on("click", function() {
    ORR.state.showSplash = true;
    $("#splashScreen").show(300);
    $("#clearSplash").css({"visibility": "visible"});
});