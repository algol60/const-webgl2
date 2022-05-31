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

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

in vec3 position;
in vec3 xyz;
in float radius;
in vec3 color;
in uvec2 iconsIndex;
in uvec4 decorIndex;

centroid out vec2 v_fgCoord;
out vec4 v_color;
flat out uvec2 f_iconsIndex;
flat out uvec4 f_decorIndex;
flat out float alpha;

void main() {
  v_fgCoord = TEX_COORDS[gl_VertexID];
  v_color = vec4(color, 1.0);

  vec4 mPosition = u_model * vec4(xyz, 1);

  // Billboarding.
  //
  vec3 cameraRight = vec3(u_view[0].x, u_view[1].x, u_view[2].x);
  vec3 cameraUp = vec3(u_view[0].y, u_view[1].y, u_view[2].y);

  vec2 corners = CORNERS[gl_VertexID] * radius;
  mPosition.xyz += cameraRight * corners.x + cameraUp * corners.y;

  vec4 mvPosition = u_view * mPosition;

  // As a node gets further away from the camera, we want to
  // fade the foreground and decorator icons so the background color stands out
  // (because the other icons are too small to see anyway).
  // (Constellation does something different involving pixelDensity.)
  //
  const float FAR_FG_DISTANCE = -100.0; // Distance beyond which fg alpha is 0.0.
  const float NEAR_FG_DISTANCE = -50.0; // Distance within which fg alpha is 1.0.
  alpha = smoothstep(FAR_FG_DISTANCE, NEAR_FG_DISTANCE, mvPosition.z/radius);

  gl_Position = u_projection * mvPosition;

  f_iconsIndex = iconsIndex;
  f_decorIndex = decorIndex;
}
`;

const fs = `#version 300 es
precision highp float;

// This says "no icon here".
//
const uint NO_ICON = 65535u;

// The minimum icon alpha that will be drawn.
//
const float MIN_ALPHA = 0.1;

// The texture atlas contains 8x8 images, each image is 256x256.
// Same as Constellation, except it uses a 2D texture.
// (Obviously we need a 3D texture, but this is a proof-of-concept. :-))
// We use these constants to calculate leftx, topy, rightx, bottomy for texcoords.
//
// The HALF_PIXEL offset into the texture should give us an offset into
// the centre of a pixel, to avoid bleeding into adjacent icons at the edges.
//
const float TEXTURE_SIZE = 0.125;
const float HALF_PIXEL = (0.5 / (256.0 * 8.0));

centroid in vec2 v_fgCoord;
in vec4 v_color;
flat in uvec2 f_iconsIndex;
flat in uvec4 f_decorIndex;
flat in float alpha;

uniform sampler2D u_diffuse;

out vec4 outColor;

// The icons are in an 8x8 texture.
// Given an icon index, return the position of the icon in the texture.
//
vec2 iconxy(uint ix) {
  return vec2(float(ix % 8u), float(ix / 8u)) / 8.0 + vec2(HALF_PIXEL);
}

void main() {

  // Uncomment this to prove that nodes with radius 1.0 just touch each other.
  //
  // outColor = vec4(v_color.rgb, alpha);
  // return;

  // We don't get the texture coordinates for each icon.
  // Instead, we get a texture coordinate in a constant (0..1, 0..1) range
  // from the vertex shader, and an icon index, and figure out
  // the icon coordinates here.
  // This saves bytes for each icon.
  //
  vec2 fgxy = iconxy(f_iconsIndex[0]);
  vec2 bgxy = iconxy(f_iconsIndex[1]);
  const vec2 size = vec2(TEXTURE_SIZE, TEXTURE_SIZE) - 2.0*vec2(HALF_PIXEL);

  outColor = vec4(0, 0, 0, 0);

  // We only draw the foreground and decorator icons if they haven't
  // been completely faded out.
  //
  if (alpha>0.0) {
    // Draw the decorators.
    // It seems counter-intuitive to draw the front part first,
    // but then we only need to worry about drawing the
    // background + foreground icons where there isn't any decorator color.
    //

    // A decorator takes up 1/3 of the node size.
    // Therefore we need to re-multiply to get the texture.
    //
    const float decoratorRadius = 3.0;
    const float inv = 1.0 / decoratorRadius;

    uint tl = f_decorIndex[0];
    uint tr = f_decorIndex[1];
    uint bl = f_decorIndex[2];
    uint br = f_decorIndex[3];

    if (tl!=NO_ICON && v_fgCoord.x<inv && v_fgCoord.y<inv) {
      vec2 xy = iconxy(tl);
      vec4 dColor = texture(u_diffuse, xy + size*decoratorRadius * v_fgCoord);
      if (dColor.a>=MIN_ALPHA) {
        outColor = dColor;
      }
    }

    if (tr!=NO_ICON && v_fgCoord.x>=(1.0-inv) && v_fgCoord.y<inv) {
      vec2 xy = iconxy(tr);
      vec2 coord = vec2(v_fgCoord.x-(1.0-inv), v_fgCoord.y);
      vec4 dColor = texture(u_diffuse, xy + size*decoratorRadius * coord);
      if (dColor.a>=MIN_ALPHA) {
        outColor = dColor;
      }
    }

    if (bl!=NO_ICON && v_fgCoord.x<inv && v_fgCoord.y>=(1.0-inv)) {
      vec2 xy = iconxy(bl);
      vec2 coord = vec2(v_fgCoord.x, v_fgCoord.y-(1.0-inv));
      vec4 dColor = texture(u_diffuse, xy + size*decoratorRadius * coord);
      if (dColor.a>=MIN_ALPHA) {
        outColor = dColor;
      }
    }

    if (br!=NO_ICON && v_fgCoord.x>=(1.0-inv) && v_fgCoord.y>=(1.0-inv)) {
      vec2 xy = iconxy(br);
      vec2 coord = v_fgCoord-(1.0-inv);
      vec4 dColor = texture(u_diffuse, xy + size*decoratorRadius * coord);
      if (dColor.a>=MIN_ALPHA) {
        outColor = dColor;
      }
    }

    // If a decorator has already been drawn here,
    // don't draw the foreground over it.
    //
    if (outColor.a==0.0) {
      vec4 fgColor = texture(u_diffuse, fgxy + size * v_fgCoord);
      outColor = fgColor;
    }

    if (alpha==1.0) {
        if (outColor.a<MIN_ALPHA) {
          vec4 bgColor = texture(u_diffuse, bgxy + size * v_fgCoord);
          outColor = bgColor*v_color;
        }
    } else {
      vec4 bgColor = texture(u_diffuse, bgxy + size * v_fgCoord);
      float a = outColor.a * alpha;
      outColor = mix(bgColor*v_color, outColor, a);
    }
  } else {
    vec4 bgColor = texture(u_diffuse, bgxy + size * v_fgCoord);
    outColor = bgColor*v_color;
  }

  if (outColor.a<MIN_ALPHA) {
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
   build(gl, graph) {
    const vxs = graph.vxs;
    this.n = vxs.length;

    const xyz = []; // node centre positions
    const radius = []; // node radii
    const color = []; // node color

    const iconsIndex = new Uint16Array(this.n*2); // fg + bg icons
    const decorIndex = new Uint16Array(this.n*4); // Four decorators per node.

    for (const [nodeIx, node] of vxs.entries()) {
      radius.push(node.r);

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

    // We're using instancing, so we only need a single instance of
    // three vertices for two triangles that make a node.
    //
    const pos = [
      -1,1, 1,1, -1,-1,
            1,1, -1,-1, 1,-1
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

  render(time, gl, matrices, atlas) {
    const viewProjectionMatrix = m4.multiply(matrices.projection, matrices.view);
    const uniforms = {
      u_view: matrices.view,
      u_model: matrices.model,
      u_projection: matrices.projection,
      u_diffuse: atlas
    };

    gl.useProgram(this.programInfo.program);
    twgl.setBuffersAndAttributes(gl, this.programInfo, this.vao);
    twgl.setUniforms(this.programInfo, uniforms);
    twgl.drawBufferInfo(gl, this.vao, gl.TRIANGLES, this.vao.numelements, 0, this.n);
  }
}

export {Nodes};
