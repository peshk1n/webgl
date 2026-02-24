"use strict";

var gl;
var shaderProgram;

var cubeBuffer;
var cubeIndexBuffer;

var pedestalPosition = [0, 0, -8];
var cubeColors = [
    [1, 0, 0, 1],   // левый нижний
    [0, 1, 0, 1],   // средний нижний
    [0, 0, 1, 1],   // правый нижний
    [1, 1, 0, 1]    // верхний над средним
];

var cubeAngles = [0, 0, 0, 0];   
var pedestalAngle = 0;           
var globalAngle = 0;             

var keyState = {};              

start();

function start() {
    var canvas = document.getElementById("glcanvas");
    gl = canvas.getContext("webgl2");
    if (!gl) { alert("WebGL2 не поддерживается"); return; }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.enable(gl.DEPTH_TEST);

    initShaders();
    initBuffers();

    window.addEventListener('keydown', e => keyState[e.code] = true);
    window.addEventListener('keyup', e => keyState[e.code] = false);

    requestAnimationFrame(render);
}

function initShaders() {
    const vsSource = `#version 300 es
    in vec3 aVertexPosition;
    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;
    void main() {
        gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition,1.0);
    }`;

    const fsSource = `#version 300 es
    precision highp float;
    uniform vec4 uColor;
    out vec4 fragColor;
    void main() { fragColor = uColor; }`;

    shaderProgram = initShaderProgram(gl, vsSource, fsSource);
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
    const vs = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        alert("Program link error");
        return null;
    }
    return prog;
}

function initBuffers() {
    const cubeVertices = [
        -0.5,-0.5,0.5,  0.5,-0.5,0.5,  0.5,0.5,0.5, -0.5,0.5,0.5,
        -0.5,-0.5,-0.5, -0.5,0.5,-0.5,  0.5,0.5,-0.5, 0.5,-0.5,-0.5,
        -0.5,0.5,-0.5, -0.5,0.5,0.5,  0.5,0.5,0.5, 0.5,0.5,-0.5,
        -0.5,-0.5,-0.5, 0.5,-0.5,-0.5, 0.5,-0.5,0.5, -0.5,-0.5,0.5,
        0.5,-0.5,-0.5, 0.5,0.5,-0.5, 0.5,0.5,0.5, 0.5,-0.5,0.5,
        -0.5,-0.5,-0.5, -0.5,-0.5,0.5, -0.5,0.5,0.5, -0.5,0.5,-0.5
    ];
    cubeBuffer = makeF32ArrayBuffer(gl, cubeVertices);

    const cubeIndices = [
        0,1,2,0,2,3, 4,5,6,4,6,7, 8,9,10,8,10,11,
        12,13,14,12,14,15, 16,17,18,16,18,19, 20,21,22,20,22,23
    ];
    cubeIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeIndices), gl.STATIC_DRAW);
}

function makeF32ArrayBuffer(gl, array) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(array), gl.STATIC_DRAW);
    return buffer;
}

function render() {
    handleKeys();

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const prMatrix = mat4.create();
    const fov = Math.PI / 4;
    mat4.perspective(prMatrix, fov, gl.canvas.width / gl.canvas.height, 0.1, 100.0);

    gl.useProgram(shaderProgram);
    const vertexPos = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.vertexAttribPointer(vertexPos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vertexPos);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);

    const uMV = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    const uP = gl.getUniformLocation(shaderProgram, "uPMatrix");
    const uColor = gl.getUniformLocation(shaderProgram, "uColor");
    gl.uniformMatrix4fv(uP, false, prMatrix);

    const positions = [
        [-1, 0, 0], [0, 0, 0], [1, 0, 0],
        [0, 1, 0]
    ];

    let pedestalMatrix = mat4.create();
    mat4.translate(pedestalMatrix, pedestalMatrix, pedestalPosition);
    mat4.rotateY(pedestalMatrix, pedestalMatrix, pedestalAngle);

    let globalMatrix = mat4.create();
    mat4.rotateY(globalMatrix, globalMatrix, globalAngle);

    mat4.multiply(pedestalMatrix, globalMatrix, pedestalMatrix);

    for (let i = 0; i < 4; i++) {
        let mv = mat4.clone(pedestalMatrix);
        mat4.translate(mv, mv, positions[i]);
        mat4.rotateY(mv, mv, cubeAngles[i]);
        gl.uniformMatrix4fv(uMV, false, mv);
        gl.uniform4fv(uColor, cubeColors[i]);
        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
    }

    requestAnimationFrame(render);
}

function handleKeys() {
    const delta = 0.03;

    // глобальное вращение
    if (keyState['ArrowLeft']) globalAngle -= delta;
    if (keyState['ArrowRight']) globalAngle += delta;

    // вращение пьедестала
    if (keyState['KeyA']) pedestalAngle -= delta;
    if (keyState['KeyD']) pedestalAngle += delta;

    // вращение кубиков
    if (keyState['Digit1']) cubeAngles[0] += delta;
    if (keyState['Digit2']) cubeAngles[1] += delta;
    if (keyState['Digit3']) cubeAngles[2] += delta;
    if (keyState['Digit4']) cubeAngles[3] += delta;
}