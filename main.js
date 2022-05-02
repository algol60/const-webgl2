import * as grut from './resources/graph-util.js';
import * as shaders from './resources/shaders.js';
import * as twgl from './resources/4.x/twgl-full.module.js';

function main() {
  const pos = []; // node centre positions
  const cor = []; // node corners
  const fgTex = []; // Foreground icon texture coordinates
  // const bgTex = []; // Background icon texture coordinates
  const color = []; // node color
  // const ind = [];

  const spin = false;

  // How many nodes to draw?
  //
  const nNodes = 1000;
  console.log(`nNodes: ${nNodes}`);

  const FG_ICONS = ['dalek', 'hal-9000', 'mr_squiggle', 'tardis'];
  const BG_ICONS = ['round_circle', 'flat_square', 'flat_circle', 'round_square', 'transparent'];
  const DEC_ICONS = ['true', 'false', 'australia', 'china', 'russia', 'ukraine']

  const iconsIndex = new Uint16Array(nNodes*6 * 2); // foreground + background icons
  const decorIndex = new Uint16Array(nNodes*6 * 4); // Four decorators per node.

  const nodeRadius = (ix) => (nodeIx>3 && (nodeIx%19==0)) ? 1.5 : 0.5;

  let nodeIx = 0;
  for (const node of grut.sphereBuilder(nNodes)) {
    // ind.push(0, 1, 2, 1, 2, 3);

    const red = Math.random();
    const gre = Math.random();
    const blu = Math.random();

    // Node radii: make an occasional node bigger.
    //
    const r = nodeRadius(nodeIx);
    cor.push(-r,-r, r,-r, -r,r,
                    r,-r, -r,r, r,r);

    // The texture atlas contains 8x8 images, each image is 256x256.
    // Same as Constellation, except it uses a 2D texture.
    // Calculate leftx, topy, rightx, bottomy for texcoords.
    //
    const TEXTURE_SIZE = 0.125;
    const HALF_PIXEL = (0.5 / (256 * 8));

    const push_tex_coords = (buf, img_ix) => {
    //   const tex_lx = img_ix%8 / 8;
    //   const tex_ty = Math.trunc(img_ix/8) / 8;
    //   const tex_rx = tex_lx + TEXTURE_SIZE;
    //   const tex_by = tex_ty + TEXTURE_SIZE;
    //   buf.push(tex_rx,tex_by, tex_lx,tex_by, tex_rx,tex_ty,
    //                           tex_lx,tex_by, tex_rx,tex_ty, tex_lx, tex_ty);
      buf.push(0,1, 1,1, 0,0,
                    1,1, 0,0, 1,0);
    };

    // Node foreground icons.
    //
    const fg_name = FG_ICONS[nodeIx%FG_ICONS.length];
    const fgTexIndex = grut.textureIndex(fg_name);
    push_tex_coords(fgTex, fgTexIndex);

    // Node background icons.
    //
    const bg_name = BG_ICONS[nodeIx%BG_ICONS.length];
    const bgTexIndex = grut.textureIndex(bg_name);
    // push_tex_coords(bgTex, bgTexIndex);

    // Decorator icons.
    //
    const decor_name = DEC_ICONS[nodeIx%DEC_ICONS.length];
    const dectl = grut.textureIndex('true');
    const dectr = grut.textureIndex('false');
    const decbl = grut.textureIndex('ukraine');
    const decbr = grut.textureIndex('russia');

    // Push a central vertex for each triangle.
    // The vertex shader will set the position for each corner.
    //
    for (let vx=0; vx<6; vx++) {
      pos.push(node.x, node.y, node.z);
      color.push(red, gre, blu);
      iconsIndex[nodeIx*6*2+vx*2+0] = fgTexIndex;
      iconsIndex[nodeIx*6*2+vx*2+1] = bgTexIndex;

      const corner = nodeIx%4;
      decorIndex[nodeIx*6*4+vx*4+0] = corner>=0 ? dectl : 65535;
      decorIndex[nodeIx*6*4+vx*4+1] = corner>=1 ? dectr : 65535;
      decorIndex[nodeIx*6*4+vx*4+2] = corner>=2 ? decbl : 65535;
      decorIndex[nodeIx*6*4+vx*4+3] = corner>=3 ? decbr : 65535;
    }

    // ind.push(0, 1, 2, 1, 2, 3);
    nodeIx++;
  }

  const sceneRadius = grut.coordsRadius(pos);
  console.log(`Scene radius: ${sceneRadius}`);

  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  const canvas = document.querySelector("#canvas");

  // No alpha in the backbuffer: see https://webglfundamentals.org/webgl/lessons/webgl-and-alpha.html.
  //
  const gl = canvas.getContext('webgl2', { alpha: false });
  if (!gl) {
    throw 'WebGL2 not available';
  }

  // Tell the twgl to match position with a_position, n
  // normal with a_normal etc..
  twgl.setAttributePrefix("a_");

  // an indexed quad
  //   var arrays = {
  //      position: { numComponents: 3, data: [0, 0, 0, 10, 0, 0, 0, 10, 0, 10, 10, 0], },
  //      texcoord: { numComponents: 2, data: [0, 0, 0, 1, 1, 0, 1, 1],                 },
  //      indices:  { numComponents: 3, data: [0, 1, 2, 1, 2, 3],                       },
  //   };

  const arrays = {
    position: {numComponents:3, data:pos},
    corners:  {numComponents:2, data:cor},
    // image:    {numComponents:1, data:img},
    fgCoord:  {numComponents:2, data:fgTex},
    // bgCoord:  {numComponents:2, data:bgTex},
    color:    {numComponents:3, data:color},
    iconsIndex: {numComponents:2, data:iconsIndex},
    decorIndex: {numComponents:4, data:decorIndex}
    // indices:  {numComponents:3, data:ind},
  };
  const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
  console.log(bufferInfo);

  // setup GLSL program
  const program = twgl.createProgramFromSources(gl, [shaders.nodeVs, shaders.nodeFs]);
  const uniformSetters = twgl.createUniformSetters(gl, program);
  const attribSetters = twgl.createAttributeSetters(gl, program);

  const vao = twgl.createVAOFromBufferInfo(
    gl, attribSetters, bufferInfo);

  // Load the texture; do a redraw when the load is complete.
  //
  const atlas = textureUtils.loadTexture(gl, 'icons/_atlas.png', () => requestAnimationFrame(drawScene));

  const shaderUniforms = {
    u_worldViewProjection: m4.identity(),
    u_view:           m4.identity(),
    u_model: m4.identity(),
    u_diffuse: atlas
  };

  // var uniformsThatAreComputedForEachObject = {
  //   u_worldViewProjection: m4.identity(),
  //   u_world: m4.identity(),
  //   u_worldInverseTranspose: m4.identity(),
  // };

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
  };

  let cameraMatrix;
  let viewProjectionMatrix;
  function updateViewProjectionMatrix(copyViewMatrix) {
    // Compute the projection matrix
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

    let modelMatrix = m4.identity();
    modelMatrix = m4.xRotate(modelMatrix, scene.yRot);
    modelMatrix = m4.yRotate(modelMatrix, scene.xRot);
    shaderUniforms.u_model = modelMatrix;

    const projectionMatrix =
      m4.perspective(grut.FIELD_OF_VIEW, aspect, grut.CAMERA_NEAR, grut.CAMERA_FAR);
    // Make a view matrix from the camera matrix.
    let viewMatrix = m4.inverse(cameraMatrix, copyViewMatrix);
    viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
  }

  // Draw the scene.
  function drawScene(time) {
    console.log(`draw at time ${time}`)
    time = time * 0.001;

    twgl.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    // gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // // Compute the projection matrix
    // const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    // const projectionMatrix =
    //   m4.perspective(FIELD_OF_VIEW, aspect, CAMERA_NEAR, CAMERA_FAR);

    if (spin) {
      camera.eye[0] = Math.sin(time) * camDist;
      camera.eye[2] = Math.cos(time) * camDist;
    }

    cameraMatrix = m4.lookAt(camera.eye, camera.target, camera.up)

    // // Make a view matrix from the camera matrix.
    // const viewMatrix = m4.inverse(cameraMatrix);//, shaderUniforms.u_view);
    // shaderUniforms.u_view = viewMatrix;
    // const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
    updateViewProjectionMatrix(shaderUniforms.u_view);

    const worldMatrix = m4.identity();
    m4.multiply(viewProjectionMatrix, worldMatrix, shaderUniforms.u_worldViewProjection);

    gl.useProgram(program);

    // Setup all the needed attributes.
    gl.bindVertexArray(vao);

    // Set the uniforms that are the same for all objects.
    twgl.setUniforms(uniformSetters, shaderUniforms);

    // // Draw objects

    // Compute a position for this object based on the time.
    // var worldMatrix = m4.identity();
    // worldMatrix = m4.yRotate(worldMatrix, object.yRotation * time);
    // worldMatrix = m4.xRotate(worldMatrix, object.xRotation * time);
    // worldMatrix = m4.translate(worldMatrix, 0, 0, object.radius,
    //   uniformsThatAreComputedForEachObject.u_world);

    // // Multiply the matrices.
    // m4.multiply(viewProjectionMatrix, worldMatrix, uniformsThatAreComputedForEachObject.u_worldViewProjection);
    // m4.transpose(m4.inverse(worldMatrix), uniformsThatAreComputedForEachObject.u_worldInverseTranspose);

    // // Set the uniforms we just computed
    // twgl.setUniforms(uniformSetters, uniformsThatAreComputedForEachObject);

    // // Set the uniforms that are specific to the this object.
    // twgl.setUniforms(uniformSetters, object.materialUniforms);

    // Draw the geometry.
    // gl.drawElements(gl.TRIANGLES, bufferInfo.numElements, gl.UNSIGNED_SHORT, 0);
    gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.numElements);
    // console.log(bufferInfo.numElements);

    if (spin) {
      requestAnimationFrame(drawScene);
    }
  }

  canvas.addEventListener('mousedown', e => {
    e.preventDefault();
    scene.xMouse = e.offsetX;
    scene.yMouse = e.offsetY;
    scene.isDrawing = true;
    console.log(`x0=${scene.xMouse} y0=${scene.yMouse}`);
  });

  canvas.addEventListener('mouseup', e => {
    scene.isDrawing = false;
  });

  canvas.addEventListener('mousemove', e => {
    e.preventDefault();
    if (scene.isDrawing) {
      scene.xRot += (e.offsetX - scene.xMouse) / 500;
      scene.yRot += (e.offsetY - scene.yMouse) / 500;
      scene.xMouse = e.offsetX;
      scene.yMouse = e.offsetY;

      requestAnimationFrame(drawScene);
    }
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
