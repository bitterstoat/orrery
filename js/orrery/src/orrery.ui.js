import * as Orrery from "./orrery.init.js";

function windowResize() { // window setup and resize handler
    Orrery.renderer.setSize( window.innerWidth, window.innerHeight );
    Orrery.renderer.setPixelRatio( window.devicePixelRatio );
    Orrery.camera.aspect = window.innerWidth/window.innerHeight;
    Orrery.camera.updateProjectionMatrix();
    Orrery.bloomComposer.setSize( window.innerWidth, window.innerHeight );
    Orrery.finalComposer.setSize( window.innerWidth, window.innerHeight );
    Orrery.center.x = window.innerWidth * 0.5;
    Orrery.center.y = window.innerHeight * 0.5;
    placeWidgets();
}
window.addEventListener('resize', windowResize );
windowResize();

window.addEventListener('mousemove', onMouseMove );
function onMouseMove(e) { 
    Orrery.stateManager.mousePos.x = e.clientX; 
    Orrery.stateManager.mousePos.y = e.clientY;
}

function pauseResume() {
    if (Orrery.timeManager.speed == Orrery.pauseRate) { // resume
        Orrery.timeManager.speed = Orrery.timeManager.lastSpeed;
    } else { // pause but remeber previous speed
        Orrery.timeManager.lastSpeed = Orrery.timeManager.speed;
        Orrery.timeManager.speed = Orrery.pauseRate;
    }
    Orrery.timeManager.rate = Orrery.rates[Orrery.timeManager.speed];
}

$(document).keydown(function(event) { // keystroke handler
    switch(event.keyCode) {
        case 37 : 
            Orrery.slowTime();
        break;
        case 39 : 
            Orrery.speedTime();
        break;
        case 40 : 
            Orrery.setTime(Orrery.unixToMJD(Date.now()));
        break;
        case 32 :
            document.activeElement.blur();
            pauseResume();
        break;
        case 27 : // unclick clicked tag
            if (Orrery.stateManager.clickedLabel != "") {
                closeTag(Orrery.stateManager.clickedLabel);
            }
        break;
        case 38 :
            zoomToggle();
        break;
        case 113:
            $("#inputBox").toggle(300);
        break;
        case 115:
            Orrery.cameraLocked.graticule.visible = !Orrery.cameraLocked.graticule.visible;
        break;
        case 119:
            Orrery.stateManager.extraData = !Orrery.stateManager.extraData;
        break;
    }
    Orrery.timeManager.rate = Orrery.rates[Orrery.timeManager.speed]; // apply speed changes
});

export function clickTag(t) {
    if ($('#' + t).length < 1) {
        Orrery.makeLabel(t);
    }
    Orrery.stateManager.clickedLabel = $('#' + t);
    Orrery.stateManager.clickedLabel.addClass( "active" ).show();
    if (jQuery.isEmptyObject(Orrery.stateManager.lastClickedPlanet) == false) {
        Orrery.paths[Orrery.stateManager.clickedPlanet.path].material = Orrery.pathMaterials[Math.min(Orrery.stateManager.lastClickedPlanet.type, 3)];
    }
    Orrery.stateManager.clickedPlanet = Orrery.system[t];
    Orrery.paths[Orrery.stateManager.clickedPlanet.path].material = Orrery.selectedPathMat;
    if (Orrery.system[t].type > 3) {
        Orrery.scene.add(Orrery.paths[Orrery.stateManager.clickedPlanet.path]);
    }
    $("#distToActive").remove();
    Orrery.stateManager.lastClickedPlanet = Orrery.stateManager.clickedPlanet;
    Orrery.controls.minDistance = 0.1;
    const tweenTo = new TWEEN.Tween(Orrery.controls.target)
        .to( { x:Orrery.stateManager.clickedPlanet.celestialPos.x, y:Orrery.stateManager.clickedPlanet.celestialPos.y, z:Orrery.stateManager.clickedPlanet.celestialPos.z}, 1000 ).easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate( function() { this.to({ x:Orrery.stateManager.clickedPlanet.celestialPos.x, y:Orrery.stateManager.clickedPlanet.celestialPos.y, z:Orrery.stateManager.clickedPlanet.celestialPos.z })} )
        .start();

    $("#info a").attr("href", Orrery.stateManager.clickedPlanet.wiki);
    $("#infohead").html(Orrery.stateManager.clickedLabel[0].innerHTML);
    if (Orrery.stateManager.clickedPlanet.wikipic != "default") {
        $("#info img").attr("src", Orrery.stateManager.clickedPlanet.wikipic).show();
    } else {
        $("#info img").hide();
    }
    const planetInfo = Orrery.stateManager.clickedPlanet.info;
    let moonInfo = ""
    if (Orrery.stateManager.clickedPlanet.moons > 0) {
        moonInfo = '<br><a id="moonZoom">Moons: ' + Orrery.stateManager.clickedPlanet.moons + ' (' + Orrery.stateManager.clickedPlanet.largestMoon;
        moonInfo +=  (Orrery.stateManager.clickedPlanet.moons > 1) ? ',&nbsp;&nbsp;' + Orrery.stateManager.clickedPlanet.secondMoon : '';
        moonInfo += (Orrery.stateManager.clickedPlanet.moons > 2) ? ', et al.)</a>' : ')</a>';
    }
    $("#planetInfo").html( planetInfo + moonInfo );
        $("#moonZoom").click( function() {
        zoomToggle();
    })
    const adjustedA = (Orrery.stateManager.clickedPlanet.semiMajorAxis < 0.1 ) ? (Orrery.stateManager.clickedPlanet.semiMajorAxis * Orrery.AU).toFixed(1) + '&nbsp;km' : Orrery.stateManager.clickedPlanet.semiMajorAxis.toFixed(4) + '&nbsp;AU';
    $("#semiMajorAxis").html(adjustedA);
    const adjustedP = (Orrery.stateManager.clickedPlanet.period < 0.01 ) ? (Orrery.stateManager.clickedPlanet.period * Orrery.daysPerCent).toFixed(3) + '&nbsp;days' : (Orrery.stateManager.clickedPlanet.period * 100).toFixed(3) + '&nbsp;years'
    $("#period").html(adjustedP);
    $("#eccentricity").html(Orrery.stateManager.clickedPlanet.eccentricity.toFixed(3));
    $("#inclination").html((Orrery.stateManager.clickedPlanet.inclination * Orrery.toDeg).toFixed(2));
    $("#radius").html(parseFloat(Orrery.stateManager.clickedPlanet.radius).toFixed(1));
    $("#absMag").html(Orrery.stateManager.clickedPlanet.absoluteMag.toFixed(2));
    $("#info").show(300);
    if (t == Orrery.specialID.earth) { 
        $("#earthRel").hide(); 
        $("#earth").show(); 
    } else { 
        $("#earthRel").show(); 
        $("#earth").hide(); 
    }
}

function updateScale() {
    for (let i = 0; i < Orrery.majorBodies.length; i++) {
        const scaleBody = Orrery.scene.children[Orrery.majorBodies[i].childId];
        scaleBody.scale.set(Orrery.planetScale.f, Orrery.planetScale.f, Orrery.planetScale.f);
        Orrery.sun.scale.set(Orrery.planetScale.f, Orrery.planetScale.f, Orrery.planetScale.f);
    }
}

function zoomIn() {
    Orrery.controls.minDistance = Orrery.stateManager.clickedPlanet.radius / Orrery.AU * 100000;
    const currentCam = Orrery.camera.position.clone().sub(Orrery.stateManager.clickedPlanet.celestialPos).length();
    const tweenPushIn = new TWEEN.Tween(Orrery.controls).to( {maxDistance: Orrery.initMaxDistance / Orrery.stateManager.clickedPlanet.zoomRatio}, 1000 )
        .easing(TWEEN.Easing.Quadratic.InOut).start();

    const tweenZoomIn = new TWEEN.Tween(Orrery.camera).to( {fov:.001}, 1000 )
        .onUpdate( function() { Orrery.camera.updateProjectionMatrix() } )
        .easing(TWEEN.Easing.Quadratic.InOut).start();
    
    const tweenShrink = new TWEEN.Tween(Orrery.planetScale).to( {f: 1/Orrery.exagScale}, 1000 )
        .onUpdate( function() { updateScale(); } )
        .onComplete( function() { 
            Orrery.pointMaterial.size = 0.005;
            if (Orrery.stateManager.clickedPlanet.type < 2) {
                Orrery.paths[Orrery.stateManager.clickedPlanet.path].material = Orrery.transparentMaterial;
                for (let i = 0; i < Orrery.moons.length; i++) {
                    if (Orrery.moons[i].orbitId == Orrery.stateManager.clickedPlanet.sysId) {
                        Orrery.planetMoons.push(Orrery.moons[i]);
                        $("#" + Orrery.moons[i].sysId ).show();
                        Orrery.scene.children[Orrery.moons[i].childId].material = Orrery.pathMaterials[0];
                    }
                }
            }
        } )
        .easing(TWEEN.Easing.Quadratic.InOut).start();
}

function zoomOut() {
    Orrery.controls.maxDistance = Orrery.initMaxDistance;
    const currentCam = Orrery.camera.position.clone().sub(Orrery.stateManager.lastClickedPlanet.celestialPos).length();
    const tweenPushOut = new TWEEN.Tween(Orrery.controls).to( {minDistance: Orrery.initMinDistance}, 1000 )
        .easing(TWEEN.Easing.Quadratic.InOut).start();

    const tweenZoomOut = new TWEEN.Tween(Orrery.camera).to( {fov:Orrery.initialFOV}, 1000 )
    .onUpdate( function() { Orrery.camera.updateProjectionMatrix() } )
    .easing(TWEEN.Easing.Quadratic.InOut).start();

    const tweenGrow = new TWEEN.Tween(Orrery.planetScale).to( {f: 1.0}, 1000 )
        .onStart( function() { 
            Orrery.pointMaterial.size = Orrery.initialPoint;
            for (let i = 0; i < Orrery.paths.length; i++) {
                Orrery.paths[i].material = Orrery.paths[i].initMaterial;
            } 
        })
        .onUpdate( function() { updateScale(); } )
        .easing(TWEEN.Easing.Quadratic.InOut).start();

    for (let i = 0; i < Orrery.planetMoons.length; i++) {
        $("#" + Orrery.planetMoons[i].sysId ).hide();
    }
    Orrery.planetMoons.splice(0, Orrery.planetMoons.length);
}

function zoomToggle() {
    const scaleRadius = Orrery.stateManager.clickedPlanet.exagRadius / 2000;
    Orrery.stateManager.following = (Orrery.stateManager.clickedLabel != "") ? !Orrery.stateManager.following : false;
    (Orrery.stateManager.following) ? zoomIn(scaleRadius) : zoomOut(scaleRadius);
}

$( "#autocomplete" ).autocomplete({
    minLength: 2,
    source: function( request, response ) {
          var matcher = new RegExp( $.ui.autocomplete.escapeRegex( request.term ), "i" );
          response( $.grep( Orrery.searchLists.combined, function( item ){
              return matcher.test( item );
          }));
      },
      select: function( e, ui ) {
        if (Orrery.stateManager.clickedLabel != "") {
            closeTag(Orrery.stateManager.clickedLabel);
        }
        clickTag(Orrery.searchLists.orderedNames.indexOf(ui.item.value));
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
    Orrery.slowTime();
});

$("#forward").click( function() {
    Orrery.speedTime();
});

$("#play").click( function() {
    pauseResume();
    $("#playpause").attr('src', (Orrery.timeManager.speed==7) ? 'data/play.png' : 'data/pause.png');
});

$("#now").click( function() {
    Orrery.setTime(Orrery.unixToMJD(Date.now()));
});

$("#moonBox, #asteroidBox, #cometBox").click( function() {
    $("#autocomplete")[0].value = "";
    Orrery.searchLists.combined = Orrery.searchLists.planetNames.concat( 
        ($("#moonBox")[0].checked) ? Orrery.searchLists.moonNames : null, 
        ($("#asteroidBox")[0].checked) ? Orrery.searchLists.asteroidNames : null, 
        ($("#cometBox")[0].checked) ? Orrery.searchLists.cometNames : null );
});

$("#setCoords").click( function() {
    const lat = parseFloat($("#manualLat").val());
    const lon = parseFloat($("#manualLon").val());
    Orrery.groundPosition.latitude = (Math.abs(lat) <=90) ? lat : 0;
    Orrery.groundPosition.longitude = (Math.abs(lon) <=180) ? lon : 0;
    Orrery.displayLatLong(Orrery.groundPosition.latitude, Orrery.groundPosition.longitude);
});

$("#Orrery.setTime").click( function() {
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
    Orrery.setTime(Orrery.unixToMJD(Date.parse(date)));
});

$("#clearSplash").click( function() {
    $("#splashScreen").hide(300);
    Orrery.stateManager.showSplash = false;
});

$("#openSplash").click( function() {
    Orrery.stateManager.showSplash = true;
    $("#splashScreen").show(300);
    $("#clearSplash").css({"visibility": "visible"});
});

function closeTag(t) {
    t.removeClass( "active" );

    if (t.hasClass( "tag3" )) {
        t.removeClass( "tag3" );
        t.addClass( "tag2" );
    }
    Orrery.stateManager.clickedLabel = "";
    Orrery.paths[Orrery.stateManager.clickedPlanet.path].material = Orrery.pathMaterials[Math.min(Orrery.stateManager.clickedPlanet.type, 3)];
    if (Orrery.stateManager.following) {
        zoomOut(Orrery.stateManager.lastClickedPlanet.exagRadius / 2000);
    }
    Orrery.stateManager.following = false;
    Orrery.controls.maxDistance = 100;
    const tweenMin = new TWEEN.Tween(Orrery.controls).to( {minDistance: 1}, 1000 ).easing(TWEEN.Easing.Quadratic.InOut).start();
    const tweenHome = new TWEEN.Tween(Orrery.controls.target).to( {x:0, y:0, z:0}, 1000 ).easing(TWEEN.Easing.Quadratic.InOut).start();
    $("#info").hide(300);
}