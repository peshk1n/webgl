"use strict";

var gl;
var shaderProgram;
var shaderProgramScene;

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

// let numberWeight   = 0.4;
// let materialWeight = 0.4;
// let colorWeight    = 0.2;
let texBalance  = 0.5; // 0 = только материал, 1 = только номер
let colorWeight = 0.2; // 0 = нет цвета, 1 = только цвет

let isMouseDown = false;
let lastMouseX = 0, lastMouseY = 0;

// ─── Описание кубов пьедестала ────────────────────────────────────────────────
// position — центр куба, size — сторона, numberTex — файл текстуры с цифрой
// color — RGB цвет объекта
const CUBE_DEFS = [
    { position: [ 0.0, 1.5,  0.0], size: 1, numberTex: "src/textures/1.png", color: [1, 0, 0] }, // верхний
    { position: [-0.6, 0.5,  0.0], size: 1, numberTex: "src/textures/2.png", color: [0, 1, 0] }, // нижний левый
    { position: [ 0.6, 0.5,  0.0], size: 1, numberTex: "src/textures/3.png", color: [0, 0, 1] }, // нижний правый
];

// ─── Текстуры для объектов сцены: ищем по имени автоматически ─────────────────
// Порядок расширений — первое найденное выигрывает
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
    // ── Шейдер для кубов: цвет + номер + материал ─────────────────────────────
    const vsCube = `#version 300 es
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

    const fsCube = `#version 300 es
    precision highp float;

    in vec3 vFragPos;
    in vec3 vNormal;
    in vec2 vTexCoord;

    uniform vec3  uLightPos;
    uniform vec3  uLightColor;
    uniform float uAmbientStrength;
    uniform float uLinearAttenuation;
    uniform float uQuadraticAttenuation;
    uniform vec3  uObjectColor;

    uniform sampler2D uTexNumber;
    uniform sampler2D uTexMaterial;

    uniform float uTexBalance;  
    uniform float uColorWeight;

    out vec4 fragColor;

    void main() {
        vec3  norm     = normalize(vNormal);
        vec3  lightDir = normalize(uLightPos - vFragPos);
        float diff     = max(dot(norm, lightDir), 0.0);
        float dist     = length(uLightPos - vFragPos);
        float atten    = 1.0 / (1.0
            + uLinearAttenuation    * dist
            + uQuadraticAttenuation * dist * dist);

        vec4 texNum  = texture(uTexNumber,   vTexCoord);
        vec4 texMat  = texture(uTexMaterial, vTexCoord);
        vec4 col     = vec4(uObjectColor, 1.0);

        vec4 texBlend  = mix(texMat, texNum, uTexBalance);
        vec4 baseColor = mix(texBlend, col, uColorWeight);

        vec3 ambient = uAmbientStrength * uLightColor * baseColor.rgb;
        vec3 diffuse = diff             * uLightColor * baseColor.rgb;

        fragColor = vec4(ambient + diffuse * atten, 1.0);
    }`;

    shaderProgram = initShaderProgram(gl, vsCube, fsCube);

    // ── Шейдер для объектов сцены: текстура по имени + освещение ──────────────
    const vsScene = `#version 300 es
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

    const fsScene = `#version 300 es
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

        fragColor = vec4(ambient + diffuse * atten, 1.0);
    }`;

    shaderProgramScene = initShaderProgram(gl, vsScene, fsScene);
}

// ─── Загрузка текстуры ────────────────────────────────────────────────────────
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

// ─── Автопоиск текстуры по имени объекта ─────────────────────────────────────
// Пробуем TEX_EXTENSIONS по очереди; грузим первый вариант (браузер сам сообщит об ошибке)
function loadTextureByName(name) {
    // Просто берём первое расширение — если не найдёт, в консоли будет warn
    // Для надёжности можно перебрать через fetch+HEAD, но это усложняет код
    const url = TEX_BASE_PATH + name + TEX_EXTENSIONS[0];
    return loadTexture(url);
}

// ─── Создание меша куба 1×1×1 с правильными UV (каждая грань = вся текстура) ──
function createCubeMesh(cx, cy, cz, size) {
    const h = size / 2;
    const x0 = cx - h, x1 = cx + h;
    const y0 = cy - h, y1 = cy + h;
    const z0 = cz - h, z1 = cz + h;

    // Каждая грань — 4 вершины, UV от (0,0) до (1,1)
    // Порядок: position(3) затем normal(3) затем uv(2)
    const faces = [
        // +Y (верх)
        { verts: [[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]], n:[0,1,0] },
        // -Y (низ)
        { verts: [[x0,y0,z1],[x1,y0,z1],[x1,y0,z0],[x0,y0,z0]], n:[0,-1,0] },
        // +Z (перед)
        { verts: [[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]], n:[0,0,1] },
        // -Z (зад)
        { verts: [[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0]], n:[0,0,-1] },
        // +X (право)
        { verts: [[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1]], n:[1,0,0] },
        // -X (лево)
        { verts: [[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]], n:[-1,0,0] },
    ];

    //const uvs = [[0,0],[1,0],[1,1],[0,1]];
    const uvs = [[0,1],[1,1],[1,0],[0,0]];

    const vertices  = [];
    const normals   = [];
    const texCoords = [];
    const indices   = [];

    for (const face of faces) {
        const base = vertices.length / 3;
        for (let k = 0; k < 4; k++) {
            vertices.push(...face.verts[k]);
            normals.push(...face.n);
            texCoords.push(...uvs[k]);
        }
        // Два треугольника на грань
        indices.push(base, base+1, base+2, base, base+2, base+3);
    }

    return {
        vertices:  new Float32Array(vertices),
        normals:   new Float32Array(normals),
        texCoords: new Float32Array(texCoords),
        indices:   new Uint16Array(indices),
    };
}

// ─── Создать GPU-буферы из меша ───────────────────────────────────────────────
function uploadMesh(mesh) {
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.texCoords, gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    return { vertexBuffer, normalBuffer, texCoordBuffer, indexBuffer, indexCount: mesh.indices.length };
}

async function initBuffers() {
    // ── Кубы пьедестала — программные ─────────────────────────────────────────
    const cubeMaterialTex = loadTexture("src/textures/texture1.jpg");

    for (const def of CUBE_DEFS) {
        const [cx, cy, cz] = def.position;
        const mesh = createCubeMesh(cx, cy, cz, def.size);
        const bufs = uploadMesh(mesh);

        sceneObjects.push({
            ...bufs,
            color:       def.color,
            isCube:      true,
            texNumber:   loadTexture(def.numberTex),
            texMaterial: cubeMaterialTex,
        });
    }

    // ── Объекты сцены из OBJ — текстура ищется по имени объекта ───────────────
    const sceneObjs = await loadOBJ("src/scene.obj");

    for (const obj of sceneObjs) {
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.vertices), gl.STATIC_DRAW);

        //const normals      = computeNormals(obj.vertices, obj.indices);
        const normals = obj.normals;
        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

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
            isCube:      false,
            // Текстура по имени объекта: shoe → src/textures/shoe.png и т.д.
            texMaterial: loadTextureByName(obj.name),
        });
    }
}

function computeNormals(vertices, indices) {
    const normals = new Float32Array(vertices.length);
    for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i]*3, i1 = indices[i+1]*3, i2 = indices[i+2]*3;
        const v0 = [vertices[i0],   vertices[i0+1], vertices[i0+2]];
        const v1 = [vertices[i1],   vertices[i1+1], vertices[i1+2]];
        const v2 = [vertices[i2],   vertices[i2+1], vertices[i2+2]];
        const u  = v1.map((v,j) => v - v0[j]);
        const v_ = v2.map((v,j) => v - v0[j]);
        const n  = [
            u[1]*v_[2] - u[2]*v_[1],
            u[2]*v_[0] - u[0]*v_[2],
            u[0]*v_[1] - u[1]*v_[0],
        ];
        for (const idx of [i0, i1, i2]) {
            normals[idx]   += n[0];
            normals[idx+1] += n[1];
            normals[idx+2] += n[2];
        }
    }
    for (let i = 0; i < normals.length; i += 3) {
        const len = Math.hypot(normals[i], normals[i+1], normals[i+2]);
        if (len > 0) { normals[i]/=len; normals[i+1]/=len; normals[i+2]/=len; }
    }
    return normals;
}

async function loadOBJ(url) {
    const text = await (await fetch(url)).text();
    return parseOBJ(text);
}

// function parseOBJ(text) {
//     const lines        = text.split("\n");
//     const allPositions = [];
//     const allTexCoords = [];
//     const objects      = [];
//     let cur = null, curName = "";

//     function flush() {
//         if (cur && cur.indices.length > 0) {
//             cur.name = curName;
//             objects.push(cur);
//         }
//     }
//     function next(name) {
//         flush();
//         curName = name;
//         cur = { vertices: [], texCoords: [], indices: [] };
//     }

//     next("__root__");

//     for (const line of lines) {
//         const p = line.trim().split(/\s+/);
//         switch (p[0]) {
//             case "o": next(p[1] || ""); break;
//             case "v": allPositions.push([parseFloat(p[1]), parseFloat(p[2]), parseFloat(p[3])]); break;
//             case "vt": allTexCoords.push([parseFloat(p[1]), parseFloat(p[2])]); break;
//             case "f": {
//                 const face = p.slice(1);
//                 for (let i = 1; i < face.length - 1; i++) {
//                     for (const tok of [face[0], face[i], face[i+1]]) {
//                         const [vi, ti] = tok.split("/").map(x => parseInt(x) - 1);
//                         cur.vertices.push(...allPositions[vi]);
//                         if (!isNaN(ti) && allTexCoords[ti]) {
//                             cur.texCoords.push(...allTexCoords[ti]);
//                         } else {
//                             const pos = allPositions[vi];
//                             cur.texCoords.push(pos[0] * 0.5, pos[1] * 0.5);
//                         }
//                         cur.indices.push(cur.indices.length);
//                     }
//                 }
//                 break;
//             }
//         }
//     }
//     flush();
//     return objects;
// }

function parseOBJ(text) {
    const lines = text.split("\n");

    const allPositions = [];
    const allTexCoords = [];
    const allNormals   = [];

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
        cur = {
            vertices: [],
            texCoords: [],
            normals: [],
            indices: []
        };
        cur.vertexMap = new Map(); 
    }

    next("__root__");

    function getVertexIndex(vi, ti, ni) {
        const key = `${vi}/${ti}/${ni}`;

        if (cur.vertexMap.has(key)) {
            return cur.vertexMap.get(key);
        }

        const index = cur.vertices.length / 3;

        // позиция
        cur.vertices.push(...allPositions[vi]);

        // UV (с фиксом переворота)
        if (!isNaN(ti) && allTexCoords[ti]) {
            cur.texCoords.push(
                allTexCoords[ti][0],
                1.0 - allTexCoords[ti][1] 
            );
        } else {
            cur.texCoords.push(0, 0);
        }

        // нормали
        if (!isNaN(ni) && allNormals[ni]) {
            cur.normals.push(...allNormals[ni]);
        } else {
            cur.normals.push(0, 1, 0); // fallback
        }

        cur.vertexMap.set(key, index);
        return index;
    }

    for (const line of lines) {
        const p = line.trim().split(/\s+/);

        switch (p[0]) {
            case "o":
                next(p[1] || "");
                break;

            case "v":
                allPositions.push([
                    parseFloat(p[1]),
                    parseFloat(p[2]),
                    parseFloat(p[3])
                ]);
                break;

            case "vt":
                allTexCoords.push([
                    parseFloat(p[1]),
                    parseFloat(p[2])
                ]);
                break;

            case "vn":
                allNormals.push([
                    parseFloat(p[1]),
                    parseFloat(p[2]),
                    parseFloat(p[3])
                ]);
                break;

            case "f": {
                const face = p.slice(1);

                for (let i = 1; i < face.length - 1; i++) {
                    for (const tok of [face[0], face[i], face[i + 1]]) {

                        const parts = tok.split("/");

                        const vi = parseInt(parts[0]) - 1;
                        const ti = parts[1] ? parseInt(parts[1]) - 1 : NaN;
                        const ni = parts[2] ? parseInt(parts[2]) - 1 : NaN;

                        const idx = getVertexIndex(vi, ti, ni);
                        cur.indices.push(idx);
                    }
                }
                break;
            }
        }
    }

    flush();

    // убираем служебное поле
    for (const obj of objects) {
        delete obj.vertexMap;
    }

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

function setLightUniforms(program, lightPosViewArr) {
    gl.uniform3fv(gl.getUniformLocation(program, "uLightPos"),             lightPosViewArr);
    gl.uniform3fv(gl.getUniformLocation(program, "uLightColor"),           lightColor);
    gl.uniform1f(gl.getUniformLocation(program,  "uAmbientStrength"),      ambientStrength);
    gl.uniform1f(gl.getUniformLocation(program,  "uLinearAttenuation"),    linearAttenuation);
    gl.uniform1f(gl.getUniformLocation(program,  "uQuadraticAttenuation"), quadraticAttenuation);
}

function drawScene() {
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

    for (const obj of sceneObjects) {
        const prog = obj.isCube ? shaderProgram : shaderProgramScene;
        gl.useProgram(prog);

        bindAttrib(prog, "aVertexPosition", obj.vertexBuffer,   3);
        bindAttrib(prog, "aVertexNormal",   obj.normalBuffer,   3);
        bindAttrib(prog, "aTexCoord",       obj.texCoordBuffer, 2);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);
        gl.uniformMatrix4fv(gl.getUniformLocation(prog, "uMVMatrix"), false, mvMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(prog, "uPMatrix"),  false, prMatrix);
        setLightUniforms(prog, lightPosViewArr);

        if (obj.isCube) {
            gl.uniform3fv(gl.getUniformLocation(prog, "uObjectColor"),    obj.color);
            gl.uniform1f(gl.getUniformLocation(prog, "uTexBalance"),  texBalance);
            gl.uniform1f(gl.getUniformLocation(prog, "uColorWeight"), colorWeight);
            bindTexture(prog, "uTexNumber",   obj.texNumber,   0);
            bindTexture(prog, "uTexMaterial", obj.texMaterial, 1);
        } else {
            bindTexture(prog, "uTexMaterial", obj.texMaterial, 0);
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
        case "n": texBalance  = Math.min(texBalance  + 0.05, 1); break; // больше номера
        case "m": texBalance  = Math.max(texBalance  - 0.05, 0); break; // больше материала
        case "j": colorWeight = Math.min(colorWeight + 0.05, 1); break; // больше цвета
        case "k": colorWeight = Math.max(colorWeight - 0.05, 0); break; // меньше цвета
    }
}