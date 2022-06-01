import * as grut from './resources/graph-util.js';
import * as twgl from './resources/4.x/twgl-full.module.js';
import * as transactions from './transactions.js';
import * as nodes from './nodes.js';

function main() {

  const spin = false;

  // How many nodes to draw?
  //
  const nNodes = 100;
  console.log(`nNodes: ${nNodes}`);

  const graph = grut.sphereBuilder(nNodes);

  const sceneRadius = grut.coordsRadius(graph.vxs);
  console.log(`Scene radius: ${sceneRadius}`);

  // Get A WebGL2 context.
  //
  const canvas = document.querySelector("#canvas");

  // No alpha in the backbuffer: see https://webglfundamentals.org/webgl/lessons/webgl-and-alpha.html.
  //
  const gl = canvas.getContext('webgl2', { alpha: false });
  if (!gl) {
    throw 'WebGL2 not available';
  }

  // Load the texture; do a redraw when the load is complete.
  //
  const atlas = textureUtils.loadTexture(gl, 'icons/_atlas.png', () => requestAnimationFrame(drawScene));

  // Set up to compute the camera's matrix using lookAt.
  //
  const camDist = grut.cameraDistance(gl.canvas, sceneRadius);
  console.log(`Camera distance: ${camDist}`);

  const camera = {
    eye: [0, 0, camDist],
    target: [0, 0, 0],
    up: [0, 1, 0]
  }

  const scene = {
    isDrawing: false,
    xMouse: 0.0,
    yMouse: 0.0,
    xRot: 0.0,
    yRot: 0.0,

    drag: false,
    oldx:0,
    oldy:0,
    dx:0, dy:0,
    theta:0,
    phi:0
  };

  // let cameraMatrix;

  const matrices = {};

  /**
   * Compute the various matrices.
   * @param {*} copyViewMatrix
   */
  function updateMatrices(time_d) {
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

    let modelMatrix = twgl.m4.identity();

    modelMatrix = twgl.m4.rotateY(modelMatrix, scene.dx);
    modelMatrix = twgl.m4.rotateX(modelMatrix, scene.dy);

    if (spin) {
      camera.eye[0] = Math.sin(time_d) * camDist;
      camera.eye[2] = Math.cos(time_d) * camDist;
    }
    const cameraMatrix = m4.lookAt(camera.eye, camera.target, camera.up)
    // Make a view matrix from the camera matrix.
    const viewMatrix = m4.inverse(cameraMatrix);

    const projectionMatrix = twgl.m4.perspective(grut.FIELD_OF_VIEW, aspect, grut.CAMERA_NEAR, grut.CAMERA_FAR);

    matrices.model = modelMatrix;
    matrices.view = viewMatrix;
    matrices.projection = projectionMatrix;
  }

  // Nodes.
  //
  const vxs = new nodes.Nodes();
  vxs.build(gl, graph);

  // Transactions.
  //
  const txs = new transactions.Transactions();
  txs.build(gl, graph);

  // Draw the scene.
  function drawScene(time) {
    console.log(`draw at time ${time}`)
    const time_d = time * 0.001;

    twgl.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels.
    //
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // const pixelDensity = gl.canvas.clientHeight * 0.5 / Math.tan(grut.FIELD_OF_VIEW);
    // console.log(`pixelDensity=${pixelDensity}`);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.1, 0.1, 0.15, 1.0);
    // gl.clear(gl.COLOR_BUFFER_BIT);
    // gl.clearColor(0.0, 0.0, 0.0, 1.0);

    updateMatrices(time_d);

    vxs.render(time, gl, matrices, atlas);

    txs.render(time, gl, matrices);

    if (spin) {
      requestAnimationFrame(drawScene);
    }
  }

  canvas.addEventListener('mousedown', e => {
    // scene.xMouse = e.offsetX;
    // scene.yMouse = e.offsetY;
    // scene.isDrawing = true;
    // console.log(`x0=${scene.xMouse} y0=${scene.yMouse}`);

    scene.drag = true;
    scene.oldx = e.offsetX;
    scene.oldy = e.offsetY;
    // return false;
    e.preventDefault();
  });

  canvas.addEventListener('mouseup', e => {
    // scene.isDrawing = false;
    scene.drag = false;
    e.preventDefault();
  });

  canvas.addEventListener('mousemove', e => {
    // if (scene.isDrawing) {
    //   scene.xRot += (e.offsetX - scene.xMouse) / 500;
    //   scene.yRot += (e.offsetY - scene.yMouse) / 500;
    //   scene.xMouse = e.offsetX;
    //   scene.yMouse = e.offsetY;

    //   requestAnimationFrame(drawScene);
    // }

    if (scene.drag) {
      const dx = (e.offsetX-scene.oldx)*2*Math.PI/canvas.width;
      const dy = (e.offsetY-scene.oldy)*2*Math.PI/canvas.height;
      scene.dx += dx;
      scene.dy += dy;
      scene.oldx = e.offsetX;
      scene.oldy = e.offsetY;
      requestAnimationFrame(drawScene);
    }

    e.preventDefault();
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();

    // Copy Constellation's algorithm.
    //
    const zoomDirection = grut.convertZoomPointToDirection(gl.canvas.width, gl.canvas.height, e.clientX, e.clientY);

    const focusVector = m4.subtractVectors(camera.target, camera.eye);
    const len = m4.length(focusVector);
    // console.log(`length=${focusVector} ${len}`);

    // Invert the wheel direction and make the movement smaller.
    //
    const d = -Math.sign(e.deltaY) / (e.ctrlKey ? 512.0 : 32.0);

    const norm = m4.normalize(zoomDirection);
    norm[0] *= d;
    norm[1] *= d;
    norm[2] *= d;
    // console.log(`zd ${e.clientX},${e.clientY} -> ${zoomDirection} -> ${norm}`);

    const origin = [0.0, 0.0, 0.0];
    const direction = m4.subtractVectors(camera.eye, camera.target);
    const up = camera.up.slice();
    // console.log(`direction ${direction}`);

    // Move forward along the z axis.
    //
    origin[0] += direction[0] * norm[2];
    origin[1] += direction[1] * norm[2];
    origin[2] += direction[2] * norm[2];
    // console.log(`originz ${origin}`);

    // Move up along the y axis.
    // Why multiply by len here? Constellation does it for all three.
    //
    origin[0] += up[0] * norm[1] * len;
    origin[1] += up[1] * norm[1] * len;
    origin[2] += up[2] * norm[1] * len;
    // console.log(`originy ${origin}`);

    // Move right along the x axis.
    //
    const cross = m4.cross(up, direction);
    origin[0] += cross[0] * norm[0];
    origin[1] += cross[1] * norm[0];
    origin[2] += cross[2] * norm[0];
    // console.log(`originx ${origin}`);

    // console.log(`eye ${origin}`);
    camera.eye = m4.subtractVectors(camera.eye, origin);
    camera.target = m4.subtractVectors(camera.target, origin);

    requestAnimationFrame(drawScene);
  });

  requestAnimationFrame(drawScene);
}

main();
