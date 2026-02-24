"use strict";

var gl;
var shaderProgramSolid;     
var shaderProgramStriped;   

var pentagonBuffer;
var cubeBuffer;
var cubeIndexBuffer;
var stripedSquareBuffer;

function start() {
    var canvas = document.getElementById("glcanvas");
    gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("WebGL2 не поддерживается.");
        return;
    }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    initShaders();
    initBuffers();
    drawScene();
}

function initShaders() {
    const vsSourceSolid = `#version 300 es
    in vec3 aVertexPosition;
    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;
    void main() {
        gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    }`;
    
    const fsSourceSolid = `#version 300 es
    precision highp float;
    uniform vec4 uColor;
    out vec4 fragColor;
    void main() {
        fragColor = uColor;
    }`;

    shaderProgramSolid = initShaderProgram(gl, vsSourceSolid, fsSourceSolid);

    const vsSourceStriped = `#version 300 es
    in vec3 aVertexPosition;
    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;
    out vec3 vPosition;
    void main() {
        gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
        vPosition = aVertexPosition;
    }`;

    const fsSourceStriped = `#version 300 es
precision highp float;

in vec3 vPosition;
out vec4 fragColor;

void main() {
    float k = 10.0;
    int stripe = int((vPosition.x + 1.0) * k);
    if ((stripe % 2) == 0) {
        fragColor = vec4(0.0, 1.0, 1.0, 1.0);
    } else {
        fragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
}`;

    shaderProgramStriped = initShaderProgram(gl, vsSourceStriped, fsSourceStriped);
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
    let angle = 2 * Math.PI / 5;
    let pentagonVertices = [];
    for (let i = 0; i < 5; i++) {
        pentagonVertices.push(Math.cos(i * angle));
        pentagonVertices.push(Math.sin(i * angle));
        pentagonVertices.push(0.0);
    }
    pentagonBuffer = makeF32ArrayBuffer(gl, pentagonVertices);

    const cubeVertices = [
        -1,-1, 1,   1,-1, 1,   1, 1, 1,  -1, 1, 1,
        -1,-1,-1,  -1, 1,-1,   1, 1,-1,   1,-1,-1,
        -1, 1,-1,  -1, 1, 1,   1, 1, 1,   1, 1,-1,
        -1,-1,-1,   1,-1,-1,   1,-1, 1,  -1,-1, 1,
         1,-1,-1,   1, 1,-1,   1, 1, 1,   1,-1, 1,
        -1,-1,-1,  -1,-1, 1,  -1, 1, 1,  -1, 1,-1
    ];
    cubeBuffer = makeF32ArrayBuffer(gl, cubeVertices);

    const cubeIndices = [
         0,1,2, 0,2,3,       4,5,6, 4,6,7,
         8,9,10, 8,10,11,   12,13,14, 12,14,15,
        16,17,18, 16,18,19, 20,21,22, 20,22,23
    ];
    cubeIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeIndices), gl.STATIC_DRAW);

    const squareVertices = [
        -1, 1, 0,   1, 1, 0,   -1,-1,0,  1,-1,0
    ];
    stripedSquareBuffer = makeF32ArrayBuffer(gl, squareVertices);
}

function makeF32ArrayBuffer(gl, array) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(array), gl.STATIC_DRAW);
    return buffer;
}

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

    gl.useProgram(shaderProgramSolid);
    drawSolidObject(pentagonBuffer, prMatrix, [-3.0,0,-6], [1.0,0,0,1.0], gl.TRIANGLE_FAN, 5);

    const mvCube = mat4.create();
    mat4.translate(mvCube, mvCube, [0,0,-8]);
    mat4.rotateX(mvCube, mvCube, 0.4);
    mat4.rotateY(mvCube, mvCube, 0.4);
    drawSolidCube(cubeBuffer, cubeIndexBuffer, prMatrix, mvCube, [0.5,0.5,0.0,1.0]);

    gl.useProgram(shaderProgramStriped);
    drawStripedSquare(stripedSquareBuffer, prMatrix, [3.0,0,-6]);
}

function drawSolidObject(buffer, prMatrix, translation, color, mode, count) {
    var vertexPos = gl.getAttribLocation(shaderProgramSolid, "aVertexPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(vertexPos, 3, gl.FLOAT, false, 0,0);
    gl.enableVertexAttribArray(vertexPos);

    var uMV = gl.getUniformLocation(shaderProgramSolid, "uMVMatrix");
    var uP = gl.getUniformLocation(shaderProgramSolid, "uPMatrix");
    var uColor = gl.getUniformLocation(shaderProgramSolid, "uColor");

    let mv = mat4.create();
    mat4.translate(mv, mv, translation);

    gl.uniformMatrix4fv(uMV, false, mv);
    gl.uniformMatrix4fv(uP, false, prMatrix);
    gl.uniform4fv(uColor, color);

    gl.drawArrays(mode, 0, count);
}

function drawSolidCube(vertexBuffer, indexBuffer, prMatrix, mvMatrix, color) {
    var vertexPos = gl.getAttribLocation(shaderProgramSolid, "aVertexPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(vertexPos,3,gl.FLOAT,false,0,0);
    gl.enableVertexAttribArray(vertexPos);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    var uMV = gl.getUniformLocation(shaderProgramSolid, "uMVMatrix");
    var uP = gl.getUniformLocation(shaderProgramSolid, "uPMatrix");
    var uColor = gl.getUniformLocation(shaderProgramSolid, "uColor");

    gl.uniformMatrix4fv(uMV,false,mvMatrix);
    gl.uniformMatrix4fv(uP,false,prMatrix);
    gl.uniform4fv(uColor,color);

    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}

function drawStripedSquare(buffer, prMatrix, translation) {
    var vertexPos = gl.getAttribLocation(shaderProgramStriped, "aVertexPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(vertexPos,3,gl.FLOAT,false,0,0);
    gl.enableVertexAttribArray(vertexPos);

    var uMV = gl.getUniformLocation(shaderProgramStriped, "uMVMatrix");
    var uP = gl.getUniformLocation(shaderProgramStriped, "uPMatrix");

    let mv = mat4.create();
    mat4.translate(mv, mv, translation);

    gl.uniformMatrix4fv(uMV,false,mv);
    gl.uniformMatrix4fv(uP,false,prMatrix);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}