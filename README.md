# orrery
An interactive map of the Solar System created with Three.js and jQuery.

This is currently live at http://alltheseworldsareyours.com

It's definitely better as a desktop web experience than mobile in the current version.

## Requirements
- [Three.js](https://github.com/mrdoob/three.js/)
- [jQuery](https://github.com/jquery/jquery) and [jQuery UI](https://github.com/jquery/jquery-ui)
- [Tween.js](https://github.com/tweenjs/tween.js/)

## Features
- Ephemerides for astronomical bodies in the Solar System, searachable for all above 1km in radius 
- Exaggerated orrery view at the solar system scale, zoomable to true scale for planetary systems
- Live data readout for the body's physical and orbital characteristics, RA/Dec and Alt/Az coordintes relative to current location, rise and set times, and magnitude adjusted for atmospheric dispersion
- Links to articles and images from Wikipedia
- Background stars include all above 7th magnitude
- Celestial sphere graticule
- HTTPvars for LatLong and Time

## Usage
- No node.js setup required. Just clone the repository, start a web server in the root folder and open the index.html in a browser.

## Potential Roadmap
- UI scaling for mobile
- Object count throttling from FPS observation
- Non-periodic comets/hyperbolic orbits (`Omuamua, etc.)
- Extended data/add ins for smaller objects
- Planetarium view with sky shader
- Asteroid categorization from orbital elements
- Asteroid 3D shapes
- Ring shadows
- Spacecraft/Two Line Element reader
- NASA SPICE kernels
- Better image compression (Basis)
- THREE.CSS2D renderer or Canvas for tags (if faster)
- Procedural textures
- Exoplanetary systems
- Lagrange points/Hill spheres for planets
- XR
- Hohmann transfer orbits, launch window solver, delta-v requirements
- Gravitational simulations
- Compute shaders
