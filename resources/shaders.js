const nodeVs = `#version 300 es
precision highp float;

uniform mat4 u_worldViewProjection;
uniform mat4 u_view;
uniform mat4 u_model;

in vec3 position;
in vec2 corners;
in vec2 fgCoord;
// in vec2 bgCoord;
in vec3 color;
in uvec2 iconsIndex;
in uvec4 decorIndex;

out vec2 v_fgCoord;
// out vec2 v_bgCoord;
out vec3 v_color;
flat out uvec2 f_iconsIndex;
flat out uvec4 f_decorIndex;

void main() {
  v_fgCoord = fgCoord;
  // v_bgCoord = bgCoord;
  v_color = color;

  vec4 mposition = u_model * vec4(position, 1);
  // position.xy += corners;

  // billboarding
  vec3 cameraRight = vec3(u_view[0].x, u_view[1].x, u_view[2].x);
  vec3 cameraUp = vec3(u_view[0].y, u_view[1].y, u_view[2].y);
  mposition.xyz += cameraRight * corners.x + cameraUp * corners.y;

  gl_Position = u_worldViewProjection * mposition;

  f_iconsIndex = iconsIndex;
  f_decorIndex = decorIndex;
}
`;

const nodeFs = `#version 300 es
precision highp float;

const uint NO_ICON = 65535u;
const float HALF_PIXEL = (0.5 / (256.0 * 8.0));

in vec2 v_fgCoord;
// in vec2 v_bgCoord;
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

  // We don't get the texture coordinates for each icon.
  // The texture coordinate is a (0..1, 0..1) range.
  // Instead, we get the icon index, and figure out the icon coordinates here.
  // This saves bytes for each icon.
  //
  vec2 fgxy = iconxy(f_iconsIndex[0]);
  vec2 bgxy = iconxy(f_iconsIndex[1]);
  const vec2 size = vec2(0.125, 0.125);

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

export {nodeVs, nodeFs};