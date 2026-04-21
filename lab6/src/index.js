"use strict";

var gl;
var shaderProgram;

var sceneObjects = [];
var particleSystems = [];

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
let mouseX = 0, mouseY = 0; // для магического следа

let lastTime = 0; // для deltaTime

const TEX_BASE_PATH = "src/textures/";

function resizeCanvas(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function start() {
    const canvas = document.getElementById("glcanvas");
    resizeCanvas(canvas);
    gl = initWebGL(canvas);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    window.addEventListener("resize", () => {
        resizeCanvas(canvas);
        gl.viewport(0, 0, canvas.width, canvas.height);
    });
    gl.clearColor(0, 0, 0, 1);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    initShaders();
    // initBuffers().then(() => {
    //     initParticleSystems();
    //     requestAnimationFrame(drawScene);
    // });
    initParticleSystems();
        requestAnimationFrame(drawScene);

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
    // Запоминаем позицию мыши для магического следа
    mouseX = e.clientX;
    mouseY = e.clientY;

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
    const vsSource = `#version 300 es
    in vec3 aVertexPosition;
    in vec3 aVertexNormal;
    in vec2 aTexCoord;

    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;

    out vec3 vFragPos;
    out vec3 vNormal;
    out vec2 vTexCoord;

    void main() {
        vFragPos    = vec3(uMVMatrix * vec4(aVertexPosition, 1.0));
        vNormal     = mat3(uMVMatrix) * aVertexNormal;
        vTexCoord   = aTexCoord;
        gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    }`;

    const fsSource = `#version 300 es
    precision highp float;

    in vec3 vFragPos;
    in vec3 vNormal;
    in vec2 vTexCoord;

    uniform vec3  uLightPos;
    uniform vec3  uLightColor;
    uniform float uAmbientStrength;
    uniform float uLinearAttenuation;
    uniform float uQuadraticAttenuation;

    uniform sampler2D uTexMaterial;

    out vec4 fragColor;

    void main() {
        vec3  norm     = normalize(vNormal);
        vec3  lightDir = normalize(uLightPos - vFragPos);
        float diff     = max(dot(norm, lightDir), 0.0);
        float dist     = length(uLightPos - vFragPos);
        float atten    = 1.0 / (1.0
            + uLinearAttenuation    * dist
            + uQuadraticAttenuation * dist * dist);

        vec4 texColor = texture(uTexMaterial, vTexCoord);
        vec3 ambient  = uAmbientStrength * uLightColor * texColor.rgb;
        vec3 diffuse  = diff             * uLightColor * texColor.rgb;

        fragColor = vec4(ambient + diffuse * atten, texColor.a);
    }`;

    shaderProgram = initShaderProgram(gl, vsSource, fsSource);
}

function loadTexture(url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
                  gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([200, 200, 200, 255]));
    const img = new Image();
    img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        if ((img.width & (img.width - 1)) === 0 && (img.height & (img.height - 1)) === 0) {
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    };
    img.onerror = () => console.warn(`Texture not found: ${url}`);
    img.src = url;
    return texture;
}

async function initBuffers() {
    const sceneObjs = await loadOBJ("src/scene.obj");

    for (const obj of sceneObjs) {
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.vertices), gl.STATIC_DRAW);

        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.normals), gl.STATIC_DRAW);

        const texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.texCoords), gl.STATIC_DRAW);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(obj.indices), gl.STATIC_DRAW);

        sceneObjects.push({
            vertexBuffer,
            normalBuffer,
            texCoordBuffer,
            indexBuffer,
            indexCount:  obj.indices.length,
            texMaterial: loadTexture(TEX_BASE_PATH + obj.name + ".png"),
        });
    }
}

async function loadOBJ(url) {
    const text = await (await fetch(url)).text();
    return parseOBJ(text);
}

function parseOBJ(text) {
    const lines = text.split("\n");
    const allPositions = [], allTexCoords = [], allNormals = [];
    const objects = [];
    let cur = null, curName = "";

    function flush() {
        if (cur && cur.indices.length > 0) { cur.name = curName; objects.push(cur); }
    }
    function next(name) {
        flush();
        curName = name;
        cur = { vertices: [], texCoords: [], normals: [], indices: [], vertexMap: new Map() };
    }

    next("__root__");

    function getVertexIndex(vi, ti, ni) {
        const key = `${vi}/${ti}/${ni}`;
        if (cur.vertexMap.has(key)) return cur.vertexMap.get(key);
        const index = cur.vertices.length / 3;
        cur.vertices.push(...allPositions[vi]);
        cur.texCoords.push(
            (!isNaN(ti) && allTexCoords[ti]) ? allTexCoords[ti][0] : 0,
            (!isNaN(ti) && allTexCoords[ti]) ? 1.0 - allTexCoords[ti][1] : 0
        );
        cur.normals.push(...((!isNaN(ni) && allNormals[ni]) ? allNormals[ni] : [0, 1, 0]));
        cur.vertexMap.set(key, index);
        return index;
    }

    for (const line of lines) {
        const p = line.trim().split(/\s+/);
        switch (p[0]) {
            case "o":  next(p[1] || ""); break;
            case "v":  allPositions.push([parseFloat(p[1]), parseFloat(p[2]), parseFloat(p[3])]); break;
            case "vt": allTexCoords.push([parseFloat(p[1]), parseFloat(p[2])]); break;
            case "vn": allNormals.push([parseFloat(p[1]), parseFloat(p[2]), parseFloat(p[3])]); break;
            case "f": {
                const face = p.slice(1);
                for (let i = 1; i < face.length - 1; i++)
                    for (const tok of [face[0], face[i], face[i+1]]) {
                        const parts = tok.split("/");
                        cur.indices.push(getVertexIndex(
                            parseInt(parts[0]) - 1,
                            parts[1] ? parseInt(parts[1]) - 1 : NaN,
                            parts[2] ? parseInt(parts[2]) - 1 : NaN
                        ));
                    }
                break;
            }
        }
    }

    flush();
    for (const obj of objects) delete obj.vertexMap;
    return objects;
}

function createProjectionMatrix() {
    const prMatrix = mat4.create();
    mat4.perspective(prMatrix, 45 * Math.PI / 180, gl.canvas.width / gl.canvas.height, 0.1, 100.0);
    return prMatrix;
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

function bindAttrib(program, name, buffer, size) {
    const loc = gl.getAttribLocation(program, name);
    if (loc < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc);
}

function bindTexture(program, uniformName, texture, unit) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(program, uniformName), unit);
}

function drawScene(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // секунды, макс 50мс
    lastTime = timestamp;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const prMatrix     = createProjectionMatrix();
    const mvMatrix     = mat4.create();
    const forward      = getForwardVector();
    const cameraTarget = cameraPosition.map((v, i) => v + forward[i]);
    mat4.lookAt(mvMatrix, cameraPosition, cameraTarget, [0, 1, 0]);

    const lightPos4    = vec4.fromValues(...lightPosition, 1.0);
    const lightPosView = vec4.create();
    vec4.transformMat4(lightPosView, lightPos4, mvMatrix);
    const lightPosViewArr = [lightPosView[0], lightPosView[1], lightPosView[2]];

    // ── Рендер сцены ──────────────────────────────────────────────────────────
    gl.depthMask(true);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(shaderProgram);

    for (const obj of sceneObjects) {
        bindAttrib(shaderProgram, "aVertexPosition", obj.vertexBuffer,   3);
        bindAttrib(shaderProgram, "aVertexNormal",   obj.normalBuffer,   3);
        bindAttrib(shaderProgram, "aTexCoord",       obj.texCoordBuffer, 2);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);

        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uMVMatrix"), false, mvMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uPMatrix"),  false, prMatrix);
        gl.uniform3fv(gl.getUniformLocation(shaderProgram, "uLightPos"),             lightPosViewArr);
        gl.uniform3fv(gl.getUniformLocation(shaderProgram, "uLightColor"),           lightColor);
        gl.uniform1f(gl.getUniformLocation(shaderProgram,  "uAmbientStrength"),      ambientStrength);
        gl.uniform1f(gl.getUniformLocation(shaderProgram,  "uLinearAttenuation"),    linearAttenuation);
        gl.uniform1f(gl.getUniformLocation(shaderProgram,  "uQuadraticAttenuation"), quadraticAttenuation);
        bindTexture(shaderProgram, "uTexMaterial", obj.texMaterial, 0);

        gl.drawElements(gl.TRIANGLES, obj.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    // ── Рендер частиц ─────────────────────────────────────────────────────────
    gl.depthMask(false);
    for (const ps of particleSystems) {
        if (ps instanceof FireworkInstanced) {
            ps.update(dt, timestamp);
        } else if (ps instanceof MagicTrail) {
            ps.update(dt, mvMatrix, prMatrix);
        } else {
            ps.update(dt);
        }
        ps.draw(mvMatrix, prMatrix);
    }
    gl.depthMask(true);

    requestAnimationFrame(drawScene);
}

// Заглушка — системы частиц добавим в следующем файле
function initParticleSystems() {}

function handleKeyDown(event) {
    const moveSpeed = 0.3;
    const forward   = getForwardVector();
    const right     = getRightVector();

    switch (event.key) {
        case "w": cameraPosition = cameraPosition.map((v, i) => v + forward[i] * moveSpeed); break;
        case "s": cameraPosition = cameraPosition.map((v, i) => v - forward[i] * moveSpeed); break;
        case "a": cameraPosition[0] -= right[0] * moveSpeed; cameraPosition[2] -= right[2] * moveSpeed; break;
        case "d": cameraPosition[0] += right[0] * moveSpeed; cameraPosition[2] += right[2] * moveSpeed; break;
        case "ArrowUp":   ambientStrength = Math.min(ambientStrength + 0.05, 1); break;
        case "ArrowDown": ambientStrength = Math.max(ambientStrength - 0.05, 0); break;
        case "z": linearAttenuation += 0.01; break;
        case "x": linearAttenuation = Math.max(0, linearAttenuation - 0.01); break;
        case "c": quadraticAttenuation += 0.01; break;
        case "v": quadraticAttenuation = Math.max(0, quadraticAttenuation - 0.01); break;
       // case "i": useInstancing = !useInstancing; break;
        case "i":
            useInstancing = !useInstancing;
            document.getElementById("instancingStatus").textContent =
                "Instancing: " + (useInstancing ? "ON" : "OFF");
            break;
        }
}