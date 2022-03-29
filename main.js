import {CAMERA_FAR, CAMERA_NEAR, FIELD_OF_VIEW, degToRad, sphereBuilder, cameraDistance} from './resources/graph-util.js';

const vs = `#version 300 es
uniform mat4 u_worldViewProjection;
uniform mat4 u_viewInverse;

in vec4 a_position;
in vec2 a_corners;
in vec2 a_texcoord;

out vec2 v_texCoord;

void main() {
v_texCoord = a_texcoord;

vec4 position = a_position;
// position.xy += a_corners;

// billboarding
vec3 cameraRight = vec3(u_viewInverse[0].x, u_viewInverse[1].x, u_viewInverse[2].x);
vec3 cameraUp = vec3(u_viewInverse[0].y, u_viewInverse[1].y, u_viewInverse[2].y);
position.xyz += cameraRight * a_corners.x + cameraUp * a_corners.y;

gl_Position = (u_worldViewProjection * position);
}
`;

const fs = `#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform sampler2D u_diffuse;

out vec4 outColor;

void main() {
vec4 diffuseColor = texture(u_diffuse, v_texCoord);

if (diffuseColor.a<0.1) {
  discard;
}
outColor = diffuseColor;
}
`;

function main() {
  const rand = function (min, max) {
    if (max === undefined) {
      max = min;
      min = 0;
    }
    return min + Math.random() * (max - min);
  };

  const randInt = function (range) {
    return Math.floor(Math.random() * range);
  };

  const pos = []; // node centre positions
  const cor = []; // node corners
  const tex = []; // texture coordinates
  // const ind = [];

  // How many nodes to draw?
  //
  const nNodes = 100;
  console.log(`nNodes: ${nNodes}`);

  // How big are the nodes?
  //
  const ndiam = 1;//0;

  // How big is the volume we draw the nodes in?
  //
  const volDiam = ndiam/2 * Math.sqrt(nNodes);
  console.log(`Volume diameter: ${volDiam}`);
  // for (let i = 0; i < nNodes; i++) {
  let i = 0;
  for (const node of sphereBuilder(nNodes)) {
    // const x = rand(volDiam) - volDiam/2;
    // const y = rand(volDiam) - volDiam/2;
    // const z = rand(volDiam) - volDiam/2;
    // const x = i%8;
    // const y = Math.floor(i/8);
    // const z = 0;

    // pos.push(x, y, z,  x + 10, y, z,  x, y + 10, z,  x + 10, y + 10, z);
    // const c = i%3;
    // img.push(c,c,c,c);
    // // img.push(2,2,2,2);
    // tex.push(0, 0, 0, 1, 1, 0, 1, 1);
    // ind.push(0, 1, 2, 1, 2, 3);

    // pos.push(x, y, z,  x + ndiam, y, z,  x, y + ndiam, z,
    //                    x + ndiam, y, z,  x, y + ndiam, z,  x + ndiam, y + ndiam, z);


    // pos.push(x,y,z, x,y,z, x,y,z, x,y,z, x,y,z, x,y,z);
    const r = ndiam/2;
    for(let vx=0; vx<6; vx++) {
      pos.push(node.x, node.y, node.z);
    }
    cor.push(-r,-r, r,-r, -r,r,
                    r,-r, -r,r, r,r);

    // const c = i%3;
    // img.push(c, c, c, c, c, c);
    // img.push(2,2,2,2);

    // The texture atlas has 4 images arranged horizontally.
    //
    const texx0 = (i%4) / 4;
    const texx1 = texx0 + 0.25;
    // tex.push(1,1, 0,1, 1,0,
    //               0,1, 1,0, 0,0);
    tex.push(texx1,1, texx0,1, texx1,0,
                  texx0,1, texx1,0, texx0,0);
    // ind.push(0, 1, 2, 1, 2, 3);
    i++;
  }

  const sceneRadius = Math.max(Math.abs(Math.max(...pos)), Math.abs(Math.min(...pos)));
  console.log(`Scene radius: ${sceneRadius}`);

  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  const canvas = document.querySelector("#canvas");

  // No alpha in the backbuffer: see https://webglfundamentals.org/webgl/lessons/webgl-and-alpha.html.
  //
  const gl = canvas.getContext("webgl2", { alpha: false });
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
    texcoord: {numComponents:2, data:tex}
    // indices:  {numComponents:3, data:ind},
  }
  const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

  // setup GLSL program
  const program = twgl.createProgramFromSources(gl, [vs, fs]);
  const uniformSetters = twgl.createUniformSetters(gl, program);
  const attribSetters = twgl.createAttributeSetters(gl, program);

  const vao = twgl.createVAOFromBufferInfo(
    gl, attribSetters, bufferInfo);

  // function degToRad(d) {
  //   return d * Math.PI / 180;
  // }

  // const fieldOfViewRadians = degToRad(60);

  const atlas = textureUtils.loadTexture(gl, 'icons/_atlas.png');
  const uniformsThatAreTheSameForAllObjects = {
    u_worldViewProjection: m4.identity(),
    u_viewInverse:           m4.identity(),
    u_diffuse: atlas
  };

  // var uniformsThatAreComputedForEachObject = {
  //   u_worldViewProjection: m4.identity(),
  //   u_world: m4.identity(),
  //   u_worldInverseTranspose: m4.identity(),
  // };

  // const textures = [
  //   textureUtils.makeStripeTexture(gl, { color1: "#F00", color2: "#700", }),
  //   textureUtils.makeCheckerTexture(gl, { color1: "#070", color2: "#0F0", }),
  //   textureUtils.makeCircleTexture(gl, { color1: 'rgba(255,255,255,0.0)', color2: '#00F', }),
  //   // textureUtils.makeCircleTexture(gl, { color1: 'rgba(255,0,0,0)', color2: "#CCC", }),
  // ];

  // Set up to compute the camera's matrix using look at.
  //
  // const camDist = volDiam * 0.9;
  const camDist = cameraDistance(sceneRadius);
  console.log(`Camera distance: ${camDist}`);
  const cameraPosition = [0, 0, camDist];
  const target = [0, 0, 0];
  const up = [0, 1, 0];

  requestAnimationFrame(drawScene);

  // Draw the scene.
  function drawScene(time) {
    time = time * 0.001;

    twgl.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.enable(gl.DEPTH_TEST);

    // Compute the projection matrix
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projectionMatrix =
      m4.perspective(FIELD_OF_VIEW, aspect, CAMERA_NEAR, CAMERA_FAR);

    // // Compute the camera's matrix using look at.
    cameraPosition[0] = Math.sin(time) * camDist;
    cameraPosition[2] = Math.cos(time) * camDist;
    const cameraMatrix = m4.lookAt(cameraPosition, target, up)//, uniformsThatAreTheSameForAllObjects.u_viewInverse);

    // Make a view matrix from the camera matrix.
    const viewMatrix = m4.inverse(cameraMatrix, uniformsThatAreTheSameForAllObjects.u_viewInverse);

    const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
    const worldMatrix = m4.identity();
    m4.multiply(viewProjectionMatrix, worldMatrix, uniformsThatAreTheSameForAllObjects.u_worldViewProjection);

    gl.useProgram(program);

    // Setup all the needed attributes.
    gl.bindVertexArray(vao);

    // Set the uniforms that are the same for all objects.
    twgl.setUniforms(uniformSetters, uniformsThatAreTheSameForAllObjects);

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

    requestAnimationFrame(drawScene);
  }
}

main();
