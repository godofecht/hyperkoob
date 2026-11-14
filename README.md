# Hypercube shadows

An interactive page that casts n-cubes into 3D and 2D along their long diagonal, for any number of dimensions, including fractional ones.

Live: https://godofecht.github.io/hyperkoob/

## What it shows

**Fractional dimension.** An n-cube is an (n-1)-cube extruded along a new axis. At D = 3.4 the page draws a cube with a fourth axis 0.4 long. At D = 4 it is a full tesseract. Type any dimension into the big number; there is no upper limit.

**Diagonal shadows.** Looking down the long diagonal gives every axis the same share of the shadow. In 2D this is the Petrie projection, and an n-cube becomes a 2n-gon. In 3D the tesseract becomes a rhombic dodecahedron and the 6-cube a rhombic triacontahedron.

**Roundness.** Q = 4πA/P² in 2D and 36πV²/S³ in 3D, where 1 is a circle or a sphere. Every shadow of a cube is a zonotope, so area, volume and surface come straight from the projected axis vectors.

**Shadows that tile.** The n-cube's diagonal shadow, one dimension down, tiles that space: hexagons for the cube, rhombic dodecahedra for the tesseract. The page animates the projection in two moves, turning the diagonal onto the viewing axis and collapsing along it. For 5 dimensions and up the tile is the Voronoi cell of the A(n-1) lattice, and the page shows a 3D slice through that honeycomb.

**Shadows that never repeat.** Cut the cube grid in m dimensions with a flat slice of d dimensions and cast the faces near the slice onto it. Both d and m are free. A 1D slice of the 2D grid at the golden ratio gives the Fibonacci chain, drawn with the grid, the strip and the points dropping onto the line. A 2D slice of the 5D grid gives the Penrose tiling (de Bruijn, 1981). A 3D slice of the 6D grid gives Ammann's golden rhombohedra, the standard model of an icosahedral quasicrystal. From d = 4 up the tiling is shown as a 3D slice, which can sweep through the extra dimensions, or as its shadow cast into 3D or 2D with the page's own frames.

A tilt slider swaps the golden ratio for the Fibonacci fractions 1/1, 2/1, 3/2, 5/3 and so on. Each gives a tiling that repeats: in 2D every 40, 105, 275, 720, 1885 or 4935 tiles. A second view shows where every corner lands in the hidden directions: on a few points when the tiling repeats, spread evenly over the window when it does not. Above 3D the slice is free of grid points while d is below Euler's totient of m (2m for even m), so 4D from 5D repeats and 4D from 7D does not.

**What a fourth dimension could do to you.** Four demos, each plain geometry with a test behind it. Any of the six regular 4D solids, or a 4D ball, passes through a sealed box as a growing and shrinking solid, corner, edge or cell first and tilted as you like; and a key leaves the box by a short trip in w. A right hand turned half way round in the plane of x and w comes back as a left hand. A trefoil knot is pulled straight into a loop, its strands passing each other at different heights in w. A creature in a plane has its organs on show from above, and a finger from above touches its heart while its neighbour sees only a wall.

**Where intuition fails.** One dimension slider, from 1 to as high as you type, drives five panels: the share of a ball's volume in its outer 1% (99.996% at n = 1000); the angle between two random directions, which piles up at 90 degrees with a spread near 1/sqrt(n); the unit ball's volume, which peaks at n = 5.2569 and then falls towards zero; the sphere in the middle of a box of corner spheres, whose radius sqrt(n) - 1 passes the walls from n = 10; and distances between random points, which all become about the same.

**Diffraction.** The never repeating tab can show the light a tiling scatters, |sum exp(i k . x)|^2 over its corners. The Penrose tiling gives sharp spots with tenfold symmetry, the pattern no repeating crystal can make, which is what Shechtman saw.

**Knots, a maze and the Hopf fibration.** The fourth dimension tab also unknots any knot you pick (trefoil, figure-eight, cinquefoil or any (p, q) torus knot): it finds which crossings to switch with the Alexander polynomial, computed exactly from the knot diagram, moves each strand round the other through w, and lets the rope relax into a loop. Without w the same relaxation leaves the knot tied. You choose which three of x, y, z and w are on screen, how far to tilt toward the hidden one, and the plane of the diagram. A 4D maze shows one 3D slice at a time; you choose which axis is hidden. The Hopf fibration fills the 3-sphere with circles that, projected into 3D, all link each other once.

**Rotate in 4D.** The six regular 4D solids (5-cell, tesseract, 16-cell, 24-cell, 120-cell, 600-cell), the tesseract's net folding up into 4D, the Clifford torus and a Klein bottle that only stops cutting through itself in 4D. Each turns at its own speed in any of the six planes of 4D, and is seen in perspective, flat, or as a 3D slice. The page reports what the rotation leaves still: a plane for a turn in one plane, only the centre for a double rotation.

**E8.** The never repeating tab can cut from E8 instead of the cube grid: its 240 roots in the Coxeter plane, with 30-fold symmetry, and the Elser-Sloane 4D quasicrystal, flat, cast into 3D, or cut by a 3D slice.

**Fractal dimension.** The Cantor set, Koch curve, Sierpinski triangle and carpet, Vicsek fractal, Heighway dragon, Menger sponge, and a flake of your own copies and size. Each shows its dimension by the rule, k copies at 1/s means s^D = k, and measured by counting the boxes it touches as they shrink, with the log-log chart and a zoom that finds the same picture inside.

**Small pieces of intuition.** Cauchy's formula, run live: a convex solid's shadow, averaged over random directions, is a quarter of its surface. The parts of an n-cube, which cancel to 1 with alternating signs. How nearly all of a high-dimensional ball sits near any equator. And an arrow carried round a triangle on a sphere, which comes back turned by the triangle's area.

**Curved space.** Any {p, q} tiling, p-gons meeting q at each corner: on the sphere when 1/p + 1/q > 1/2 (the Platonic solids), flat when it equals 1/2, hyperbolic below. Hyperbolic tilings can be seen in the Poincare disk, the Klein disk, the half-plane or the band; the sphere stereographically or as a globe. Drag to travel, and the tiling rebuilds itself round you. A chart compares a circle's length in the three geometries.

**String theory.** A tab on the geometry behind string theory's hidden dimensions: a curled-up circle dimension, the energy ladder of waves round it, T-duality between radius R and 1/R, a Calabi-Yau cross-section with a choice of projection from 4D, and why the string needs 26 or 10 dimensions.

**Infinity.** A line that fills a square: the Hilbert and Peano curves at any order, with a window of time whose image covers exactly its share of the area and is about the square root of its length across; the Z-order beside them visits every cell but jumps. Cantor's zigzag numbers every fraction, and his diagonal builds a number missing from any list. The free group on two letters drawn in the hyperbolic plane, where moving one quarter by a covers three quarters, the step behind Banach-Tarski; the ping-pong caps show why the step must be longer than 1.763. And Gabriel's horn, whose volume never passes π while its surface grows without end.

The page has one tab per section, and the address names the tab: `#shadows`, `#tiling`, `#never`, `#4d`, `#high`, `#fractal`, `#curved`, `#strings`, `#infinity`.

## How large dimensions are drawn

| Axes | 3D and 2D views |
| --- | --- |
| up to 11 | every edge |
| up to about 17 | every corner |
| up to 2048 | a fixed random sample of real corners |
| above 2048 | points from the normal distribution a random corner tends to |

The 2D view always draws the exact outline. Roundness is exact up to 120 axes in 3D and 4000 in 2D, and estimated from a fixed sample above that.

## Files

- `index.html`: the page; `css/site.css`: its styles
- `js/ui.js`: canvas sizing, the colour theme and the one animation loop every view shares
- `js/hyper.js`, `js/shadows-view.js`: projections, frames and zonotope measures, and the Shadows tab
- `js/tile.js`: the tiling animation and honeycomb slices
- `js/quasi.js`, `js/quasi-view.js`: cut-and-project tilings from the cube grid
- `js/fourd.js`, `js/fourd-view.js`: the fourth dimension demos
- `js/knots.js`, `js/fourd-more.js`: knots, the maze and the Hopf fibration
- `js/solids4.js`, `js/solids4-view.js`: the regular 4D solids, 4D surfaces and rotations
- `js/highd.js`, `js/highd-view.js`: high-dimensional geometry
- `js/e8.js`, `js/e8-view.js`: E8 and the Elser-Sloane quasicrystal
- `js/fractal.js`, `js/fractal-view.js`: fractals and their dimension
- `js/curved.js`, `js/curved-view.js`: tilings of curved space
- `js/strings.js`, `js/strings-view.js`: string theory's geometry
- `js/intuition.js`, `js/intuition-view.js`: the average shadow, cube parts, the equator and the carried arrow
- `js/infinity.js`, `js/infinity-view.js`: space-filling curves, countable and uncountable sets, the free group and Gabriel's horn
- `js/tabs.js`: one section at a time
- `tests/*.test.js`: geometry checks; `tests/smoke.cjs`: every tab in a real browser

Each topic is a pure maths file that runs in Node and a `-view.js` file that draws it.

## Run it

Open `index.html` in a browser. The honeycomb slices run in a Web Worker, which needs the page served over HTTP:

```
python3 -m http.server
```

## Tests

```
npm test                                  # every unit suite
node tests/run.js http://localhost:8000/  # and every tab in a browser (needs Playwright)
```

The checks cover: every 3D frame is an orthogonal projection; known roundness values (square, hexagon, octagon, cube, rhombic dodecahedron, rhombic triacontahedron); continuity as the dimension slides; and sampled points lying in exactly one tile, for whole and fractional dimensions and for slices up to 12 dimensions. For the quasicrystal tilings: every point covered by exactly one tile in 1D, 2D and 3D and by exactly one cell in slices of 4D to 6D tilings, slice cell volumes matching the space they fill, Penrose thick to thin near the golden ratio, whole numbers of tiles per repeat, and repeats mapping corners onto corners. For the fourth dimension: the tesseract's slices are a tetrahedron, a truncated tetrahedron and an octahedron and their volumes add up to its 4-volume, the half turn mirrors the hand while keeping every length, and the knot's strands cross in 3D but stay apart in 4D. For high dimensions: the ball volumes and their peak, the densities, the angle spread against 600 pairs of real random vectors, and the Penrose diffraction's sharp peaks and tenfold symmetry. For knots: known Alexander polynomials, unknotting moves that collide in 3D but not in 4D, and relaxation that keeps every knot's type. For E8: 240 roots, a Coxeter element of order 30, 8 rings of 30, two 600-cells in the golden ratio, and the first shells of the lattice. For strings: T-duality, the critical dimensions, -1/12, and the Calabi-Yau equation. For 4D solids: corner and edge counts, Euler's formula and equal edges for all six regular solids, what each kind of rotation leaves still, the net closing into a tesseract without bending, and the Klein bottle meeting itself in 3D but not in 4D. For curved space: the five Platonic solids from {p, q}, q tiles at every corner at angle 360/q, Gauss-Bonnet areas, and hyperbolic moves composed as matrices. For fractals: box counts within 0.035 of the rule's dimension, and the dragon's slow approach to 2. For the rest: Cauchy's quarter within 1% for five solids, the cube parts' alternating sum, the equator shares, and the carried arrow's turn equal to the triangle's area. For infinity: Hilbert and Peano visit every cell once with unit steps and nest by quarters and ninths, the zigzag numbers each fraction once, the diagonal misses every row, a W(a⁻¹) equals everything not starting with a, the disk picture carries w to aw, the ping-pong caps hold their pieces above step 1.763 and fail at 1.2, and the horn's volume and surface.

## Licence

MIT
