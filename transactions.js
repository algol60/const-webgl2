import * as twgl from './resources/4.x/twgl-full.module.js';

const lineVertices = [
  // 0,1,0, 1,1,0, 0,0,0, 1,1,0, 0,0,0, 1,0,0
  -0.5,0.5,0, 0.5,0.5,0, -0.5,-0.5,0, 0.5,0.5,0, -0.5,-0.5,0, 0.5,-0.5,0
];

const vs = `#version 300 es
uniform mat4 u_worldViewProjection;
uniform mat4 u_view;
uniform mat4 u_model;

in vec3 quad;
in vec3 a_position;

void main() {
  vec4 offsetPosition = vec4(quad + a_position, 1.0);
  vec4 position = u_model * offsetPosition;
  gl_Position = u_worldViewProjection * position;
}
`;

const fs = `#version 300 es
precision highp float;

out vec4 outColor;

void main() {
  outColor = vec4(1.0, 0.0, 0.0, 1.0);
}
`;

class Transactions {
  constructor(n) {
    this.n = n;
  }

  /**
   *
   * @param {*} gl
   * @param {*} nodes
   * @param {*} lineIxs Indexes into nodes of pairs of line ends
   */
  build(gl, nodes, lineIxs) {
    const lineEnds = [];
    const color = [];
    this.nInstances = lineIxs.length;
    for(let ix=0; ix<lineIxs.length; ix+=2) {
      const ni = nodes[ix];
      const nj = nodes[ix+1];
      lineEnds.push(
        ni.x-0.5, ni.y-0.5, ni.z,
        ni.x+0.5, ni.y-0.5, ni.z,
        nj.x-0.5, nj.y-0.5, nj.z,

        ni.x+0.5, ni.y-0.5, ni.z,
        nj.x-0.5, nj.y-0.5, nj.z,
        nj.x+0.5, nj.y+0.5, nj.z
      );
      const red = Math.random();
      const gre = Math.random();
      const blu = Math.random();
      color.push(red, gre, blu);
    }

    const arrays = {
      lineEnds: {numComponents:3, data:lineEnds},
      color: {numComponents:3, data:color, divisor:6}
    };

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
    console.log(bufferInfo);

    this.program = twgl.createProgramFromSources(gl, [vs, fs]);
    this.uniformSetters = twgl.createUniformSetters(gl, this.program);
    this.attribSetters = twgl.createAttributeSetters(gl, this.program);

    this.vao = twgl.createVAOFromBufferInfo(
      gl, this.attribSetters, bufferInfo);
  }

  draw(gl, viewMatrix, modelMatrix, worldViewProjectionMatrix) {
    const shaderUniforms = {
      u_worldViewProjection: worldViewProjectionMatrix,
      u_view:           viewMatrix,
      u_model: modelMatrix
    };

    gl.useProgram(this.program);

    // Setup all the needed attributes.
    gl.bindVertexArray(this.vao);

    // Set the uniforms that are the same for all objects.
    twgl.setUniforms(this.uniformSetters, shaderUniforms);

    // gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.numElements);
    twgl.drawBufferInfo(gl, this.vao, gl.TRIANGLES, this.vao.numElements, 0, this.numInstances);
  }
}

export {Transactions};
