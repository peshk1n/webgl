"use strict";

var gl;
var shaderDefault;
var shaderOrange;
var shaderBaseball;

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

const TEX_EXTENSIONS = [".png", ".jpg", ".jpeg"];
const TEX_BASE_PATH  = "src/textures/";

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
    const vsDefault = `#version 300 es
    in vec3 aVertexPosition;
    in vec3 aVertexNormal;
    in vec2 aTexCoord;

    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;

    out vec3 vFragPos;
    out vec3 vNormal;
    out vec2 vTexCoord;

    void main() {
        vFragPos = vec3(uMVMatrix * vec4(aVertexPosition, 1.0));
        vNormal = mat3(uMVMatrix) * aVertexNormal;
        vTexCoord = aTexCoord;
        gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    }`;

    const fsDefault = `#version 300 es
    precision highp float;

    in vec3 vFragPos;
    in vec3 vNormal;
    in vec2 vTexCoord;

    uniform vec3 uLightPos;
    uniform vec3 uLightColor;
    uniform float uAmbientStrength;
    uniform float uLinearAttenuation;
    uniform float uQuadraticAttenuation;

    uniform sampler2D uTexMaterial;

    out vec4 fragColor;

    void main() {
        vec3  norm = normalize(vNormal);
        vec3  lightDir = normalize(uLightPos - vFragPos);
        float diff = max(dot(norm, lightDir), 0.0);
        float dist = length(uLightPos - vFragPos);
        float atten = 1.0 / (1.0
            + uLinearAttenuation * dist
            + uQuadraticAttenuation * dist * dist);

        vec4 texColor = texture(uTexMaterial, vTexCoord);
        vec3 ambient = uAmbientStrength * uLightColor * texColor.rgb;
        vec3 diffuse = diff * uLightColor * texColor.rgb;

        fragColor = vec4(ambient + diffuse * atten, 1.0);
    }`;

    shaderDefault = initShaderProgram(gl, vsDefault, fsDefault);

    // (из лекции:)
    // x_gradient = pixel(x-1,y) - pixel(x+1,y)
    // y_gradient = pixel(x,y-1) - pixel(x,y+1)
    // New_Normal  = Normal + U * x_gradient + V * y_gradient
    const vsOrange = `#version 300 es
    in vec3 aVertexPosition;
    in vec3 aVertexNormal;
    in vec2 aTexCoord;
    in vec3 aTangent;
    in vec3 aBitangent;

    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;

    out vec3 vFragPos;
    out vec3 vNormal;
    out vec3 vTangent;
    out vec3 vBitangent;
    out vec2 vTexCoord;

    void main() {
        mat3 normalMatrix = mat3(uMVMatrix);
        vFragPos = vec3(uMVMatrix * vec4(aVertexPosition, 1.0));
        vNormal = normalize(normalMatrix * aVertexNormal);
        vTangent = normalize(normalMatrix * aTangent);
        vBitangent = normalize(normalMatrix * aBitangent);
        vTexCoord = aTexCoord;
        gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    }`;

    const fsOrange = `#version 300 es
    precision highp float;

    in vec3 vFragPos;
    in vec3 vNormal;
    in vec3 vTangent;
    in vec3 vBitangent;
    in vec2 vTexCoord;

    uniform vec3 uLightPos;
    uniform vec3 uLightColor;
    uniform vec3 uViewPos;
    uniform float uAmbientStrength;
    uniform float uLinearAttenuation;
    uniform float uQuadraticAttenuation;
    uniform float uBumpStrength;

    uniform sampler2D uTexBump;

    out vec4 fragColor;

    void main() {
        vec2 texSize = vec2(textureSize(uTexBump, 0));
        vec2 texStep = 1.0 / texSize;

        float left = texture(uTexBump, vTexCoord + vec2(-texStep.x, 0.0)).r;
        float right = texture(uTexBump, vTexCoord + vec2( texStep.x, 0.0)).r;
        float down = texture(uTexBump, vTexCoord + vec2(0.0, -texStep.y)).r;
        float up = texture(uTexBump, vTexCoord + vec2(0.0,  texStep.y)).r;

        float xGrad = left - right;   // pixel(x-1,y) - pixel(x+1,y)
        float yGrad = down - up;      // pixel(x,y-1) - pixel(x,y+1)

        // New_Normal = Normal + U * x_gradient + V * y_gradient
        vec3 bumpedNormal = normalize(
            vNormal
            + vTangent * xGrad * uBumpStrength
            + vBitangent * yGrad * uBumpStrength
        );

        // Phong
        vec3  lightDir = normalize(uLightPos - vFragPos);
        vec3  viewDir = normalize(uViewPos  - vFragPos);
        vec3  reflectDir = reflect(-lightDir, bumpedNormal);

        float dist  = length(uLightPos - vFragPos);
        float atten = 1.0 / (1.0
            + uLinearAttenuation * dist
            + uQuadraticAttenuation * dist * dist);

        vec3 orangeColor = vec3(1.0, 0.45, 0.0);   

        float diff  = max(dot(bumpedNormal, lightDir), 0.0);
        float spec  = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

        vec3 ambient  = uAmbientStrength * uLightColor * orangeColor;
        vec3 diffuse  = diff * atten     * uLightColor * orangeColor;
        vec3 specular = spec * atten     * uLightColor * vec3(0.5);

        fragColor = vec4(ambient + diffuse + specular, 1.0);
    }`;

    shaderOrange = initShaderProgram(gl, vsOrange, fsOrange);

    const vsBaseball = `#version 300 es
    in vec3 aVertexPosition;
    in vec3 aVertexNormal;
    in vec2 aTexCoord;
    in vec3 aTangent;
    in vec3 aBitangent;

    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;

    out vec3 vFragPos;
    out vec3 vNormal;
    out vec3 vTangent;
    out vec3 vBitangent;
    out vec2 vTexCoord;

    void main() {
        mat3 normalMatrix = mat3(uMVMatrix);
        vFragPos = vec3(uMVMatrix * vec4(aVertexPosition, 1.0));
        vNormal = normalize(normalMatrix * aVertexNormal);
        vTangent = normalize(normalMatrix * aTangent);
        vBitangent = normalize(normalMatrix * aBitangent);
        vTexCoord = aTexCoord;
        gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    }`;

    const fsBaseball = `#version 300 es
    precision highp float;

    in vec3 vFragPos;
    in vec3 vNormal;
    in vec3 vTangent;
    in vec3 vBitangent;
    in vec2 vTexCoord;

    uniform vec3 uLightPos;
    uniform vec3 uLightColor;
    uniform vec3 uViewPos;
    uniform float uAmbientStrength;
    uniform float uLinearAttenuation;
    uniform float uQuadraticAttenuation;

    uniform sampler2D uTexMaterial;
    uniform sampler2D uTexNormal;

    out vec4 fragColor;

    void main() {
        // [-1,1]
        vec3 normalFromMap = texture(uTexNormal, vTexCoord).rgb * 2.0 - 1.0;

        mat3 TBN = mat3(vTangent, vBitangent, vNormal);
        vec3 norm = normalize(TBN * normalFromMap);

        // Phong освещение
        vec3  lightDir = normalize(uLightPos - vFragPos);
        vec3  viewDir = normalize(uViewPos  - vFragPos);
        vec3  reflectDir = reflect(-lightDir, norm);

        float dist  = length(uLightPos - vFragPos);
        float atten = 1.0 / (1.0
            + uLinearAttenuation * dist
            + uQuadraticAttenuation * dist * dist);

        vec4  texColor = texture(uTexMaterial, vTexCoord);
        float diff = max(dot(norm, lightDir), 0.0);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

        vec3 ambient  = uAmbientStrength * uLightColor * texColor.rgb;
        vec3 diffuse  = diff * atten * uLightColor * texColor.rgb;
        vec3 specular = spec * atten * uLightColor * vec3(0.5);

        fragColor = vec4(ambient + diffuse + specular, 1.0);
    }`;

    shaderBaseball = initShaderProgram(gl, vsBaseball, fsBaseball);
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
        if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
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

function isPowerOf2(v) { return (v & (v - 1)) === 0; }

function loadTextureByName(name) {
    const url = TEX_BASE_PATH + name + TEX_EXTENSIONS[0];
    return loadTexture(url);
}


function computeTangents(vertices, texCoords, normals, indices) {
    const tangents = new Float32Array(vertices.length); // по 3 float на вершину
    const bitangents = new Float32Array(vertices.length);

    for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i], i1 = indices[i+1], i2 = indices[i+2];
        const p0 = [vertices[i0*3], vertices[i0*3+1], vertices[i0*3+2]];
        const p1 = [vertices[i1*3], vertices[i1*3+1], vertices[i1*3+2]];
        const p2 = [vertices[i2*3], vertices[i2*3+1], vertices[i2*3+2]];

        const uv0 = [texCoords[i0*2], texCoords[i0*2+1]];
        const uv1 = [texCoords[i1*2], texCoords[i1*2+1]];
        const uv2 = [texCoords[i2*2], texCoords[i2*2+1]];

        const e1 = p1.map((v,j) => v - p0[j]);
        const e2 = p2.map((v,j) => v - p0[j]);

        const dUV1 = [uv1[0]-uv0[0], uv1[1]-uv0[1]];
        const dUV2 = [uv2[0]-uv0[0], uv2[1]-uv0[1]];

        const det = dUV1[0]*dUV2[1] - dUV2[0]*dUV1[1];
        if (Math.abs(det) < 1e-8) continue;
        const f = 1.0 / det;

        const T = [
            f * (dUV2[1]*e1[0] - dUV1[1]*e2[0]),
            f * (dUV2[1]*e1[1] - dUV1[1]*e2[1]),
            f * (dUV2[1]*e1[2] - dUV1[1]*e2[2]),
        ];
        const B = [
            f * (-dUV2[0]*e1[0] + dUV1[0]*e2[0]),
            f * (-dUV2[0]*e1[1] + dUV1[0]*e2[1]),
            f * (-dUV2[0]*e1[2] + dUV1[0]*e2[2]),
        ];

        for (const idx of [i0, i1, i2]) {
            tangents[idx*3] += T[0]; tangents[idx*3+1] += T[1]; tangents[idx*3+2] += T[2];
            bitangents[idx*3] += B[0]; bitangents[idx*3+1] += B[1]; bitangents[idx*3+2] += B[2];
        }
    }

    const vertexCount = vertices.length / 3;
    for (let i = 0; i < vertexCount; i++) {
        const n = [normals[i*3], normals[i*3+1], normals[i*3+2]];
        let   t = [tangents[i*3], tangents[i*3+1], tangents[i*3+2]];

        // T = normalize(T - dot(T,N)*N)
        const dot = t[0]*n[0] + t[1]*n[1] + t[2]*n[2];
        t = t.map((v,j) => v - dot*n[j]);
        const lenT = Math.hypot(...t);
        if (lenT > 0) { t[0]/=lenT; t[1]/=lenT; t[2]/=lenT; }

        tangents[i*3] = t[0];
        tangents[i*3+1] = t[1];
        tangents[i*3+2] = t[2];

        const lenB = Math.hypot(bitangents[i*3], bitangents[i*3+1], bitangents[i*3+2]);
        if (lenB > 0) {
            bitangents[i*3] /= lenB;
            bitangents[i*3+1] /= lenB;
            bitangents[i*3+2] /= lenB;
        }
    }

    return { tangents, bitangents };
}

async function initBuffers() {
    const sceneObjs = await loadOBJ("src/scene.obj");

    for (const obj of sceneObjs) {
        const verts = new Float32Array(obj.vertices);
        const norms = new Float32Array(obj.normals);
        const uvs = new Float32Array(obj.texCoords);
        const idxs = new Uint16Array(obj.indices);

        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, norms, gl.STATIC_DRAW);

        const texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idxs, gl.STATIC_DRAW);

        let tangentBuffer = null;
        let bitangentBuffer = null;

        const name = obj.name.toLowerCase();
        const needsTangents = (name === "orange" || name === "baseball");

        if (needsTangents) {
            const { tangents, bitangents } = computeTangents(
                obj.vertices, obj.texCoords, obj.normals, obj.indices
            );

            tangentBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, tangents, gl.STATIC_DRAW);

            bitangentBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, bitangentBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, bitangents, gl.STATIC_DRAW);
        }

        let shader, textures;

        if (name === "orange") {
            shader = shaderOrange;
            textures = {
                texBump: loadTexture(TEX_BASE_PATH + "orange_bm.png"),
            };
        } else if (name === "baseball") {
            shader = shaderBaseball;
            textures = {
                texMaterial: loadTexture(TEX_BASE_PATH + "baseball.png"),
                texNormal: loadTexture(TEX_BASE_PATH + "baseball_nm.png"),
            };
        } else {
            shader = shaderDefault;
            textures = {
                texMaterial: loadTextureByName(obj.name),
            };
        }

        sceneObjects.push({
            vertexBuffer,
            normalBuffer,
            texCoordBuffer,
            tangentBuffer,
            bitangentBuffer,
            indexBuffer,
            indexCount: idxs.length,
            shader,
            textures,
        });
    }
}


async function loadOBJ(url) {
    const text = await (await fetch(url)).text();
    return parseOBJ(text);
}

function parseOBJ(text) {
    const lines = text.split("\n");

    const allPositions = [];
    const allTexCoords = [];
    const allNormals = [];
    const objects = [];

    let cur = null;
    let curName = "";

    function flush() {
        if (cur && cur.indices.length > 0) {
            cur.name = curName;
            objects.push(cur);
        }
    }

    function next(name) {
        flush();
        curName = name;
        cur = { vertices: [], texCoords: [], normals: [], indices: [] };
        cur.vertexMap = new Map();
    }

    next("__root__");

    function getVertexIndex(vi, ti, ni) {
        const key = `${vi}/${ti}/${ni}`;
        if (cur.vertexMap.has(key)) return cur.vertexMap.get(key);

        const index = cur.vertices.length / 3;
        cur.vertices.push(...allPositions[vi]);

        if (!isNaN(ti) && allTexCoords[ti]) {
            cur.texCoords.push(allTexCoords[ti][0], 1.0 - allTexCoords[ti][1]);
        } else {
            cur.texCoords.push(0, 0);
        }

        if (!isNaN(ni) && allNormals[ni]) {
            cur.normals.push(...allNormals[ni]);
        } else {
            cur.normals.push(0, 1, 0);
        }

        cur.vertexMap.set(key, index);
        return index;
    }

    for (const line of lines) {
        const p = line.trim().split(/\s+/);
        switch (p[0]) {
            case "o": next(p[1] || ""); break;
            case "v": allPositions.push([parseFloat(p[1]), parseFloat(p[2]), parseFloat(p[3])]); break;
            case "vt": allTexCoords.push([parseFloat(p[1]), parseFloat(p[2])]); break;
            case "vn": allNormals.push([parseFloat(p[1]), parseFloat(p[2]), parseFloat(p[3])]); break;
            case "f": {
                const face = p.slice(1);
                for (let i = 1; i < face.length - 1; i++) {
                    for (const tok of [face[0], face[i], face[i+1]]) {
                        const parts = tok.split("/");
                        const vi = parseInt(parts[0]) - 1;
                        const ti = parts[1] ? parseInt(parts[1]) - 1 : NaN;
                        const ni = parts[2] ? parseInt(parts[2]) - 1 : NaN;
                        cur.indices.push(getVertexIndex(vi, ti, ni));
                    }
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
    const fov = 45 * Math.PI / 180;
    const aspect = gl.canvas.width / gl.canvas.height;
    const prMatrix = mat4.create();
    mat4.perspective(prMatrix, fov, aspect, 0.1, 100.0);
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

function setLightUniforms(program, lightPosViewArr, viewPosArr) {
    gl.uniform3fv(gl.getUniformLocation(program, "uLightPos"), lightPosViewArr);
    gl.uniform3fv(gl.getUniformLocation(program, "uLightColor"), lightColor);
    gl.uniform1f(gl.getUniformLocation(program, "uAmbientStrength"), ambientStrength);
    gl.uniform1f(gl.getUniformLocation(program, "uLinearAttenuation"), linearAttenuation);
    gl.uniform1f(gl.getUniformLocation(program, "uQuadraticAttenuation"), quadraticAttenuation);
    const viewPosLoc = gl.getUniformLocation(program, "uViewPos");
    if (viewPosLoc) gl.uniform3fv(viewPosLoc, viewPosArr);
}

function drawScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const prMatrix = createProjectionMatrix();
    const mvMatrix = mat4.create();
    const forward = getForwardVector();
    const cameraTarget = cameraPosition.map((v, i) => v + forward[i]);
    mat4.lookAt(mvMatrix, cameraPosition, cameraTarget, [0, 1, 0]);

    const lightPos4 = vec4.fromValues(...lightPosition, 1.0);
    const lightPosView = vec4.create();
    vec4.transformMat4(lightPosView, lightPos4, mvMatrix);
    const lightPosViewArr = [lightPosView[0], lightPosView[1], lightPosView[2]];

    const viewPosArr = [0, 0, 0];
    for (const obj of sceneObjects) {
        const prog = obj.shader;
        gl.useProgram(prog);

        bindAttrib(prog, "aVertexPosition", obj.vertexBuffer,  3);
        bindAttrib(prog, "aVertexNormal", obj.normalBuffer, 3);
        bindAttrib(prog, "aTexCoord", obj.texCoordBuffer, 2);

        if (obj.tangentBuffer)   
            bindAttrib(prog, "aTangent",  obj.tangentBuffer,   3);
        if (obj.bitangentBuffer) bindAttrib(prog, "aBitangent"
            , obj.bitangentBuffer, 3);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);
        gl.uniformMatrix4fv(gl.getUniformLocation(prog, "uMVMatrix"), false, mvMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(prog, "uPMatrix"),  false, prMatrix);
        setLightUniforms(prog, lightPosViewArr, viewPosArr);

        const t = obj.textures;
        if (obj.shader === shaderOrange) {
            gl.uniform1f(gl.getUniformLocation(prog, "uBumpStrength"), 2.0);
            bindTexture(prog, "uTexBump", t.texBump, 0);
        } else if (obj.shader === shaderBaseball) {
            bindTexture(prog, "uTexMaterial", t.texMaterial, 0);
            bindTexture(prog, "uTexNormal",   t.texNormal,   1);
        } else {
            bindTexture(prog, "uTexMaterial", t.texMaterial, 0);
        }

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
        case "ArrowUp":   ambientStrength = Math.min(ambientStrength + 0.05, 1); break;
        case "ArrowDown": ambientStrength = Math.max(ambientStrength - 0.05, 0); break;
        case "z": linearAttenuation += 0.01; break;
        case "x": linearAttenuation = Math.max(0, linearAttenuation - 0.01); break;
        case "c": quadraticAttenuation += 0.01; break;
        case "v": quadraticAttenuation = Math.max(0, quadraticAttenuation - 0.01); break;
        case "b": {
            // uBumpStrength
            break;
        }
    }
}