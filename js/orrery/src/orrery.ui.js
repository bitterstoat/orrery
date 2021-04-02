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
    rate = rates[speed];
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
            if (clickedLabel != "") {
                closeTag(clickedLabel);
            }
        break;
        case 38 :
            zoomToggle();
        break;
        case 113:
            $("#inputBox").toggle(300);
        break;
        case 115:
            graticule.visible = !graticule.visible;
        break;
        case 119:
            extraData = !extraData;
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
    $("#distToActive").remove();
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
    const planetInfo = clickedPlanet.info;
    let moonInfo = ""
    if (clickedPlanet.moons > 0) {
        moonInfo = '<br><a id="moonZoom">Moons: ' + clickedPlanet.moons + ' (' + clickedPlanet.largestMoon;
        moonInfo +=  (clickedPlanet.moons > 1) ? ',&nbsp;&nbsp;' + clickedPlanet.secondMoon : '';
        moonInfo += (clickedPlanet.moons > 2) ? ', et al.)</a>' : ')</a>';
    }
    $("#planetInfo").html( planetInfo + moonInfo );
        $("#moonZoom").click( function() {
        zoomToggle();
    })
    const adjustedA = (clickedPlanet.semiMajorAxis < 0.1 ) ? (clickedPlanet.semiMajorAxis * AU).toFixed(1) + '&nbsp;km' : clickedPlanet.semiMajorAxis.toFixed(4) + '&nbsp;AU';
    $("#semiMajorAxis").html(adjustedA);
    const adjustedP = (clickedPlanet.period < 0.01 ) ? (clickedPlanet.period * daysPerCent).toFixed(3) + '&nbsp;days' : (clickedPlanet.period * 100).toFixed(3) + '&nbsp;years'
    $("#period").html(adjustedP);
    $("#eccentricity").html(clickedPlanet.eccentricity.toFixed(3));
    $("#inclination").html((clickedPlanet.inclination * toDeg).toFixed(2));
    $("#radius").html(parseFloat(clickedPlanet.radius).toFixed(1));
    $("#absMag").html(clickedPlanet.absoluteMag.toFixed(2));
    $("#info").show(300);
    if (t == earthID) { 
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

function zoomToggle() {
    const scaleRadius = clickedPlanet.exagRadius / 2000;
    following = (clickedLabel != "") ? !following : false;
    (following) ? zoomIn(scaleRadius) : zoomOut(scaleRadius);
}

$( "#autocomplete" ).autocomplete({
    minLength: 2,
    source: function( request, response ) {
          var matcher = new RegExp( $.ui.autocomplete.escapeRegex( request.term ), "i" );
          response( $.grep( contents, function( item ){
              return matcher.test( item );
          }));
      },
      select: function( e, ui ) {
        if (clickedLabel != "") {
            closeTag(clickedLabel);
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
    $("#playpause").attr('src', (speed==7) ? 'data/play.png' : 'data/pause.png');
});

$("#now").click( function() {
    setTime(unixToMJD(Date.now()));
});

$("#moonBox, #asteroidBox, #cometBox").click( function() {
    $("#autocomplete")[0].value = "";
    const addMoons = $("#moonBox")[0].checked;
    const addAsteroids = $("#asteroidBox")[0].checked;
    const addComets = $("#cometBox")[0].checked;
    contents = planetNames.concat( (addMoons) ? moonNames : null, (addAsteroids) ? asteroidNames : null, (addComets) ? cometNames : null );
});

$("#setCoords").click( function() {
    const lat = parseFloat($("#manualLat").val());
    const lon = parseFloat($("#manualLon").val());
    latitude = (Math.abs(lat) <=90) ? lat : 0;
    longitude = (Math.abs(lon) <=180) ? lon : 0;
    displayLatLong(latitude, longitude);
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
    showSplash = false;
});

$("#openSplash").click( function() {
    showSplash = true;
    $("#splashScreen").show(300);
    $("#clearSplash").css({"visibility": "visible"});
});

function closeTag(t) {
    t.removeClass( "active" );

    if (t.hasClass( "tag3" )) {
        t.removeClass( "tag3" );
        t.addClass( "tag2" );
    }
    clickedLabel = "";
    paths[clickedPlanet.path].material = pathMaterials[Math.min(clickedPlanet.type, 3)];
    if (following) {
        zoomOut(lastClickedPlanet.exagRadius / 2000);
    }
    following = false;
    controls.maxDistance = 100;
    const tweenMin = new TWEEN.Tween(controls).to( {minDistance: 1}, 1000 ).easing(TWEEN.Easing.Quadratic.InOut).start();
    const tweenHome = new TWEEN.Tween(controls.target).to( {x:0, y:0, z:0}, 1000 ).easing(TWEEN.Easing.Quadratic.InOut).start();
    $("#info").hide(300);
}