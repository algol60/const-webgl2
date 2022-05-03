import * as twgl from './resources/4.x/twgl-full.module.js';

const lineVertices = [
  // 0,1,0, 1,1,0, 0,0,0, 1,1,0, 0,0,0, 1,0,0
  -0.5,0.5,0, 0.5,0.5,0, -0.5,-0.5,0, 0.5,0.5,0, -0.5,-0.5,0, 0.5,-0.5,0
];

const vs = `#version 300 es
// precision highp float;
uniform mat4 u_worldViewProjection;
uniform mat4 u_view;
uniform mat4 u_model;

in vec3 position;
in mat3 xyz;
in vec3 hue;

out vec3 f_color;

void main() {
  // vx is the
  vec3 vx = position * (gl_InstanceID%2==0?1.0:-1.0);
  vec4 mposition = u_model * vec4(xyz[gl_VertexID]+vx, 1);
  // vec4 mposition = u_model * vec4(position+xyz[gl_VertexID], 1);

  // // billboarding
  // vec3 cameraRight = vec3(u_view[0].x, u_view[1].x, u_view[2].x);
  // vec3 cameraUp = vec3(u_view[0].y, u_view[1].y, u_view[2].y);
  // mposition.xyz += cameraRight * corners.x + cameraUp * corners.y;



  gl_Position = u_worldViewProjection * mposition;
  f_color = hue;
  // f_color = gl_InstanceID%2==0 ? vec3(1,1,0) : vec3(0,0,1);
  // f_color = vec3(float(gl_InstanceID+1)/4.0, float(gl_InstanceID+1)/4.0, float(gl_InstanceID+1)/4.0);
}
`;

const fs = `#version 300 es
precision highp float;

in vec3 f_color;

out vec4 outColor;

void main() {
  // outColor = vec4(1.0, 0.0, 0.0, 1.0);
  outColor = vec4(f_color, 1.0);
}
`;

function err(msg) {
  console.log('ERRR', msg);
  alert(msg);
}

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
    // twgl.addExtensionsToContext(gl);
    if (!gl.drawArraysInstanced || !gl.createVertexArray) {
      alert("need drawArraysInstanced and createVertexArray"); // eslint-disable-line
      return;
    }

    const lineEnds = [];
    const color = [];
    this.nInstances = lineIxs.length;
    for(let ix=0; ix<this.nInstances; ix+=2) {
      const ni = nodes[lineIxs[ix]];
      const nj = nodes[lineIxs[ix+1]];
      lineEnds.push(
        ni.x-0.0, ni.y-0.0, ni.z,
        ni.x+0.0, ni.y-0.0, ni.z,
        nj.x-0.0, nj.y-0.0, nj.z,

        nj.x-0.0, nj.y-0.0, nj.z,
        nj.x+0.0, nj.y+0.0, nj.z,
        ni.x+0.0, ni.y-0.0, ni.z
      );
      const red = Math.random();
      const gre = Math.random();
      const blu = Math.random();
      color.push(red, gre, blu);
    }

    const pos = [
      -0.0, -0.5, 0,
      -0.0,  0.5, 0,
       0.0,  0.5, 0
    ]

    this.arrays = {
      position: {numComponents:3, data:pos},
      xyz: {numComponents:9, data:lineEnds, divisor:1},
      hue:    {numComponents:3, data:color, divisor:2}
    };
    console.log('tx arrays', this.arrays);

    this.program = twgl.createProgramFromSources(gl, [vs, fs]);
    this.programInfo = twgl.createProgramInfoFromProgram(gl, this.program);
    this.bufferInfo = twgl.createBufferInfoFromArrays(gl, this.arrays);

    this.vertexArrayInfo = twgl.createVertexArrayInfo(gl, this.programInfo, this.bufferInfo);
  }

  render(time, gl, viewMatrix, modelMatrix, worldViewProjectionMatrix) {
    console.log(`draw lines at time ${time}`)
    const uniforms = {
      u_view:                 viewMatrix,
      u_model:                modelMatrix,
      u_worldViewProjection:  worldViewProjectionMatrix
    };

    console.log('tx prog', this.programInfo);
    gl.useProgram(this.programInfo.program);
    twgl.setBuffersAndAttributes(gl, this.programInfo, this.vertexArrayInfo);
    twgl.setUniforms(this.programInfo, uniforms);
    twgl.drawBufferInfo(gl, this.vertexArrayInfo, gl.TRIANGLES, this.vertexArrayInfo.numelements, 0, this.nInstances);

    // gl.useProgram(this.program);

    // // Setup all the needed attributes.
    // gl.bindVertexArray(this.vao);

    // // Set the uniforms that are the same for all objects.
    // twgl.setUniforms(this.uniformSetters, shaderUniforms);

    // // gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.numElements);
    // twgl.drawBufferInfo(gl, this.vao, gl.TRIANGLES, this.vao.numElements, 0, this.numInstances);
  }
}

export {Transactions};
