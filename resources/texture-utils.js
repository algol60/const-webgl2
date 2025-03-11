/*
 * Copyright 2021, GFXFundamentals.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of GFXFundamentals. nor the names of his
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

"use strict";

(function() {

var ctx = document.createElement("canvas").getContext("2d");

var setCanvasSize = function(width, height) {
  ctx.canvas.width  = width;
  ctx.canvas.height = height;
};

var makeTexture = function(gl) {
  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ctx.canvas);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return tex;
};

var makeStripeTexture = function(gl, options) {
  options = options || {};
  var width  = options.width  || 2;
  var height = options.height || 2;
  var color1 = options.color1 || "white";
  var color2 = options.color2 || "black";

  setCanvasSize(width, height);

  ctx.fillStyle = color1 || "white";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = color2 || "black";
  ctx.fillRect(0, 0, width, height / 2);

  ctx.fillStyle = "white";
  ctx.fillRect(width/4, height*3/4, width/2, height/4);

  return makeTexture(gl);
};

var makeCheckerTexture = function(gl, options) {
  options = options || {};
  var width  = options.width  || 2;
  var height = options.height || 2;
  var color1 = options.color1 || "white";
  var color2 = options.color2 || "black";

  setCanvasSize(width, height);

  ctx.fillStyle = color1 || "white";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = color2 || "black";
  ctx.fillRect(0, 0, width / 2, height / 2);
  ctx.fillRect(width / 2, height / 2, width / 2, height / 2);

  return makeTexture(gl);
};

var makeCircleTexture = function(gl, options) {
  options = options || {};
  var width  = options.width  || 128;
  var height = options.height || 128;
  var color1 = options.color1 || "white";
  var color2 = options.color2 || "black";

  setCanvasSize(width, height);

  var size = Math.min(width, height);
  ctx.fillStyle = color1 || "white";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = color2 || "black";
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.beginPath();
  ctx.arc(0, 0, width / 2 - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color1 || "white";
  ctx.beginPath();
  ctx.arc(0, 0, width / 4 - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  return makeTexture(gl);
};

var makeRandomTexture = function(gl, options) {
  options = options || {};
  var w   = options.width  || 2;
  var h   = options.height || 2;
  var min = options.min    || 0;
  var max = options.max    || 256;

  var numPixels = w * h;
  var pixels = new Uint8Array(numPixels * 4);
  var strong = 4;randInt(3);
  for (var p = 0; p < numPixels; ++p) {
    var off = p * 4;
    pixels[off + 0] = rand(min, max);
    pixels[off + 1] = rand(min, max);
    pixels[off + 2] = rand(min, max);
    pixels[off + 3] = 255;
  }
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  gl.generateMipmap(gl.TEXTURE_2D);
  return texture;
};

function loadTexture(gl, url, onLoad) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Because images have to be downloaded over the internet
  // they might take a moment until they are ready.
  // Until then put a single pixel in the texture so we can
  // use it immediately. When the image has finished downloading
  // we'll update the texture with the contents of the image,
  // and call onLoad.
  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1024;
  const height = 256;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border, srcFormat, srcType,
                pixel);

  const image = new Image();
  image.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  srcFormat, srcType, image);

    // WebGL1 has different requirements for power of 2 images
    // vs non power of 2 images so check if the image is a
    // power of 2 in both dimensions.
    if (true) {//isPowerOf2(image.width) && isPowerOf2(image.height)) {
       // Yes, it's a power of 2. Generate mips.
       gl.generateMipmap(gl.TEXTURE_2D);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      //  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.GL_NEAREST_MIPMAP_NEAREST);
      //  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.GL_LINEAR_MIPMAP_LINEAR);
      //  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.GL_LINEAR);
    } else {
       // No, it's not a power of 2. Turn off mips and set
       // wrapping to clamp to edge
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.GL_LINEAR);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_FILTER, gl.GL_LINEAR);
    }

    if(onLoad) {
      onLoad();
    }
  };
  image.src = url;

  return texture;
}

function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}

var textureUtils = {
  makeStripeTexture: makeStripeTexture,
  makeCheckerTexture: makeCheckerTexture,
  makeCircleTexture: makeCircleTexture,
  makeRandomTexture: makeRandomTexture,
  loadTexture: loadTexture
};

var isAMD = window.define && typeof window.define === "function";

if (isAMD) {
  define([], function() { return textureUtils; });
} else {
  window.textureUtils = textureUtils;
}

}());

