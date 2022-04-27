const nodeVs = `#version 300 es
uniform mat4 u_worldViewProjection;
uniform mat4 u_view;
uniform mat4 u_model;

in vec4 a_position;
in vec2 a_corners;
in vec2 a_fgCoord;
// in vec2 a_bgCoord;
in vec3 a_color;
in uvec2 a_iconsIndex;
in uvec4 a_decorIndex;

out vec2 v_fgCoord;
// out vec2 v_bgCoord;
out vec3 v_color;
flat out uvec2 iconsIndex;
flat out uvec4 decorIndex;

void main() {
  v_fgCoord = a_fgCoord;
  // v_bgCoord = a_bgCoord;
  v_color = a_color;

  vec4 position = u_model * a_position;
  // position.xy += a_corners;

  // billboarding
  vec3 cameraRight = vec3(u_view[0].x, u_view[1].x, u_view[2].x);
  vec3 cameraUp = vec3(u_view[0].y, u_view[1].y, u_view[2].y);
  position.xyz += cameraRight * a_corners.x + cameraUp * a_corners.y;

  gl_Position = u_worldViewProjection * position;

  iconsIndex = a_iconsIndex;
  decorIndex = a_decorIndex;
}
`;

const nodeFs = `#version 300 es
precision highp float;

const uint NO_ICON = 65535u;
const float HALF_PIXEL = (0.5 / (256.0 * 8.0));

in vec2 v_fgCoord;
// in vec2 v_bgCoord;
in vec3 v_color;
flat in uvec2 iconsIndex;
flat in uvec4 decorIndex;

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
  vec2 fgxy = iconxy(iconsIndex[0]);
  vec2 bgxy = iconxy(iconsIndex[1]);
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

  uint tl = decorIndex[0];
  uint tr = decorIndex[1];
  uint bl = decorIndex[2];
  uint br = decorIndex[3];

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