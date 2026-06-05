"use strict";

// ── Globals ──────────────────────────────────────────────────────────────────

var gl;
var canvasWidth, canvasHeight;

var cameraPosition = [0, 2.5, 6];
var cameraYaw = 0;
var cameraPitch = -0.25;
var sensitivity = 0.002;

var lightPosition = [5.0, 8.0, -3.0];
var lightColor = [1.0, 0.95, 0.85];
var ambientStrength = 0.8;
var linearAttenuation = 0.04;
var quadraticAttenuation = 0.015;

var isMouseDown = false;
var lastMouseX = 0, lastMouseY = 0;
var keyState = {};

var lastTime = 0;
var totalTime = 0;

// ── Init ─────────────────────────────────────────────────────────────────────

function start() {
    const canvas = document.getElementById("glcanvas");
    resizeCanvas(canvas);
    gl = initWebGL(canvas);

    gl.viewport(0, 0, canvas.width, canvas.height);
    window.addEventListener("resize", () => {
        resizeCanvas(canvas);
        gl.viewport(0, 0, canvas.width, canvas.height);
        currentRenderWidth = canvas.width;
        currentRenderHeight = canvas.height;
        resizeFramebuffer(gl, sceneFBO, canvas.width, canvas.height);
        resizeColorOnlyFBO(gl, postFBO1, canvas.width, canvas.height);
        resizeColorOnlyFBO(gl, postFBO2, canvas.width, canvas.height);
    });
    gl.clearColor(0, 0, 0, 1);
    gl.enable(gl.DEPTH_TEST);

    initScene(gl);
    initRenderer(gl);
    initPostProcess(gl);
    initUI();

    canvas.addEventListener("mousedown", (e) => {
        isMouseDown = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });
    canvas.addEventListener("mouseup", () => isMouseDown = false);
    canvas.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keydown", e => keyState[e.code] = true);
    window.addEventListener("keyup",   e => keyState[e.code] = false);

    requestAnimationFrame(renderLoop);
}

function resizeCanvas(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
}

function initWebGL(canvas) {
    const names = ["webgl2", "webgl", "experimental-webgl"];
    let ctx = null;
    for (const n of names) {
        try { ctx = canvas.getContext(n, { antialias: false }); } catch (e) {}
        if (ctx) break;
    }
    if (!ctx) alert("Unable to initialize WebGL");
    return ctx;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error: " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initShaderProgram(gl, vsSource, fsSource) {
    const vs = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Shader program link error: " + gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

// ── Camera ───────────────────────────────────────────────────────────────────

function handleMouseMove(e) {
    if (!isMouseDown) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    cameraYaw   += dx * sensitivity;
    cameraPitch -= dy * sensitivity;
    const maxPitch = Math.PI / 2 - 0.01;
    cameraPitch = Math.max(-maxPitch, Math.min(maxPitch, cameraPitch));
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
}

function getForwardVector() {
    return [
        Math.sin(cameraYaw)  * Math.cos(cameraPitch),
        Math.sin(cameraPitch),
        -Math.cos(cameraYaw) * Math.cos(cameraPitch),
    ];
}

function getRightVector() {
    return [Math.cos(cameraYaw), 0, Math.sin(cameraYaw)];
}

function handleCameraMovement() {
    const speed = 0.12;
    const forward = getForwardVector();
    const right = getRightVector();

    if (keyState["KeyW"]) cameraPosition = cameraPosition.map((v, i) => v + forward[i] * speed);
    if (keyState["KeyS"]) cameraPosition = cameraPosition.map((v, i) => v - forward[i] * speed);
    if (keyState["KeyA"]) { cameraPosition[0] -= right[0] * speed; cameraPosition[2] -= right[2] * speed; }
    if (keyState["KeyD"]) { cameraPosition[0] += right[0] * speed; cameraPosition[2] += right[2] * speed; }
    if (keyState["KeyQ"]) cameraPosition[1] -= speed;
    if (keyState["KeyE"]) cameraPosition[1] += speed;
}

// ── Projection ───────────────────────────────────────────────────────────────

function createProjectionMatrix() {
    const prMatrix = mat4.create();
    mat4.perspective(prMatrix, 45 * Math.PI / 180, canvasWidth / canvasHeight, 1.0, 100.0);
    return prMatrix;
}

// ── Main render loop ─────────────────────────────────────────────────────────

function renderLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;
    totalTime += dt;

    handleCameraMovement();

    // adaptive quality
    updateFPS(timestamp);
    updateAdaptiveQuality();

    const scaleDiff = targetScale - renderScale;
    if (Math.abs(scaleDiff) > 0.001) {
        updateRenderScale(gl, renderScale + scaleDiff * Math.min(dt * 4.0, 1.0));
    }

    updateAnimatedParams(dt, totalTime);

    const viewMatrix = mat4.create();
    const forward = getForwardVector();
    const cameraTarget = cameraPosition.map((v, i) => v + forward[i]);
    mat4.lookAt(viewMatrix, cameraPosition, cameraTarget, [0, 1, 0]);
    const autoFocusZ = getFocusObjectViewZ(viewMatrix);

    const prMatrix = createProjectionMatrix();

    const lightPos4 = vec4.fromValues(...lightPosition, 1.0);
    const lightPosView = vec4.create();
    vec4.transformMat4(lightPosView, lightPos4, viewMatrix);
    const lightPosViewArr = [lightPosView[0], lightPosView[1], lightPosView[2]];

    // ─────────────────────────────────────
    const size = getRenderSize();
    gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFBO.fbo);
    gl.viewport(0, 0, size.width, size.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);

    drawScene(gl, viewMatrix, prMatrix, lightPosViewArr, totalTime);

    // ────────────────────────────────────────────────
    let currentTex = sceneFBO.colorTex;
    let currentDepth = sceneFBO.depthColorTex;
    let srcFBO = postFBO1;
    let dstFBO = postFBO2;

    function swap() { const t = srcFBO; srcFBO = dstFBO; dstFBO = t; }

    // Bloom
    currentTex = applyBloom(gl, currentTex, dstFBO, appState.bloom);
    swap();

    // DOF 
    currentTex = applyDOF(gl, currentTex, currentDepth, dstFBO,
        { enabled: appState.dof.enabled, focusDistance: appState.dof.focusDistance, blurStrength: appState.dof.blurStrength });
    swap();

    // Vignette
    currentTex = applyVignette(gl, currentTex, dstFBO, appState.vignette);
    swap();

    // Grain
    currentTex = applyGrain(gl, currentTex, dstFBO, appState.grain, totalTime, [canvasWidth, canvasHeight]);
    swap();

    // LUT
    currentTex = applyLUT(gl, currentTex, dstFBO, appState.lut);

    // ───────────────────────────────────────────
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvasWidth, canvasHeight);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(shaderCopy);
    bindTexture(gl, shaderCopy, "uTex", currentTex, 0);
    drawFullscreenQuad(gl, shaderCopy);

    // ────────────────────────────────────────────────────────────
    updateInfoDisplay(getAverageFPS());

    requestAnimationFrame(renderLoop);
}
