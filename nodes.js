import * as twgl from './resources/4.x/twgl-full.module.js';

const vs = `#version 300 es
precision highp float;

// The xy corners of the two triangles that form a sqaure.
//
const vec2 CORNERS[] = vec2[](
  vec2(-1,-1), vec2(1,-1), vec2(-1,1),
               vec2(1,-1), vec2(-1,1), vec2(1,1)
);

const vec2 TEX_COORDS[] = vec2[](
  vec2(0,1), vec2(1,1), vec2(0,0),
             vec2(1,1), vec2(0,0), vec2(1,0)
);

uniform mat4 u_worldViewProjection;
uniform mat4 u_view;
uniform mat4 u_model;

in vec3 position;
in vec3 xyz;
in float radius;
in vec3 color;
in uvec2 iconsIndex;
in uvec4 decorIndex;

out vec2 v_fgCoord;
out vec3 v_color;
flat out uvec2 f_iconsIndex;
flat out uvec4 f_decorIndex;

void main() {
  v_fgCoord = TEX_COORDS[gl_VertexID];
  v_color = color;

  vec4 mposition = u_model * vec4(xyz, 1);
  // position.xy += corners;

  // billboarding
  vec3 cameraRight = vec3(u_view[0].x, u_view[1].x, u_view[2].x);
  vec3 cameraUp = vec3(u_view[0].y, u_view[1].y, u_view[2].y);

  vec2 corners = CORNERS[gl_VertexID] * radius;
  mposition.xyz += cameraRight * corners.x + cameraUp * corners.y;

  gl_Position = u_worldViewProjection * mposition;

  f_iconsIndex = iconsIndex;
  f_decorIndex = decorIndex;
}
`;

const fs = `#version 300 es
precision highp float;

// This says "no icon here".
//
const uint NO_ICON = 65535u;

// The texture atlas contains 8x8 images, each image is 256x256.
// Same as Constellation, except it uses a 2D texture.
// (Obviously we need a 3D texture, but this is a proof-of-concept. :-))
// We use these constants to calculate leftx, topy, rightx, bottomy for texcoords.
//
const float TEXTURE_SIZE = 0.125;
const float HALF_PIXEL = (0.5 / (256.0 * 8.0));

in vec2 v_fgCoord;
in vec3 v_color;
flat in uvec2 f_iconsIndex;
flat in uvec4 f_decorIndex;

uniform sampler2D u_diffuse;

out vec4 outColor;

// The icons are in a n 8x8 texture.
// Given an icon index, return the position of the icon in the texture.
//
vec2 iconxy(uint ix) {
  return vec2(float(ix % 8u), float(ix / 8u)) / 8.0 + vec2(HALF_PIXEL, -2.0*HALF_PIXEL);
}

void main() {

  // Uncomment this to prove that nodes with radius 0.5 just touch each other.
  //
  // outColor = vec4(v_color, 1);
  // return;

  // We don't get the texture coordinates for each icon.
  // Instead, we get a texture coordinate in a constant (0..1, 0..1) range
  // from the vertex shader, and an icon index, and figure out
  // the icon coordinates here.
  // This saves bytes for each icon.
  //
  vec2 fgxy = iconxy(f_iconsIndex[0]);
  vec2 bgxy = iconxy(f_iconsIndex[1]);
  const vec2 size = vec2(TEXTURE_SIZE, TEXTURE_SIZE);

  // Start with the foreground icon.
  // Only use the background icon when the foreground is transparent.
  //
  outColor = vec4(0, 0, 0, 0);
  vec4 color = texture(u_diffuse, fgxy + size * v_fgCoord);
  if (color.a>=0.1) {
    outColor = color;
  } else {
    color = texture(u_diffuse, bgxy + size * v_fgCoord);
    if (color.a>=0.1) {
      outColor = color * vec4(v_color, 1);
    }
  }

  // Now do the decorators.
  //

  // Testing: overlay the same icon; actually, get it from another index.
  const float decoratorRadius = 3.0;
  const float inv = 1.0 / decoratorRadius;

  uint tl = f_decorIndex[0];
  uint tr = f_decorIndex[1];
  uint bl = f_decorIndex[2];
  uint br = f_decorIndex[3];

  if (tl!=NO_ICON && v_fgCoord.x<inv && v_fgCoord.y<inv) {
    vec2 xy = iconxy(tl);
    vec4 dColor = texture(u_diffuse, xy + size*decoratorRadius * v_fgCoord);
    if (dColor.a>=0.1) {
      outColor = dColor;
    }
  }

  if (tr!=NO_ICON && v_fgCoord.x>=(1.0-inv) && v_fgCoord.y<inv) {
    vec2 xy = iconxy(tr);
    vec2 coord = vec2(v_fgCoord.x-(1.0-inv), v_fgCoord.y);
    vec4 dColor = texture(u_diffuse, xy + size*decoratorRadius * coord);
    if (dColor.a>=0.1) {
      outColor = dColor;
    }
  }

  if (bl!=NO_ICON && v_fgCoord.x<inv && v_fgCoord.y>=(1.0-inv)) {
    vec2 xy = iconxy(bl);
    vec2 coord = vec2(v_fgCoord.x, v_fgCoord.y-(1.0-inv));
    vec4 dColor = texture(u_diffuse, xy + size*decoratorRadius * coord);
    if (dColor.a>=0.1) {
      outColor = dColor;
    }
  }

  if (br!=NO_ICON && v_fgCoord.x>=(1.0-inv) && v_fgCoord.y>=(1.0-inv)) {
    vec2 xy = iconxy(br);
    vec2 coord = v_fgCoord-(1.0-inv);
    vec4 dColor = texture(u_diffuse, xy + size*decoratorRadius * coord);
    if (dColor.a>=0.1) {
      outColor = dColor;
    }
  }

  if (outColor.a<0.1) {
    discard;
  }
}
`;

class Nodes {
  /**
   *
   * @param {*} gl
   * @param {*} nodes
   * @param {*} lineIxs Indexes into nodes of pairs of line ends
   */
   build(gl, nodes) {
    this.n = nodes.length;

    const xyz = []; // node centre positions
    const radius = []; // node radii
    const color = []; // node color

    const iconsIndex = new Uint16Array(this.n*2); // fg + bg icons
    const decorIndex = new Uint16Array(this.n*4); // Four decorators per node.

    for (const [nodeIx, node] of nodes.entries()) {
      radius.push(node.r);

      // The texture atlas contains 8x8 images, each image is 256x256.
      // Same as Constellation, except it uses a 2D texture.
      // Calculate leftx, topy, rightx, bottomy for texcoords.
      //
      const TEXTURE_SIZE = 0.125;
      const HALF_PIXEL = (0.5 / (256 * 8));

      // Node foreground icons.
      //
      const fg_tex = node.fg_tex;

      // Node background icons.
      //
      const bg_tex = node.bg_tex;

      xyz.push(node.x, node.y, node.z);
      color.push(node.red, node.gre, node.blu)
      iconsIndex[nodeIx*2+0] = fg_tex;
      iconsIndex[nodeIx*2+1] = bg_tex;
      decorIndex[nodeIx*4+0] = node.hasOwnProperty('tl') ? node.tl : 65535;
      decorIndex[nodeIx*4+1] = node.hasOwnProperty('tr') ? node.tr : 65535;
      decorIndex[nodeIx*4+2] = node.hasOwnProperty('bl') ? node.bl : 65535;
      decorIndex[nodeIx*4+3] = node.hasOwnProperty('br') ? node.br : 65535;
    }

    // We're using instancing, so we only need a single instance
    // of the vertices for two triangles.
    //
    const pos = [
      0,1, 1,1, 0,0,
           1,1, 0,0, 1,0
    ];

    const arrays = {
      position:   {numComponents:2, data:pos                  },
      xyz:        {numComponents:3, data:xyz,        divisor:1},
      radius:     {numComponents:1, data:radius,     divisor:1},
      color:      {numComponents:3, data:color,      divisor:1},
      iconsIndex: {numComponents:2, data:iconsIndex, divisor:1},
      decorIndex: {numComponents:4, data:decorIndex, divisor:1}
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

    // gl.drawArrays(gl.TRIANGLES, 0, this.bufferInfo.numElements);
    twgl.drawBufferInfo(gl, this.vao, gl.TRIANGLES, this.vao.numelements, 0, this.n);
  }
}

export {Nodes};
