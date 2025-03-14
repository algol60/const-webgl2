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

// These bits indicate if an arrow head is drawn at either end.
//
const ARROW_HEAD_SRC = 1;
const ARROW_HEAD_DST = 2;

// Two bits of line styles (shifted by two to avoid arrowhead indicators).
//
const LINE_STYLE_SOLID   = 0 << 2;  // Solid.
const LINE_STYLE_DOTTED  = 1 << 2;  // Evenly spaced on/off.
const LINE_STYLE_DASHED  = 2 << 2;  // Long on, short off.
const LINE_STYLE_DIAMOND = 3 << 2;  // Diamonds.

/**
 * Generate the coordinates of a sphere.
 * Put four nodes in a square in the middle.
 *
 * Note that this is not describing a graph as such,
 * but is describing what needs to be drawn (although the two look very similar).
 * For example:
 * - nodes are given an indexes into the texture, not node names;
 * - this structure describes whether or not to draw arrowheads
 *   on either or both ends of a line, not that a transaction is directed or not.
 */
function sphereBuilder(n, rand) {
  const FG_ICONS = ['dalek', 'hal-9000', 'mr_squiggle', 'tardis'];
  const BG_ICONS = ['round_circle', 'flat_square', 'flat_circle', 'round_square', 'transparent'];
  const dectl = textureIndex('true');
  const dectr = textureIndex('false');
  const decbl = textureIndex('ukraine');
  const decbr = textureIndex('china');

  // An additional 4 in the centre and 6 at the outer corners.
  //
  n = Math.max(6+4, n) - (6+4);

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
    x:2, y:2, z:0, r:2,
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

  // Make the radius dependent on the number of vertices, with a lower limit.
  //
  const sphereRadius = 8 + Math.sqrt(n);

  if (n>0) {
    // ...and the sphere nodes...
    //
    const rnd = 1.0; // Use Math.random() * n to add some randomness.
    const offset = 2.0 / n;
    const increment = Math.PI * (3.0 - Math.sqrt(5));
    const nodeRadius = (ix) => 1;//(ix>3 && (ix%2==0)) ? 2 : 1;

    for (let position=0; position<n; position++) {
      const y = rand ? Math.random()-0.5 : ((position * offset) - 1) + (offset / 2);
      const r = Math.sqrt(1.0 - Math.pow(y, 2.0));
      const phi = ((position + rnd) % n) * increment;
      const x = rand ? Math.random()-0.5 : Math.cos(phi) * r;
      const z = rand ? Math.random()-0.5 : Math.sin(phi) * r;

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

  const doLine = (i) => n<1010 || i%32==0;

  const connect = (iconIx, colorFun) => {
    let prevIx = -1;
    const len = vxs.filter(vx => vx.fg_tex==iconIx).length - 1;
    let i = 0;
    for (const [nodeIx, node] of vxs.entries()) {
      if (node.fg_tex==iconIx) {
        if (doLine(i) && prevIx!=-1) {
          const c = colorFun(i, len);
          txs.push({
            vx0: prevIx, vx1: nodeIx,
            red: c.red, gre: c.gre, blu: c.blu,
            misc:1
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

  // ... and some specific nodes and transactions.
  //
  const V = vxs.length;
  const baseTex = textureIndex('australia')-1;
  for (const [x,y,z,tex] of [
    [-sphereRadius,  sphereRadius,  sphereRadius, 0],
    [ sphereRadius,  sphereRadius,  sphereRadius, 1],
    [ sphereRadius, -sphereRadius,  sphereRadius, 2],
    [-sphereRadius, -sphereRadius, -sphereRadius, 3],
    [-sphereRadius,  sphereRadius, -sphereRadius, 4],
    [ sphereRadius,  sphereRadius, -sphereRadius, 5],
  ]) {
    vxs.push({
      x:x, y:y, z:z, r:1, // In Constellation, these are r:3.
      red:Math.random(), gre:Math.random(), blu:Math.random(),
      fg_tex:baseTex+tex, bg_tex:textureIndex('round_circle')
    });
  }

  // TODO Make these transactions match Constellation to test transaction merging.
  //
  txs.push({
    vx0:V+0, vx1:V+1,
    red:1, gre:0, blu:0,
    w:8,
    misc:ARROW_HEAD_SRC | LINE_STYLE_DASHED
  });
  txs.push({
    vx0:V+1, vx1:V+2,
    red:0, gre:1, blu:0,
    w:8,
    misc:ARROW_HEAD_DST
  });
  txs.push({
    vx0:V+3, vx1:V+4,
    red:0, gre:0, blu:1,
    w:8,
    misc:ARROW_HEAD_DST
  });
  txs.push({
    vx0:V+4, vx1:V+5,
    red:1, gre:1, blu:0,
    w:8,
    misc:ARROW_HEAD_SRC | ARROW_HEAD_DST | LINE_STYLE_DIAMOND
  });
  txs.push({
    vx0:V+1, vx1:V+5,
    red:1, gre:1, blu:1,
    w:16,
    misc:ARROW_HEAD_SRC
  });

  // Multiple lines between two nodes.
  //
  const widths = Array(9).fill(1);
  widths[0] = 2;
  const lo = lineOffsets(widths);
  const styles = [LINE_STYLE_SOLID, LINE_STYLE_DOTTED, LINE_STYLE_DASHED, LINE_STYLE_DIAMOND];
  let style = 0;
  for (const [i, w] of widths.entries()) {
    const offset = lo.next().value;
    txs.push({
      vx0:V+3, vx1:V+5,
      red:0.5, gre:0.5, blu:0.5,
      w:w, offset:offset,
      misc:(w==1 ? ARROW_HEAD_DST : ARROW_HEAD_SRC) | styles[style]
    });

    if (i%2==0) {
      style = (style+1)%4;
    }
  }

  txs.push({
    vx0:V+0, vx1:V+4,
    red:1, gre:1, blu:1,
    w:32,
    misc:ARROW_HEAD_DST
  })

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
const names = ['dalek', 'hal-9000', 'mr_squiggle', 'tardis', 'australia', 'canada', 'new_zealand', 'united_kingdom', 'united_states_of_america', 'china', 'russia', 'ukraine', 'check', 'true', 'false',
'flat_circle', 'flat_square', 'round_circle', 'round_square', 'transparent'];

function textureIndex(name) {
  return names.indexOf(name);
}

/**
 * Use this function to generate offsets for multiple lines between two nodes.
 * We need to know the widths of the lines to produce the correct offsets,
 * because line widths affect subsequent offsets.
 *
 * Offsets start at 0 and alternate wider on either side.
 */
function* lineOffsets(widths) {
  let leftOffset = 0;
  let rightOffset = 0;
  let offset = 0;
  for (const width of widths) {
    if (leftOffset == 0) {
        offset = 0;
        leftOffset += width / 2;
        rightOffset = leftOffset;
    } else if (leftOffset < rightOffset) {
        offset = -(leftOffset + width / 2 + 1);
        leftOffset += width + 1;
    } else {
        offset = rightOffset + width / 2 + 1;
        rightOffset += width + 1;
    }
    yield offset;
  }
}

export {CAMERA_NEAR, CAMERA_FAR, FIELD_OF_VIEW, cameraDistance, convertZoomPointToDirection, degToRad, coordsRadius, lineOffsets, sphereBuilder, textureIndex};
