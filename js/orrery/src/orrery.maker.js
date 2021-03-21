function makeBody (loader, texture, radius, name, sysId, ringRad, ringTexture, axisDec, axisRA, phase, thetaDot) { // make bodies
    const material = (texture != "default") ? new THREE.MeshStandardMaterial({ map: loader.load('data/' + texture) }) : defaultMaterial;
    const planetRadius = radius;
    const geometry = new THREE.IcosahedronGeometry( planetRadius, 5 );
    const sphere = new THREE.Mesh( geometry, material );
    sphere.name = name;
    sphere.sysId = sysId;

    const ringRadius = (ringRad) ? parseFloat(ringRad) : 0;
    if (ringRadius > 0) {  // make rings
        const geometry = new THREE.RingGeometry(planetRadius * 1.01, ringRadius * planetRadius, 64);
        const texMap = loader.load('data/' + ringTexture);
        const material = new THREE.MeshBasicMaterial({ map: texMap, side:THREE.DoubleSide, transparent: true, combine: THREE.AddOperation });
        const ring = new THREE.Mesh( geometry, material );
        ring.rotateX(Math.PI / 2);
        sphere.attach(ring); // parent ring to planet
    }

    // apply initial rotation
    reAxis(sphere, axisRA, axisDec);
    sphere.rotateOnAxis(new THREE.Vector3(0, -1, 0), thetaDot * ephTime + Math.PI * phase );
    return sphere;
}

function makePoint (name, sysId) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array([0,0,0]), 3 ) );
    const point = new THREE.Points( geometry, pointMaterial );
    point.name = name;
    point.sysId = sysId;
    return point;
}

function makeLabel(i) { // make body label
    $("body").append("<div id='" + i + "' class='label'>" + system[i].displayName + "</div>");
    $("#" + i).addClass( "tag" + system[i].type ).click( function() {
        $(".label").removeClass( "active" );
        if ( clickedLabel != "" && $(this)[0].id == clickedLabel[0].id ) {
            closeTag(clickedLabel);
        } else {
            clickTag($(this)[0].id);
        }
    })
}

function makeGratLabel(i, text) { // make graticule label
    $("body").append("<div id='grat" + i + "' class='gratLabel'>" + text + "</div>");
    return $("#grat" + i);
}

function makeGraticules() {
    const points = 360;
    const longDivisions = 12;
    const latDivisions = 12;
    let ringPoints = [];

    for (let i = 0; i <= points; i++) {
        let p = new THREE.Vector3(0, gratRadius, 0);
        p.applyAxisAngle(new THREE.Vector3(1, 0, 0), i * Math.PI * 2 / points);
        ringPoints.push(p);
    }
    const ringGeometry = new THREE.BufferGeometry().setFromPoints( ringPoints );

    let rings = [];
    for (let i = 0; i < longDivisions / 2; i++) {
        const tempRing = ringGeometry.clone();
        tempRing.rotateY( i * Math.PI * 2 / longDivisions );
        rings.push(tempRing);
    }
    ringGeometry.rotateZ(Math.PI / 2);
    for (let i = ( latDivisions / -2 ); i < ( latDivisions / 2 ); i++) {
        const tempRing = ringGeometry.clone();
        const x = Math.cos( i * Math.PI / latDivisions );
        const y = Math.sin( i * Math.PI / latDivisions ) * gratRadius;
        tempRing.scale(x, 1, x);
        tempRing.translate(0, -y, 0);
        rings.push(tempRing);
    }

    ringGeometry.rotateX(eclInclination);
    rings.push(ringGeometry);
    const longSphereGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(rings);
    const ringMaterial = new THREE.LineBasicMaterial({ color: 0x222211, linewidth: 1 });
    graticule = new THREE.LineLoop( longSphereGeometry, ringMaterial);
    graticule.name = "graticule";
    scene.add(graticule);
}

function makeRefPoints() {
    const longDivisions = 12;
    const latDivisions = 12;
    let refPoints = [0, gratRadius, 0];
    let labels = ["NP"];

    for (let i = 1; i < latDivisions; i++) {
        const latLabel = 90 - i * 15;
        for (let j = 0; j < longDivisions; j++) {
            x = Math.sin(j * Math.PI * 2 / longDivisions) * Math.sin(i * Math.PI / latDivisions) * gratRadius;
            y = Math.cos(i * Math.PI / latDivisions) * gratRadius;
            z = Math.cos(j * Math.PI * 2 / longDivisions) * Math.sin(i * Math.PI / latDivisions) * gratRadius;
            refPoints.push(x, y, z);
            labels.push(latLabel + "&deg;/" + ((j + 9) % 12) * 2 + "h")
        }
    }
    refPoints.push(0, -gratRadius, 0);
    labels.push("SP");

    for (let i = 0; i < refPoints.length / 3; i++) {
        const x = refPoints[3 * i];
        const y = refPoints[3 * i + 1];
        const z = refPoints[3 * i + 2];
        text = labels[i];
        gratLabels.push({label: makeGratLabel(i, text), x: x, y: y, z: z});
    }
}