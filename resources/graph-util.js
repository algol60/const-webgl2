// Arbitrary graph stuff.
// Author: algol60
//

function degToRad(d) {
  return d * Math.PI / 180;
}

const CAMERA_NEAR = 1;
const CAMERA_FAR = 500000;
const FIELD_OF_VIEW = degToRad(60);
const MINIMUM_CAMERA_DISTANCE = 6;

/**
 * Generate the coordinates of a sphere.
 * Put four nodes in a square in the middle.
 */
function* sphereBuilder(n) {
  n = Math.max(4, n) - 4;
  console.log(`Sphere nodes: ${n}`);

  // Four nodes in the middle...
  //
  yield {x:-0.5, y:0.5, z:0.0};
  yield {x:0.5, y:0.5, z:0.0};
  yield {x:-0.5, y:-0.5, z:0.0};
  yield {x:0.5, y:-0.5, z:0.0};

  if (n>0) {
    // ...and the sphere.
    //
    const rnd = 1.0; // Use Math.random() * n to add some randomness.
    const offset = 2.0 / n;
    const increment = Math.PI * (3.0 - Math.sqrt(5));

    // Make the radius dependent on the number of vertices, with a lower limit.
    //
    const radius = 8 + Math.sqrt(n);

    for (let position=0; position<n; position++) {
      const y = ((position * offset) - 1) + (offset / 2);
      const r = Math.sqrt(1.0 - Math.pow(y, 2.0));
      const phi = ((position + rnd) % n) * increment;
      const x = Math.cos(phi) * r;
      const z = Math.sin(phi) * r;

      yield {x:x*radius, y:y*radius, z:z*radius};
    }
  }
}

/**
 * Find the radius of a scene represented by an array of x,y,z coordinates.
 * In other words, find the largest absolute value in the array.
 *
 * @param {*} coords An array of x,y,z coordinates.
 */
function coordsRadius(coords) {
//   const sceneRadius = Math.max(Math.abs(Math.max(...pos)), Math.abs(Math.min(...pos)));
  if (coords.length==0) {
    return 0;
  }

  let m = coords[0];
  for (const c of coords) {
    m = Math.max(m, Math.abs(c));
  }

  return m;
}

/**
 * Determine how far should the camera be from the centre of the scene so
 * all of the scene is visible.
 */
function cameraDistance(glCanvas, sceneRadius) {
  const aspect = glCanvas.clientWidth / glCanvas.clientHeight;

  // Find out how far the camera should be from the centre of the bounding sphere.
  let d = sceneRadius * (1.0 / Math.tan(FIELD_OF_VIEW / 2.0)) * aspect;

  // Don't place the camera nearer than the near edge of the frustum.
  d = Math.max(d, CAMERA_NEAR);

  // If we select a single node of radius 1, the camera distance is about 3.1.
  // This zooms the node to fill the screen, which is a bit in-your-face, and we can't see the labels
  // or get a feel for the surrounding area.
  // Instead, we'll pull back a bit. The distance chosen is one that feels right, rather than anything mathematical.
  d = Math.max(d, MINIMUM_CAMERA_DISTANCE);

  return d;
}

function convertZoomPointToDirection(canvasW, canvasH, clientX, clientY) {
  return [
    canvasW / 2.0 - clientX,
    clientY - canvasH / 2.0,
    canvasH / (2.0 * Math.tan(FIELD_OF_VIEW/2.0))
  ];
}

export {CAMERA_NEAR, CAMERA_FAR, FIELD_OF_VIEW, cameraDistance, convertZoomPointToDirection, degToRad, coordsRadius, sphereBuilder};
