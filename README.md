# Hypercube shadows

An interactive page that casts n-cubes into 3D and 2D along their long diagonal, for any number of dimensions, including fractional ones.

Live: https://godofecht.github.io/hyperkoob/

## What it shows

**Fractional dimension.** An n-cube is an (n-1)-cube extruded along a new axis. At D = 3.4 the page draws a cube with a fourth axis 0.4 long. At D = 4 it is a full tesseract. Type any dimension into the big number; there is no upper limit.

**Diagonal shadows.** Looking down the long diagonal gives every axis the same share of the shadow. In 2D this is the Petrie projection, and an n-cube becomes a 2n-gon. In 3D the tesseract becomes a rhombic dodecahedron and the 6-cube a rhombic triacontahedron.

**Roundness.** Q = 4πA/P² in 2D and 36πV²/S³ in 3D, where 1 is a circle or a sphere. Every shadow of a cube is a zonotope, so area, volume and surface come straight from the projected axis vectors.

**Shadows that tile.** The n-cube's diagonal shadow, one dimension down, tiles that space: hexagons for the cube, rhombic dodecahedra for the tesseract. The page animates the projection in two moves, turning the diagonal onto the viewing axis and collapsing along it. For 5 dimensions and up the tile is the Voronoi cell of the A(n-1) lattice, and the page shows a 3D slice through that honeycomb.

## How large dimensions are drawn

| Axes | 3D and 2D views |
| --- | --- |
| up to 11 | every edge |
| up to about 17 | every corner |
| up to 2048 | a fixed random sample of real corners |
| above 2048 | points from the normal distribution a random corner tends to |

The 2D view always draws the exact outline. Roundness is exact up to 120 axes in 3D and 4000 in 2D, and estimated from a fixed sample above that.

## Files

- `index.html`: the page
- `hyper.js`: projections, frames and zonotope measures
- `tile.js`: the tiling animation and honeycomb slices
- `tests/geometry.test.js`: geometry checks

## Run it

Open `index.html` in a browser. The honeycomb slices run in a Web Worker, which needs the page served over HTTP:

```
python3 -m http.server
```

## Tests

```
node tests/geometry.test.js
```

The checks cover: every 3D frame is an orthogonal projection; known roundness values (square, hexagon, octagon, cube, rhombic dodecahedron, rhombic triacontahedron); continuity as the dimension slides; and sampled points lying in exactly one tile, for whole and fractional dimensions and for slices up to 12 dimensions.

## Licence

MIT
