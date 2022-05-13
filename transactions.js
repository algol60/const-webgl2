import * as twgl from './resources/4.x/twgl-full.module.js';

const vs = `#version 300 es
// precision highp float;
uniform mat4 u_worldViewProjection;
uniform mat4 u_view;
uniform mat4 u_model;

in vec3 position; // Triangle vertex.
in vec3 xyz0; // The start vertex.
in vec3 xyz1; // The end vertex.
in vec3 color;

out vec3 f_color;

void main() {
  // We're using instancing to draw transactions.
  // position contains the same vertices, repeated.
  // vx contains the actual vertices of the transaction triangles.
  //
  vec3 vx = position;

  // A line is built from two triangles; two vertices from one end,
  // and a vertex from the other.
  // We're passing in six position vertices, so we want to use vertices
  // 0,1,5 for the first triangle, and 2,3,4 for the second triangle.
  //
  vec3 this_xyz = gl_VertexID>=2 && gl_VertexID<5 ? xyz1 : xyz0;

  vec4 mposition = u_model * vec4(this_xyz+vx, 1);

  // TODO "billboard" the lines.

  // // billboarding
  // vec3 cameraRight = vec3(u_view[0].x, u_view[1].x, u_view[2].x);
  // vec3 cameraUp = vec3(u_view[0].y, u_view[1].y, u_view[2].y);
  // // vec3 cameraOut = cross(cameraRight, cameraUp);
  // mposition.xyz += cameraRight * vx.x + cameraUp * vx.y;

  gl_Position = u_worldViewProjection * mposition;
  f_color = color;
}
`;

const fs = `#version 300 es
precision highp float;

in vec3 f_color;

out vec4 outColor;

void main() {
  outColor = vec4(f_color, 0.75);
}
`;

class Transactions {
  // constructor(n) {
  //   this.n = n;
  // }

  /**
   *
   * @param {*} gl
   * @param {*} nodes
   * @param {*} lineIxs Indexes into nodes of pairs of line ends
   */
  build(gl, nodes, lineIxs) {
    this.n = lineIxs.length;

    const xyz2 = [];//new Float32Array(this.n*2*3);
    const color = [];
    for (let ix=0; ix<this.n; ix+=2) {
      const ni = nodes[lineIxs[ix]];
      const nj = nodes[lineIxs[ix+1]];
      xyz2.push(ni.x, ni.y, ni.z);
      xyz2.push(nj.x, nj.y, nj.z);
      const red = Math.random();
      const gre = Math.random();
      const blu = Math.random();
      color.push(red, gre, blu);
    }

    // We're using instancing, so we only need a single instance of
    // three vertices for each of two triangles that make a line.
    //
    const pos = [
      0.0, -0.125, 0,
      0.0,  0.125, 0,
      0.0,  0.125, 0,

      0.0,  0.125, 0,
      0.0, -0.125, 0,
      0.0, -0.125, 0
    ]

    // Pass the two ends of each line at the same time to each vertex.
    // We need to know both ends at once to calculate distances and arrowhead sizes.
    //
    const arrays = {
      position: {numComponents:3, data:pos                                      },
      xyz0:     {numComponents:3, data:xyz2,  divisor:2, offset:0*4, stride:2*3*4},
      xyz1:     {numComponents:3, data:xyz2,  divisor:2, offset:3*4, stride:2*3*4},
      color:    {numComponents:3, data:color, divisor:2}
    };

    const program = twgl.createProgramFromSources(gl, [vs, fs]);
    this.programInfo = twgl.createProgramInfoFromProgram(gl, program);
    this.bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

    this.vao = twgl.createVertexArrayInfo(gl, this.programInfo, this.bufferInfo);
  }

  render(time, gl, viewMatrix, modelMatrix, worldViewProjectionMatrix) {
    const uniforms = {
      u_view:                 viewMatrix,
      u_model:                modelMatrix,
      u_worldViewProjection:  worldViewProjectionMatrix
    };

    gl.useProgram(this.programInfo.program);
    twgl.setBuffersAndAttributes(gl, this.programInfo, this.vao);
    twgl.setUniforms(this.programInfo, uniforms);
    twgl.drawBufferInfo(gl, this.vao, gl.TRIANGLES, this.vao.numelements, 0, this.n);
  }
}

export {Transactions};
