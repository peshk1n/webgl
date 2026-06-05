"use strict";

// ── Render targets ───────────────────────────────────────────────────────────

var sceneFBO, sceneColorTex, sceneDepthColorTex;
var brightFBO, brightTex;
var blurFBO1, blurTex1, blurFBO2, blurTex2;
var postFBO1, postTex1, postFBO2, postTex2;

var fullscreenVAO;

var currentRenderWidth, currentRenderHeight;
var renderScale = 1.0;
var targetScale = 1.0;

// ── FPS tracking ─────────────────────────────────────────────────────────────

// кольцевой буффер на 60 измерений
var fpsRing = new Float64Array(60);
var fpsRingIdx = 0;
var fpsRingCount = 0;
var lastFpsTime = 0;
var currentFPS = 60;
var qualityEvalCounter = 0;
var qualityChangeDir = 0; // -1 down, 0 stable, 1 up

const QUALITY_LEVELS = [1.0, 0.85, 0.7, 0.6];
const FPS_LOW_THRESHOLD = 30;
const FPS_HIGH_THRESHOLD = 50;
const QUALITY_EVAL_INTERVAL = 30; 

function updateFPS(timestamp) {
    if (lastFpsTime > 0) {
        const dt = (timestamp - lastFpsTime) / 1000;
        if (dt > 0) {
            fpsRing[fpsRingIdx] = 1.0 / dt;
            fpsRingIdx = (fpsRingIdx + 1) % fpsRing.length;
            if (fpsRingCount < fpsRing.length) fpsRingCount++;
        }
    }
    lastFpsTime = timestamp;

    if (fpsRingCount > 0) {
        let sum = 0;
        for (let i = 0; i < fpsRingCount; i++) sum += fpsRing[i];
        currentFPS = sum / fpsRingCount;
    }
}

function getAverageFPS() { return currentFPS; }

function updateAdaptiveQuality() {
    qualityEvalCounter++;
    if (qualityEvalCounter < QUALITY_EVAL_INTERVAL) return;
    qualityEvalCounter = 0;

    const fps = getAverageFPS();
    const currentLevelIdx = QUALITY_LEVELS.indexOf(targetScale);
    let newIdx = currentLevelIdx;

    if (fps < FPS_LOW_THRESHOLD && currentLevelIdx < QUALITY_LEVELS.length - 1) {
        if (qualityChangeDir <= 0) {
            qualityChangeDir--;
            if (qualityChangeDir <= -2) { newIdx = currentLevelIdx + 1; qualityChangeDir = 0; }
        } else { qualityChangeDir = 0; }
    } else if (fps > FPS_HIGH_THRESHOLD && currentLevelIdx > 0) {
        if (qualityChangeDir >= 0) {
            qualityChangeDir++;
            if (qualityChangeDir >= 2) { newIdx = currentLevelIdx - 1; qualityChangeDir = 0; }
        } else { qualityChangeDir = 0; }
    } else {
        qualityChangeDir = 0;
    }

    if (newIdx !== currentLevelIdx) targetScale = QUALITY_LEVELS[newIdx];
}

// ── Framebuffer helpers ──────────────────────────────────────────────────────

function createFramebufferWithTextures(gl, width, height) {
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    const colorTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, colorTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTex, 0);

    const depthColorTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthColorTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, depthColorTex, 0);

    const depthRB = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthRB);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRB);

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) console.error("FBO incomplete:", status);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fbo, colorTex, depthColorTex, width, height };
}

function resizeFramebuffer(gl, fb, width, height) {
    gl.bindTexture(gl.TEXTURE_2D, fb.colorTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindTexture(gl.TEXTURE_2D, fb.depthColorTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const depthRB = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthRB);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb.fbo);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRB);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    fb.width = width; fb.height = height;
}

function createColorOnlyFBO(gl, width, height) {
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fbo, tex, width, height };
}

function resizeColorOnlyFBO(gl, fb, width, height) {
    gl.bindTexture(gl.TEXTURE_2D, fb.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    fb.width = width; fb.height = height;
}

// ── Fullscreen quad ──────────────────────────────────────────────────────────

function createFullscreenQuad(gl) {
    const verts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const uvs = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    const tb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, tb); gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
    return { vertexBuffer: vb, texCoordBuffer: tb };
}

function drawFullscreenQuad(gl, program) {
    bindAttrib(program, "aPosition", fullscreenVAO.vertexBuffer, 2);
    bindAttrib(program, "aTexCoord", fullscreenVAO.texCoordBuffer, 2);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// ── Init ─────────────────────────────────────────────────────────────────────

function initRenderer(gl) {
    const w = gl.canvas.width;
    const h = gl.canvas.height;
    currentRenderWidth = w; currentRenderHeight = h;

    sceneFBO = createFramebufferWithTextures(gl, w, h);

    const halfW = Math.max(1, Math.floor(w / 2));
    const halfH = Math.max(1, Math.floor(h / 2));
    brightFBO = createColorOnlyFBO(gl, halfW, halfH);
    blurFBO1 = createColorOnlyFBO(gl, halfW, halfH);
    blurFBO2 = createColorOnlyFBO(gl, halfW, halfH);
    postFBO1 = createColorOnlyFBO(gl, w, h);
    postFBO2 = createColorOnlyFBO(gl, w, h);

    fullscreenVAO = createFullscreenQuad(gl);
}

function getRenderSize() {
    return { width: currentRenderWidth, height: currentRenderHeight };
}

function getHalfRenderSize() {
    return { width: Math.max(1, Math.floor(currentRenderWidth / 2)), height: Math.max(1, Math.floor(currentRenderHeight / 2)) };
}

function updateRenderScale(gl, newScale) {
    if (Math.abs(newScale - renderScale) < 0.005) return;
    renderScale = newScale;
    const w = Math.max(1, Math.floor(gl.canvas.width * renderScale));
    const h = Math.max(1, Math.floor(gl.canvas.height * renderScale));
    currentRenderWidth = w; currentRenderHeight = h;
    resizeFramebuffer(gl, sceneFBO, w, h);
}

// ── Utility: bind texture ────────────────────────────────────────────────────

function bindTexture(gl, program, uniformName, texture, unit) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(program, uniformName), unit);
}

function bindAttrib(program, name, buffer, size) {
    const loc = gl.getAttribLocation(program, name);
    if (loc < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc);
}
