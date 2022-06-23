import * as twgl from './resources/4.x/twgl-full.module.js';

const vs = `#version 300 es
precision highp float;

// An arbitrary value to provide the default line width of 1.
//
const float WIDTH_FACTOR = 32.0;

// These bits indicate if an arrow head is drawn at either end.
//
const uint ARROW_END0 = 1u;
const uint ARROW_END1 = 2u;

const int MAX_LINE_POS = 6;
const int MAX_ARROW0_POS = 12;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

in float position; // Triangle vertex.
in vec4 xyz0; // The start vertex.
in vec4 xyz1; // The end vertex.
in vec3 color;
in float width;
in uint arrow;

out vec4 frag_color;
out vec2 point;

void main() {
  // TODO move the tip of the arrow one radius out.
  //

  bool drawArrow0 = (arrow & ARROW_END0) != 0u;
  bool drawArrow1 = (arrow & ARROW_END1) != 0u;

  vec4 xyz0_vm = u_view * u_model * xyz0;
  vec4 xyz1_vm = u_view * u_model * xyz1;

  // The lines currently end at the centre of the 2*2 point sprite.
  // We want to end them on the surface of a 1-radius sphere around the centre,
  // so we subtract 1 from each end of the line.
  // As the ends of the line approach each other, the ends should shrink
  // towards the centres of the points.
  //
  // arrowLength uses arbitrary numbers to make the shrinking look good.
  //

  float lineLength = distance(xyz0_vm, xyz1_vm);
  vec4 lineDirection = normalize(xyz1_vm - xyz0_vm);

  // Arbitrary numbers to make the arrowheads look good, even when they shrink.
  //
  float arrowLength = (clamp(lineLength, 0.0, 3.0)) * 0.29167;
  vec4 arrowVector = lineDirection * arrowLength;

  // Shrink the ends towards each other.
  //
  vec4 xyz0_ = xyz0_vm + arrowVector;
  vec4 xyz1_ = xyz1_vm - arrowVector;

  // "Billboarding".
  // Just as the nodes always face the camera, we want to make the lines do the same.
  // If the line corners are drawn in fixed directions, then they can be drawn edge on
  // and disappear.
  //
  // Instead, we determine an xy direction that is at right angles to the relative xy
  // positions of the two nodes. The right angle is obtained using the cross-product
  // of the xy vector between the two nodes and the unit z-vector. Then normalize
  // to get a consistent direction vector.
  //
  vec2 dir = normalize(cross(vec3(xyz0_.xy - xyz1_.xy, 0.0), vec3(0.0, 0.0, 1.0))).xy;

  // Replicate the Constellation arrowhead drawing.
  // It's mighty fiddly, but it looks reasonable.
  //
  vec4 halfWidth = vec4(dir.xy / WIDTH_FACTOR, 0.0, 0.0) * width;
  arrowVector *= width * 0.75;

  // We use the 1/-1 values passed in as position to make the direction vector twist
  // in the correct direction when the nodes are rotated.
  // We also divide by an arbitrary value to provide the default width of 1.
  //
  dir *= position / WIDTH_FACTOR;

  // Multiply by the width from the graph.
  //
  dir *= width;

  // A line is built from two triangles; two vertices from one end,
  // and a vertex from the other.
  // We're passing in six position vertices; we want to use vertices
  // 0,1,5 for the first triangle, and 2,3,4 for the second triangle.
  //
  bool otherEnd = gl_VertexID>=2 && gl_VertexID<5;
  vec4 this_xyz = otherEnd ? xyz1_ - arrowVector*(drawArrow1?1.0:0.0) : xyz0_ + arrowVector*(drawArrow0?1.0:0.0);
  vec4 corner = this_xyz + vec4(dir, 0.0, 0.0);

  frag_color = vec4(color, 1.0);

  // The first six vertices are the two triangles for the line.
  // The next six are one triangle each for the arrowheads at each end of the line.
  //
  if (gl_VertexID<MAX_LINE_POS) {

    // One of the line triangles.
    //
    gl_Position = u_projection * corner;

  } else if ((drawArrow0 && (gl_VertexID<MAX_ARROW0_POS)) || (drawArrow1 && (gl_VertexID>=MAX_ARROW0_POS))) {

    // An arrowhead.
    //
    // This is either position 6,7,8 (the arrowhead triangle at end0), or
    // 9,10,11 (the arrowhead triangle at end1).
    // Figure out the vertices depending on gl_VertexID.
    //
    // TODO Fix shading.
    //
    vec4 arrowPos = gl_VertexID<MAX_ARROW0_POS ? xyz0_ : xyz1_;
    float arrowDirection = gl_VertexID<MAX_ARROW0_POS ? 1.0 : -1.0;
    if (position==0.0) {//(gl_VertexID==6 || gl_VertexID==9) {
      // Arrow tip.
      //
      gl_Position = u_projection * arrowPos;
    } else if (position==2.0) {//gl_VertexID==7 || gl_VertexID==10) {
      // Centre bottom of arrow.
      // If this is a double-arrow line, extend the base to make a diamond.
      // THis is why the arrows ar edrawn like they are - to make this easy.)
      //
      float extend = drawArrow0 && drawArrow1 ? 1.5 : 1.0;
      gl_Position = u_projection * (arrowPos + extend*arrowDirection*arrowVector);
    } else {
      // Outside corner.
      //
      gl_Position = u_projection * (arrowPos + arrowDirection*arrowVector) + position*halfWidth*4.0;
    }

  } else {
    // The extra positions aren't required, because there are no arrowheads.
    // Setting .a to 0.0 tells the fragment shader code to discard this pixel immediately.
    //
    frag_color = vec4(0.0);
  }

  // Pass the xy coordinate of this vertex out.
  // The coordinates will be interpolated across the line
  // (in the same way that colors are interpolated),
  // allowing the fragment shader to add dark edges and/or line styles.
  //
  lineLength = distance(xyz0_, xyz1_);
  point = vec2(position<0.0?0.0:1.0, otherEnd?lineLength:0.0);
}
`;

const fs = `#version 300 es
precision highp float;

in vec4 frag_color;
in vec2 point;

out vec4 outColor;

void main() {
  if (frag_color.a==0.0) {
    discard;
  } else {
    outColor = frag_color;

    // Darken the edges?
    //
    float x = abs(point.x-0.5);
    if (true) {//x>=0.2) {
      outColor.rgb *= 1.2-x;
    }
  }
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

    // const xyz2 = [];//new Float32Array(this.n*2*3);
    const xyz2 = twgl.primitives.createAugmentedTypedArray(this.n*2*3, 1);
    const color = twgl.primitives.createAugmentedTypedArray(this.n*3, 1);
    const width = twgl.primitives.createAugmentedTypedArray(this.n, 1);
    const arrow = twgl.primitives.createAugmentedTypedArray(this.n, 1, Uint8Array);
    for (const tx of txs) {
      const ni = vxs[tx.vx0];
      const nj = vxs[tx.vx1];
      xyz2.push(ni.x, ni.y, ni.z);
      xyz2.push(nj.x, nj.y, nj.z);
      color.push(tx.red, tx.gre, tx.blu);
      width.push(tx.hasOwnProperty('w') ? tx.w : 1);
      arrow.push(tx.hasOwnProperty('arrow') ? tx.arrow : 0);
    }

    // We're using instancing, so we only need a single instance of
    // three vertices for each of two triangles that make a line.
    // In fact, we don't even use these values as positions in the shader:
    // the corners of the line triangles are determined by the
    // positions of the two end nodes.
    // We just use these to get the correct number of vertices
    // (and to make the corners draw correctly).
    //
    // The arrowhead parts indicate to the shader:
    // 0: this is the tip
    // 2: this is the base along the line
    // -1,1: this is the specified base corner
    //
    const pos = [
      -1.0,  1.0,  1.0,   // 0  line triangle
       1.0, -1.0, -1.0,   // 3  line triangle
         0,    2, -1.0,   // 6  arrowhead semi-triangle at end0
         0,    2,  1.0,   // 9  arrowhead semi-triangle at end0
         0,    2, -1.0,   // 12 arrowhead semi-triangle at end1
         0,    2,  1.0    // 15 arrowhead semi-triangle at end1
    ];

    // Pass the two ends of each line at the same time to each vertex.
    // We need to know both ends at once to calculate distances and arrowhead sizes.
    //
    const arrays = {
      position: {numComponents:1, data:pos},
      xyz0:     {numComponents:3, data:xyz2,  divisor:1, offset:0*4, stride:2*3*4},
      xyz1:     {numComponents:3, data:xyz2,  divisor:1, offset:3*4, stride:2*3*4},
      color:    {numComponents:3, data:color, divisor:1},
      width:    {numComponents:1, data:width, divisor:1},
      arrow:    {numComponents:1, data:arrow, divisor:1}
    };

    const program = twgl.createProgramFromSources(gl, [vs, fs]);
    this.programInfo = twgl.createProgramInfoFromProgram(gl, program);
    this.bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

    this.vao = twgl.createVertexArrayInfo(gl, this.programInfo, this.bufferInfo);
  }

  render(time, gl, matrices) {
    const viewProjectionMatrix = m4.multiply(matrices.projection, matrices.view);
    const uniforms = {
      u_model: matrices.model,
      u_view: matrices.view,
      u_projection: matrices.projection
    };

    gl.useProgram(this.programInfo.program);
    twgl.setBuffersAndAttributes(gl, this.programInfo, this.vao);
    twgl.setUniforms(this.programInfo, uniforms);
    twgl.drawBufferInfo(gl, this.vao, gl.TRIANGLES, this.vao.numelements, 0, this.n);
  }
}

export {Transactions};
