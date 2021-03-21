# orrery
An interactive map of the Solar System created with Three.js and jQuery.

This is currently live at http://alltheseworldsareyours.com

It's definitely better as a desktop web experience than mobile for now.

## Requirements
- three.js
- jQuery and jQuery UI
- Tween.js

## Features
- Ephemerides for most astronomical bodies in the Solar System, searachable for all above 1km in radius (currently moons of asteroids and dwarf planets are not include but coming soon)
- Exaggerated orrery view at the solar system scale, zoomable to true scale for planetary systems
- Live data readout for the body's physical and orbital characteristics, and RA/Dec and Alt/Az relative to Earth
- Links to articles and images from Wikipedia
- Background stars include all above 7th magnitude
- Celestial sphere graticule

## Potential Roadmap
- HTTPvars for LatLong and Time
- Hide MJD/LST by default
- Show distance, RADec in hover state from clicked body
- Asteroid moons
- UI scaling for mobile
- Object count throttling from FPS observation
- Correct RA/Dec and Alt/Az for Earth's barycentric rotation
- Non-periodic comets/hyperbolic orbits (`Omuamua, etc.)
- Extended data/add ins for smaller objects
- Planetarium view with sky shader
- Magnitude correction for airmass
- Asteroid categorization from orbital elements
- Asteroid 3D shapes
- Ring shadows
- Rise/transit/set solver
- Spacecraft/Two Line Element reader
- NASA SPICE kernels
- Better image compression (Basis)
- THREE.CSS2D renderer or Canvas for tags (if faster)
- Procedural textures
- Exoplanetary systems
- Lagrange points/Hill spheres for planets
- XR
- Hohmann transfer orbits/window solver
- Gravitational simulations
- Selectable stars/DSOs
- Compute shaders
