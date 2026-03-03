"use strict";

var gl;
var shaderProgram;

var cubeVertexBuffer;
var cubeColorBuffer;
var cubeIndexBuffer;

var cubePosition = [0,0,0];
var cubeRotation = [0,0,0];
var cubeScale = 1.0;

function createInstructions() {
    if (document.getElementById("instructions")) return;

    const div = document.createElement("div");
    div.id = "instructions";
    div.style.fontFamily = "sans-serif";
    div.style.color = "#333";
    div.style.marginTop = "10px";

    div.innerHTML = `
        <h3>Управление кубом:</h3>
        <ul>
            <li>W / S — перемещение вперед / назад</li>
            <li>A / D — перемещение влево / вправо</li>
            <li>Q / E — вращение по оси Y</li>
            <li>R / F — вращение по оси X</li>
            <li>Z / X — увеличение / уменьшение масштаба</li>
        </ul>
    `;
    document.body.appendChild(div);
}

function start() {
    var canvas = document.getElementById("glcanvas");
    gl = initWebGL(canvas)

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    initShaders();
    initBuffers();

    window.addEventListener("keydown", handleKeyDown);

    createInstructions();

    requestAnimationFrame(drawScene);
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
    const vsSource = `#version 300 es
    in vec3 aVertexPosition;
    in vec4 aVertexColor;
    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;
    out vec4 vColor;
    void main() {
        gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition,1.0);
        vColor = aVertexColor;
    }`;

    const fsSource = `#version 300 es
    precision highp float;
    in vec4 vColor;
    out vec4 fragColor;
    void main() {
        fragColor = vColor;
    }`;

    shaderProgram = initShaderProgram(gl, vsSource, fsSource);
}

function loadShader(gl,type,source){
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function initShaderProgram(gl, vsSource, fsSource){
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program,vertexShader);
    gl.attachShader(program,fragmentShader);
    gl.linkProgram(program);
    return program;
}

function initBuffers(){
    const vertices = [
        // Передняя грань
        -1,-1, 1, 1,-1, 1, 1, 1, 1, -1,1,1,
        // Задняя
        -1,-1,-1, -1,1,-1, 1,1,-1, 1,-1,-1,
        // Верхняя
        -1,1,-1, -1,1,1, 1,1,1, 1,1,-1,
        // Нижняя
        -1,-1,-1, 1,-1,-1, 1,-1,1, -1,-1,1,
        // Правая
         1,-1,-1, 1,1,-1, 1,1,1, 1,-1,1,
        // Левая
        -1,-1,-1, -1,-1,1, -1,1,1, -1,1,-1
    ];
    cubeVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const faceColors = [
        [1,1,1,1], // передняя - белая
        [1,0,0,1], // задняя - красная
        [0,1,0,1], // верхняя - зелёная
        [0,0,1,1], // нижняя - синяя
        [1,1,0,1], // правая - жёлтая
        [1,0,1,1]  // левая - пурпурная
    ];

    var colors = [];
    for(var i=0;i<faceColors.length;i++){
        const c = faceColors[i];
        colors = colors.concat(c,c,c,c);
    }

    cubeColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    const indices = [
         0,1,2, 0,2,3,
         4,5,6, 4,6,7,
         8,9,10, 8,10,11,
        12,13,14, 12,14,15,
        16,17,18, 16,18,19,
        20,21,22, 20,22,23
    ];
    cubeIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
}

function createProjectionMatrix(){
    const fov = 45*Math.PI/180;
    const aspect = gl.canvas.width/gl.canvas.height;
    const prMatrix = mat4.create();
    mat4.perspective(prMatrix,fov,aspect,0.1,100.0);
    return prMatrix;
}

function drawScene(){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(shaderProgram);

    const prMatrix = createProjectionMatrix();
    let mvMatrix = mat4.create();

    //mat4.lookAt(mvMatrix, [2,0,-2], [0,0,0], [0,1,0]);
    mat4.lookAt(mvMatrix, [2, 0, -6], [0,0,0], [0,1,0]);

    mat4.translate(mvMatrix, mvMatrix, cubePosition);
    mat4.rotateX(mvMatrix, mvMatrix, cubeRotation[0]);
    mat4.rotateY(mvMatrix, mvMatrix, cubeRotation[1]);
    mat4.scale(mvMatrix, mvMatrix, [cubeScale,cubeScale,cubeScale]);

    var position = gl.getAttribLocation(shaderProgram,"aVertexPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
    gl.vertexAttribPointer(position,3,gl.FLOAT,false,0,0);
    gl.enableVertexAttribArray(position);

    var color = gl.getAttribLocation(shaderProgram,"aVertexColor");
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeColorBuffer);
    gl.vertexAttribPointer(color,4,gl.FLOAT,false,0,0);
    gl.enableVertexAttribArray(color);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);

    gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram,"uMVMatrix"), false, mvMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram,"uPMatrix"), false, prMatrix);

    gl.drawElements(gl.TRIANGLES,36,gl.UNSIGNED_SHORT,0);

    requestAnimationFrame(drawScene);
}


function handleKeyDown(event){
    const step = 0.1;
    const angleStep = 0.05;
    const scaleStep = 0.1;
    switch(event.key){
        case "w": cubePosition[2] += step; break;
        case "s": cubePosition[2] -= step; break;
        case "a": cubePosition[0] -= step; break;
        case "d": cubePosition[0] += step; break;
        case "q": cubeRotation[1] = (cubeRotation[1] - angleStep) % (2*Math.PI);; break;
        case "e": cubeRotation[1] = (cubeRotation[1] + angleStep) % (2*Math.PI); break;
        case "r": cubeRotation[0] = (cubeRotation[0] + angleStep) % (2*Math.PI);; break;
        case "f": cubeRotation[0] = (cubeRotation[0] - angleStep) % (2*Math.PI);; break;
        case "z": cubeScale += scaleStep; break;
        case "x": cubeScale = Math.max(0.1, cubeScale - scaleStep); break;
    }
}