"use strict";

var gl;
var shaderProgram;

var sceneObjects = [];
var cameraPosition = [7, 2, -12];
var cameraYaw = Math.PI + 0.7;
var cameraPitch = 0;
var sensitivity = 0.002;

let lightPosition = [5.0, 10.0, -5.0];
let lightColor = [1.0, 1.0, 1.0];
let ambientStrength = 0.2;
let linearAttenuation = 0.09;
let quadraticAttenuation = 0.032;

let isMouseDown = false;
let lastMouseX = 0, lastMouseY = 0;

function start() {
    const canvas = document.getElementById("glcanvas");
    gl = initWebGL(canvas);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.enable(gl.DEPTH_TEST);

    initShaders();

    initBuffers().then(() => requestAnimationFrame(drawScene));

    window.addEventListener("keydown", handleKeyDown);
    canvas.addEventListener("mousedown", (e) => {
        isMouseDown = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });
    canvas.addEventListener("mouseup", () => isMouseDown = false);
    canvas.addEventListener("mousemove", handleMouseMove);
}

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

function initWebGL(canvas) {
    const names = ["webgl2", "webgl", "experimental-webgl"];
    let ctx = null;
    for (const n of names) {
        try { ctx = canvas.getContext(n); } catch (e) {}
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
    const vertexShader   = loadShader(gl, gl.VERTEX_SHADER,   vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Shader program link error: " + gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

function initShaders() {
    // Phong shading: интерполируем позицию и нормаль по фрагментам
    const vsPhong = `#version 300 es
    in vec3 aVertexPosition;
    in vec3 aVertexNormal;

    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;

    out vec3 vFragPos;
    out vec3 vNormal;

    void main() {
        vFragPos    = vec3(uMVMatrix * vec4(aVertexPosition, 1.0));
        vNormal     = mat3(uMVMatrix) * aVertexNormal;
        gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    }`;

    // Модель освещения Ламберт, вычисляется per-fragment
    const fsPhong = `#version 300 es
    precision highp float;

    in vec3 vFragPos;
    in vec3 vNormal;

    uniform vec3  uLightPos;
    uniform vec3  uLightColor;
    uniform float uAmbientStrength;
    uniform float uLinearAttenuation;
    uniform float uQuadraticAttenuation;
    uniform vec3  uObjectColor;

    out vec4 fragColor;

    void main() {
        vec3  norm      = normalize(vNormal);
        vec3  lightDir  = normalize(uLightPos - vFragPos);
        float diff      = max(dot(norm, lightDir), 0.0);

        float dist        = length(uLightPos - vFragPos);
        float attenuation = 1.0 / (1.0
            + uLinearAttenuation    * dist
            + uQuadraticAttenuation * dist * dist);

        vec3 ambient = uAmbientStrength * uLightColor * uObjectColor;
        vec3 diffuse = diff             * uLightColor * uObjectColor;

        fragColor = vec4(ambient + diffuse * attenuation, 1.0);
    }`;

    shaderProgram = initShaderProgram(gl, vsPhong, fsPhong);
}

async function initBuffers() {
    const objects = await loadOBJ("src/scene.obj");
    const colors  = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];

        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.vertices), gl.STATIC_DRAW);

        const normals      = computeNormals(obj.vertices, obj.indices);
        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(obj.indices), gl.STATIC_DRAW);

        sceneObjects.push({
            vertexBuffer,
            normalBuffer,
            indexBuffer,
            indexCount: obj.indices.length,
            color: colors[i % colors.length]
        });
    }
}

function computeNormals(vertices, indices) {
    const normals = new Float32Array(vertices.length);
    for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i] * 3, i1 = indices[i + 1] * 3, i2 = indices[i + 2] * 3;
        const v0 = [vertices[i0],     vertices[i0 + 1], vertices[i0 + 2]];
        const v1 = [vertices[i1],     vertices[i1 + 1], vertices[i1 + 2]];
        const v2 = [vertices[i2],     vertices[i2 + 1], vertices[i2 + 2]];
        const u  = v1.map((v, j) => v - v0[j]);
        const v_ = v2.map((v, j) => v - v0[j]);
        const n  = [
            u[1] * v_[2] - u[2] * v_[1],
            u[2] * v_[0] - u[0] * v_[2],
            u[0] * v_[1] - u[1] * v_[0]
        ];
        for (const idx of [i0, i1, i2]) {
            normals[idx]     += n[0];
            normals[idx + 1] += n[1];
            normals[idx + 2] += n[2];
        }
    }
    for (let i = 0; i < normals.length; i += 3) {
        const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]);
        normals[i] /= len; normals[i + 1] /= len; normals[i + 2] /= len;
    }
    return normals;
}

async function loadOBJ(url) {
    const text = await (await fetch(url)).text();
    return parseOBJ(text);
}

function parseOBJ(text) {
    const lines     = text.split("\n");
    const positions = [];
    const objects   = [];
    let currentObject = { vertices: [], indices: [] };

    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts[0] === "o" && currentObject.vertices.length > 0) {
            objects.push(currentObject);
            currentObject = { vertices: [], indices: [] };
        }
        if (parts[0] === "v")
            positions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
        if (parts[0] === "f") {
            const face = parts.slice(1);
            for (let i = 1; i < face.length - 1; i++) {
                for (const v of [face[0], face[i], face[i + 1]]) {
                    const idx = parseInt(v.split("/")[0]) - 1;
                    currentObject.vertices.push(...positions[idx]);
                    currentObject.indices.push(currentObject.indices.length);
                }
            }
        }
    }
    objects.push(currentObject);
    return objects;
}

function createProjectionMatrix() {
    const fov      = 45 * Math.PI / 180;
    const aspect   = gl.canvas.width / gl.canvas.height;
    const prMatrix = mat4.create();
    mat4.perspective(prMatrix, fov, aspect, 0.1, 100.0);
    return prMatrix;
}

function getForwardVector() {
    return [
        Math.sin(cameraYaw)  * Math.cos(cameraPitch),
        Math.sin(cameraPitch),
        -Math.cos(cameraYaw) * Math.cos(cameraPitch)
    ];
}

function getRightVector() {
    return [Math.cos(cameraYaw), 0, Math.sin(cameraYaw)];
}

function drawScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(shaderProgram);

    const prMatrix     = createProjectionMatrix();
    const mvMatrix     = mat4.create();
    const forward      = getForwardVector();
    const cameraTarget = cameraPosition.map((v, i) => v + forward[i]);
    mat4.lookAt(mvMatrix, cameraPosition, cameraTarget, [0, 1, 0]);

    const lightPos4    = vec4.fromValues(...lightPosition, 1.0);
    const lightPosView = vec4.create();
    vec4.transformMat4(lightPosView, lightPos4, mvMatrix);
    const lightPosViewArr = [lightPosView[0], lightPosView[1], lightPosView[2]];

    for (const obj of sceneObjects) {
        const posLoc = gl.getAttribLocation(shaderProgram, "aVertexPosition");
        gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexBuffer);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posLoc);

        const normLoc = gl.getAttribLocation(shaderProgram, "aVertexNormal");
        gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer);
        gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(normLoc);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);

        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uMVMatrix"),             false, mvMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uPMatrix"),              false, prMatrix);
        gl.uniform3fv(gl.getUniformLocation(shaderProgram, "uLightPos"),                   lightPosViewArr);
        gl.uniform3fv(gl.getUniformLocation(shaderProgram, "uLightColor"),                 lightColor);
        gl.uniform1f(gl.getUniformLocation(shaderProgram,  "uAmbientStrength"),            ambientStrength);
        gl.uniform1f(gl.getUniformLocation(shaderProgram,  "uLinearAttenuation"),          linearAttenuation);
        gl.uniform1f(gl.getUniformLocation(shaderProgram,  "uQuadraticAttenuation"),       quadraticAttenuation);
        gl.uniform3fv(gl.getUniformLocation(shaderProgram, "uObjectColor"),                obj.color);

        gl.drawElements(gl.TRIANGLES, obj.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    requestAnimationFrame(drawScene);
}

function handleKeyDown(event) {
    const moveSpeed = 0.3;
    const forward   = getForwardVector();
    const right     = getRightVector();

    switch (event.key) {
        case "w": cameraPosition = cameraPosition.map((v, i) => v + forward[i] * moveSpeed); break;
        case "s": cameraPosition = cameraPosition.map((v, i) => v - forward[i] * moveSpeed); break;
        case "a": cameraPosition[0] -= right[0] * moveSpeed; cameraPosition[2] -= right[2] * moveSpeed; break;
        case "d": cameraPosition[0] += right[0] * moveSpeed; cameraPosition[2] += right[2] * moveSpeed; break;
    }
}