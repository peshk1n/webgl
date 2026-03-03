"use strict";

var gl;

var shaderProgramSquares;
var shaderProgramDiagonal;
var shaderProgramHorizontal;

var cubeBuffer;
var cubeIndexBuffer;

function start() {
    var canvas = document.getElementById("glcanvas");
    gl = initWebGL(canvas)

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    initShaders();
    initBuffers();
    drawScene();
}

function initWebGL(canvas) {
    var names = ["webgl2", "webgl", "experimental-webgl"];
    var context = null;

    for (var i = 0; i < names.length; i++) {
        try {
            context = canvas.getContext(names[i]);
        } catch(e) {}
        if (context) break;
    }

    if (!context) {
        alert("Unable to initialize WebGL.");
    }

    return context;
}

function initShaders() {
    // ===== ВЕРШИННЫЙ ШЕЙДЕР =====
    const vsSource = `#version 300 es
    in vec3 aVertexPosition;

    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;

    out vec3 vPosition;
    void main() {
        gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
        vPosition = aVertexPosition;
    }`;

    // ===== КВАДРАТИКИ =====
    const fsSquares = `#version 300 es
    precision highp float;
    in vec3 vPosition;
    out vec4 fragColor;

    void main() {
        float k = 5.0;
        int sum =
            int(vPosition.x * k) +
            int(vPosition.y * k) +
            int(vPosition.z * k);
        if ((sum - (sum / 2 * 2)) == 0) {
            fragColor = vec4(0.8, 0.8, 0.0, 1.0);
        } else {
            fragColor = vec4(0.5, 0.0, 0.0, 1.0);
        }
    }`;

    // ===== ДИАГОНАЛЬНАЯ ШТРИХОВКА =====
    const fsDiagonal = `#version 300 es
    precision highp float;

    in vec3 vPosition;
    out vec4 fragColor;
    void main() {
        float k = 15.0;
        float stripe = floor((vPosition.x + vPosition.y) * k);
        if (mod(stripe, 2.0) == 0.0) {
            fragColor = vec4(0.0, 0.7, 1.0, 1.0);
        } else {
            fragColor = vec4(1.0, 1.0, 1.0, 1.0);
        }
    }`;

    // ===== ГОРИЗОНТАЛЬНЫЕ ПОЛОСЫ =====
    const fsHorizontal = `#version 300 es
    precision highp float;

    in vec3 vPosition;
    out vec4 fragColor;
    void main() {
        float k = 10.0;
        float stripe = floor(vPosition.y * k);
        if (mod(stripe, 2.0) == 0.0) {
            fragColor = vec4(0.0, 1.0, 0.3, 1.0);
        } else {
            fragColor = vec4(0.0, 0.2, 0.0, 1.0);
        }
    }`;

    shaderProgramSquares = initShaderProgram(gl, vsSource, fsSquares);
    shaderProgramDiagonal = initShaderProgram(gl, vsSource, fsDiagonal);
    shaderProgramHorizontal = initShaderProgram(gl, vsSource, fsHorizontal);
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("Shader error: " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        alert("Program link error");
        return null;
    }

    return program;
}

function initBuffers() {
    const cubeVertices = [
        -1,-1, 1,   1,-1, 1,   1, 1, 1,  -1, 1, 1,
        -1,-1,-1,  -1, 1,-1,   1, 1,-1,   1,-1,-1,
        -1, 1,-1,  -1, 1, 1,   1, 1, 1,   1, 1,-1,
        -1,-1,-1,   1,-1,-1,   1,-1, 1,  -1,-1, 1,
         1,-1,-1,   1, 1,-1,   1, 1, 1,   1,-1, 1,
        -1,-1,-1,  -1,-1, 1,  -1, 1, 1,  -1, 1,-1
    ];

    //cubeBuffer = makeF32ArrayBuffer(gl, cubeVertices);
    cubeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeVertices), gl.STATIC_DRAW);

    const cubeIndices = [
         0,1,2, 0,2,3,
         4,5,6, 4,6,7,
         8,9,10, 8,10,11,
        12,13,14, 12,14,15,
        16,17,18, 16,18,19,
        20,21,22, 20,22,23
    ];

    cubeIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeIndices), gl.STATIC_DRAW);
}

// function makeF32ArrayBuffer(gl, array) {
//     const buffer = gl.createBuffer();
//     gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
//     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(array), gl.STATIC_DRAW);
//     return buffer;
// }

function createProjectionMatrix() {
    const fov = 45 * Math.PI/180;
    const aspect = gl.canvas.width / gl.canvas.height;
    const near = 0.1, far = 100.0;

    let prMatrix = mat4.create();
    mat4.perspective(prMatrix, fov, aspect, near, far);

    return prMatrix;
}

function drawScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const prMatrix = createProjectionMatrix();

    drawProceduralCube(shaderProgramSquares, [-4, 0, -8], prMatrix);
    drawProceduralCube(shaderProgramDiagonal, [0, 0, -8], prMatrix);
    drawProceduralCube(shaderProgramHorizontal, [4, 0, -8], prMatrix);
}

function drawProceduralCube(program, translation, prMatrix) {
    gl.useProgram(program);

    var vertexPos = gl.getAttribLocation(program, "aVertexPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.vertexAttribPointer(vertexPos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vertexPos);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);

    var uMV = gl.getUniformLocation(program, "uMVMatrix");
    var uP = gl.getUniformLocation(program, "uPMatrix");

    let mv = mat4.create();
    mat4.translate(mv, mv, translation);
    mat4.rotateX(mv, mv, 0.4);
    mat4.rotateY(mv, mv, 0.4);

    gl.uniformMatrix4fv(uMV, false, mv);
    gl.uniformMatrix4fv(uP, false, prMatrix);

    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}



// // ===== КВАДРАТИКИ =====
//     const fsSquares = `#version 300 es
//     precision highp float;

//     in vec3 vPosition;
//     out vec4 fragColor;

//     void main() {
//         float k = 5.0;
//         int sum = int(vPosition.x * k) +
//                   int(vPosition.y * k) +
//                   int(vPosition.z * k);

//         if ((sum - (sum / 2 * 2)) == 0) {
//             fragColor = vec4(0.8, 0.8, 0.0, 1.0);
//         } else {
//             fragColor = vec4(0.5, 0.0, 0.0, 1.0);
//         }
//     }`;

//     // ===== ДИАГОНАЛЬНАЯ ШТРИХОВКА =====
//     const fsDiagonal = `#version 300 es
//     precision highp float;

//     in vec3 vPosition;
//     out vec4 fragColor;

//     void main() {
//         float k = 15.0;
//         int stripe = int((vPosition.x + vPosition.y) * k);

//         if ((stripe - (stripe / 2 * 2)) == 0) {
//             fragColor = vec4(0.0, 0.7, 1.0, 1.0);
//         } else {
//             fragColor = vec4(1.0, 1.0, 1.0, 1.0);
//         }
//     }`;

//     // ===== ГОРИЗОНТАЛЬНЫЕ ПОЛОСЫ =====
//     const fsHorizontal = `#version 300 es
//     precision highp float;

//     in vec3 vPosition;
//     out vec4 fragColor;

//     void main() {
//         float k = 10.0;
//         int stripe = int(vPosition.y * k);

//         if ((stripe - (stripe / 2 * 2)) == 0) {
//             fragColor = vec4(0.0, 1.0, 0.3, 1.0);
//         } else {
//             fragColor = vec4(0.0, 0.2, 0.0, 1.0);
//         }
//     }`;


// const fsSquares = `#version 300 es
//     precision highp float;
//     in vec3 vPosition;
//     out vec4 fragColor;

//     void main() {
//         float k = 5.0;
//         float sum =
//             floor(vPosition.x * k) +
//             floor(vPosition.y * k) +
//             floor(vPosition.z * k);
//         if (mod(sum, 2.0) == 0.0) {
//             fragColor = vec4(0.8, 0.8, 0.0, 1.0);
//         } else {
//             fragColor = vec4(0.5, 0.0, 0.0, 1.0);
//         }
//     }`;