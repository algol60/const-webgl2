import * as twgl from './resources/4.x/twgl-full.module.js';

const vs = `#version 300 es
// precision highp float;
uniform mat4 u_projection;
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

  // The lines currently end at the centre of the 2*2 point sprite.
  // We want to end them on the surface of a 1-radius sphere around the centre,
  // so we subtract 1 from each end of the line.
  // As the ends of the line approach each other, the ends should shrink towards the centres of the points.
  //
  // arrowLength uses arbitrary numbers to make the shrinking look good.
  //

  vec4 xyz0_ = u_view * u_model * vec4(xyz0, 1.0);
  vec4 xyz1_ = u_view * u_model * vec4(xyz1, 1.0);

  float lineLength = distance(xyz0_, xyz1_);
  vec4 lineDirection = normalize(xyz1_ - xyz0_);
  float arrowLength = 1.0;// (clamp(lineLength, 0.0, 3.0)) * 0.29167;
  vec4 arrowVector = lineDirection * arrowLength;

  xyz1_ -= arrowVector;
  xyz0_ += arrowVector;

  // A line is built from two triangles; two vertices from one end,
  // and a vertex from the other.
  // We're passing in six position vertices, so we want to use vertices
  // 0,1,5 for the first triangle, and 2,3,4 for the second triangle.
  //
  vec4 this_xyz = gl_VertexID>=2 && gl_VertexID<5 ? xyz1_ : xyz0_;
  vec4 mposition = this_xyz + vec4(vx, 0);

  // A line is built from two triangles; two vertices from one end,
  // and a vertex from the other.
  // We're passing in six position vertices, so we want to use vertices
  // 0,1,5 for the first triangle, and 2,3,4 for the second triangle.
  //
  // vec3 this_xyz = gl_VertexID>=2 && gl_VertexID<5 ? xyz1 : xyz0;

  // vec4 mposition = u_view * u_model * vec4(this_xyz+vx, 1);

  // TODO "billboard" the lines.

  // // billboarding
  // vec3 cameraRight = vec3(u_view[0].x, u_view[1].x, u_view[2].x);
  // vec3 cameraUp = vec3(u_view[0].y, u_view[1].y, u_view[2].y);
  // // vec3 cameraOut = cross(cameraRight, cameraUp);
  // mposition.xyz += cameraRight * vx.x + cameraUp * vx.y;

  gl_Position = u_projection * mposition;

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
  build(gl, graph) {//nodes, lineIxs) {
    const vxs = graph.vxs;
    const txs = graph.txs;
    this.n = txs.length;

    const xyz2 = [];//new Float32Array(this.n*2*3);
    const color = [];
    for (const tx of txs) {
      const ni = vxs[tx.vx0];
      const nj = vxs[tx.vx1];
      xyz2.push(ni.x, ni.y, ni.z);
      xyz2.push(nj.x, nj.y, nj.z);
      color.push(tx.red, tx.gre, tx.blu);
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
      position: {numComponents:3, data:pos                                       },
      xyz0:     {numComponents:3, data:xyz2,  divisor:1, offset:0*4, stride:2*3*4},
      xyz1:     {numComponents:3, data:xyz2,  divisor:1, offset:3*4, stride:2*3*4},
      color:    {numComponents:3, data:color, divisor:1}
    };

    const program = twgl.createProgramFromSources(gl, [vs, fs]);
    this.programInfo = twgl.createProgramInfoFromProgram(gl, program);
    this.bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

    this.vao = twgl.createVertexArrayInfo(gl, this.programInfo, this.bufferInfo);
  }

  render(time, gl, matrices) {
    const viewProjectionMatrix = m4.multiply(matrices.projection, matrices.view);
    const uniforms = {
      u_view: matrices.view,
      u_model: matrices.model,
      u_projection: matrices.projection,
      u_worldViewProjection: viewProjectionMatrix
    };

    gl.useProgram(this.programInfo.program);
    twgl.setBuffersAndAttributes(gl, this.programInfo, this.vao);
    twgl.setUniforms(this.programInfo, uniforms);
    twgl.drawBufferInfo(gl, this.vao, gl.TRIANGLES, this.vao.numelements, 0, this.n);
  }
}

export {Transactions};
