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
function sphereBuilder(n) {
  const FG_ICONS = ['dalek', 'hal-9000', 'mr_squiggle', 'tardis'];
  const BG_ICONS = ['round_circle', 'flat_square', 'flat_circle', 'round_square', 'transparent'];
  // const DEC_ICONS = ['true', 'false', 'australia', 'china', 'russia', 'ukraine']
  const dectl = textureIndex('true');
  const dectr = textureIndex('false');
  const decbl = textureIndex('ukraine');
  const decbr = textureIndex('china');

  n = Math.max(4, n) - 4;
  // console.log(`Sphere nodes: ${n}`);

  const vxs = [];

  // Four nodes in the middle...
  //
  vxs.push({
    x:-1, y:1, z:0.0, r:1,
    red:1, gre:0, blu:0,
    fg_tex:textureIndex('dalek'), bg_tex:textureIndex('round_circle'),
    tl:dectl
  });
  vxs.push({
    x:1, y:1, z:0.0, r:1,
    red:0, gre:1, blue:0,
    fg_tex:textureIndex('hal-9000'), bg_tex:textureIndex('flat_square'),
    tr:dectr
  });
  vxs.push({
    x:-1, y:-1, z:0.0, r:1,
    red:0, gre:0, blu:0,
    fg_tex:textureIndex('mr_squiggle'), bg_tex:textureIndex('flat_circle'),
    bl:decbl
  });
  vxs.push({
    x:1, y:-1, z:0.0, r:1,
    red:1, gre:1, blu:0,
    fg_tex:textureIndex('tardis'), bg_tex:textureIndex('round_square'),
    br:decbr
  });

  if (n>0) {
    // ...and the sphere.
    //
    const rnd = 1.0; // Use Math.random() * n to add some randomness.
    const offset = 2.0 / n;
    const increment = Math.PI * (3.0 - Math.sqrt(5));
    const nodeRadius = (ix) => 1;//(ix>3 && (ix%2==0)) ? 2 : 1;

    // Make the radius dependent on the number of vertices, with a lower limit.
    //
    const sphereRadius = 8 + Math.sqrt(n);

    for (let position=0; position<n; position++) {
      const y = ((position * offset) - 1) + (offset / 2);
      const r = Math.sqrt(1.0 - Math.pow(y, 2.0));
      const phi = ((position + rnd) % n) * increment;
      const x = Math.cos(phi) * r;
      const z = Math.sin(phi) * r;

      const red = Math.random();
      const gre = Math.random();
      const blu = Math.random();

      // Node foreground icons.
      //
      const fg_name = FG_ICONS[position%FG_ICONS.length];
      const fg_tex = textureIndex(fg_name);

      // Node background icons.
      //
      const bg_name = BG_ICONS[position%BG_ICONS.length];
      const bg_tex = textureIndex(bg_name);

      const corner = position%5;

      vxs.push({
        x:x*sphereRadius, y:y*sphereRadius, z:z*sphereRadius, r:nodeRadius(position),
        red:red, gre:gre, blu:blu,
        fg_tex:fg_tex, bg_tex:bg_tex,
        tl:corner>=1 ? dectl : 65535,
        tr:corner>=2 ? dectr : 65535,
        bl:corner>=3 ? decbl : 65535,
        br:corner>=4 ? decbr : 65535
      });
    }
  }

  const txs = [];
  // Connect random nodes.
  //
  // for (let i=4; i<nNodes-1; i+=Math.floor(nNodes/1000)+1) {
  //   const vx0 = Math.floor(Math.random()*nNodes);
  //   const vx1 = Math.floor(Math.random()*nNodes);
  //   lineIxs.push(vx0, vx1);
  // }

  const connect = (iconIx, colorFun) => {
    let prevIx = -1;
    const len = vxs.filter(vx => vx.fg_tex==iconIx).length - 1;
    let i = 0;
    for (const [nodeIx, node] of vxs.entries()) {
      if (node.fg_tex==iconIx) {
        if (prevIx!=-1) {
          const c = colorFun(i, len);
          txs.push({
            vx0: prevIx,
            vx1: nodeIx,
            red: c.red,
            gre: c.gre,
            blu: c.blu
          });
        }
        i++;
        prevIx = nodeIx;
      }
    }
  };
  // Connect nodes with the same icon.
  //
  const iconIx = textureIndex('dalek');
  connect(textureIndex('dalek'), (i, n) => ({red:1-i/n, gre:1-i/n, blu:i/n}));
  connect(textureIndex('hal-9000'), (i,n) =>({red:1, gre:i/n, blu:i/n}));

  console.log(`nTx: ${txs.length}`);

  return {vxs:vxs, txs:txs};
}

// /**
//  * Find the radius of a scene represented by an array of x,y,z coordinates.
//  * In other words, find the largest absolute value in the array.
//  *
//  * @param {*} coords An array of x,y,z coordinates.
//  */
// function coordsRadius(coords) {
// //   const sceneRadius = Math.max(Math.abs(Math.max(...pos)), Math.abs(Math.min(...pos)));
//   if (coords.length==0) {
//     return 0;
//   }

//   let m = coords[0];
//   for (const c of coords) {
//     m = Math.max(m, Math.abs(c));
//   }

//   return m;
// }

/**
 * Find the radius of a scene represented by an array of objects with x,y,z coordinates.
 * In other words, find the largest absolute value of the coordinates.
 *
 * @param {*} coords An array of x,y,z coordinates.
 */
 function coordsRadius(nodes) {
  if (nodes.length==0) {
    return 0;
  }

  let m = 0;
  for (const node of nodes) {
    // m = Math.max(m, Math.abs(node.x), Math.abs(node.y), Math.abs(node.z));
    m = Math.max(m, node.x*node.x + node.y*node.y + node.z*node.z)
  }

  return Math.sqrt(m);
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

// These names must match the list of names in make_atlas.py.
//
const names = ['dalek', 'hal-9000', 'mr_squiggle', 'tardis', 'australia', 'china', 'russia', 'ukraine', 'check', 'true', 'false',
'flat_circle', 'flat_square', 'round_circle', 'round_square', 'transparent'];

function textureIndex(name) {
  return names.indexOf(name);
}

export {CAMERA_NEAR, CAMERA_FAR, FIELD_OF_VIEW, cameraDistance, convertZoomPointToDirection, degToRad, coordsRadius, sphereBuilder, textureIndex};
