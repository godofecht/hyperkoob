# Hypercube shadows

An interactive page that casts n-cubes into 3D and 2D along their long diagonal, for any number of dimensions, including fractional ones.

Live: https://godofecht.github.io/hyperkoob/

## What it shows

**Fractional dimension.** An n-cube is an (n-1)-cube extruded along a new axis. At D = 3.4 the page draws a cube with a fourth axis 0.4 long. At D = 4 it is a full tesseract. Type any dimension into the big number; there is no upper limit.

**Diagonal shadows.** Looking down the long diagonal gives every axis the same share of the shadow. In 2D this is the Petrie projection, and an n-cube becomes a 2n-gon. In 3D the tesseract becomes a rhombic dodecahedron and the 6-cube a rhombic triacontahedron.

**Roundness.** Q = 4πA/P² in 2D and 36πV²/S³ in 3D, where 1 is a circle or a sphere. Every shadow of a cube is a zonotope, so area, volume and surface come straight from the projected axis vectors.

**Shadows that tile.** The n-cube's diagonal shadow, one dimension down, tiles that space: hexagons for the cube, rhombic dodecahedra for the tesseract. The page animates the projection in two moves, turning the diagonal onto the viewing axis and collapsing along it. For 5 dimensions and up the tile is the Voronoi cell of the A(n-1) lattice, and the page shows a 3D slice through that honeycomb.

**Shadows that never repeat.** Cut the cube grid in m dimensions with a flat slice and cast the faces near the slice onto it. With m = 5 and a slice tilted by the golden ratio, the result is the Penrose tiling (de Bruijn, 1981). A tilt slider swaps the golden ratio for the Fibonacci fractions 1/1, 2/1, 3/2, 5/3 and so on. Each gives a tiling that repeats, every 40, 105, 275, 720, 1885 or 4935 tiles. A second view shows where every corner lands in the hidden directions: on a few points when the tiling repeats, spread over four pentagons when it does not. The same cut in 3D from the 6D grid gives Ammann's two golden rhombohedra, the standard model of an icosahedral quasicrystal.

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
- `quasi.js`: cut-and-project tilings from the cube grid
- `quasi-view.js`: the drawing and controls for those tilings
- `tests/geometry.test.js`, `tests/quasi.test.js`: geometry checks

## Run it

Open `index.html` in a browser. The honeycomb slices run in a Web Worker, which needs the page served over HTTP:

```
python3 -m http.server
```

## Tests

```
node tests/geometry.test.js
node tests/quasi.test.js
```

The checks cover: every 3D frame is an orthogonal projection; known roundness values (square, hexagon, octagon, cube, rhombic dodecahedron, rhombic triacontahedron); continuity as the dimension slides; and sampled points lying in exactly one tile, for whole and fractional dimensions and for slices up to 12 dimensions. For the quasicrystal tilings: every point covered by exactly one tile in 2D and 3D, Penrose thick to thin near the golden ratio, whole numbers of tiles per repeat, and repeats mapping corners onto corners.

## Licence

MIT
