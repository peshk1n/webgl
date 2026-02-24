// "use strict";

// var gl;
// var shaderProgram;
// var squareBuffer;
// var triangleBuffer;

// //
// // 1. Получаем WebGL контекст
// //
// function start() {
//     var canvas = document.getElementById("glcanvas");
//     gl = initWebGL(canvas);

//     if (!gl) return;

//     gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
//     gl.clearColor(0.0, 0.0, 0.0, 1.0);
//     gl.enable(gl.DEPTH_TEST);
//     gl.depthFunc(gl.LEQUAL);

//     main();
// }

// function initWebGL(canvas) {
//     var names = ["webgl2", "webgl", "experimental-webgl"];
//     var context = null;

//     for (var i = 0; i < names.length; i++) {
//         try {
//             context = canvas.getContext(names[i]);
//         } catch(e) {}
//         if (context) break;
//     }

//     if (!context) {
//         alert("Unable to initialize WebGL.");
//     }

//     return context;
// }

// //
// // 2. Вершинный и фрагментный шейдеры
// //
// const vsSource = `
// attribute vec3 aVertexPosition;
// uniform mat4 uMVMatrix;
// uniform mat4 uPMatrix;

// void main(void) {
//     gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
// }
// `;

// const fsSource = `
// #ifdef GL_ES
// precision highp float;
// #endif

// void main(void) {
//     gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
// }
// `;

// //
// // Загрузка шейдеров
// //
// function loadShader(gl, type, source) {
//     const shader = gl.createShader(type);
//     gl.shaderSource(shader, source);
//     gl.compileShader(shader);

//     if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
//         alert("Shader compile error: " + gl.getShaderInfoLog(shader));
//         gl.deleteShader(shader);
//         return null;
//     }

//     return shader;
// }

// //
// // Создание программы шейдеров
// //
// function initShaderProgram(gl, vsSource, fsSource) {
//     const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
//     const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

//     const shaderProgram = gl.createProgram();
//     gl.attachShader(shaderProgram, vertexShader);
//     gl.attachShader(shaderProgram, fragmentShader);
//     gl.linkProgram(shaderProgram);

//     if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
//         alert("Unable to initialize shader program.");
//         return null;
//     }

//     return shaderProgram;
// }

// //
// // 4. Буферы вершин
// //
// function initBuffers() {

//     // Квадрат
//     var squareVertices = [
//          1.0,  1.0, 0.0,
//         -1.0,  1.0, 0.0,
//          1.0, -1.0, 0.0,
//         -1.0, -1.0, 0.0
//     ];

//     squareBuffer = makeF32ArrayBuffer(gl, squareVertices);

//     // Треугольник
//     var triangleVertices = [
//          0.0,  1.0, 0.0,
//         -1.0, -1.0, 0.0,
//          1.0, -1.0, 0.0
//     ];

//     triangleBuffer = makeF32ArrayBuffer(gl, triangleVertices);
// }

// function makeF32ArrayBuffer(gl, array) {
//     const buffer = gl.createBuffer();
//     gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
//     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(array), gl.STATIC_DRAW);
//     return buffer;
// }

// //
// // 3. Матрицы
// //
// function createPrMatrix() {
//     const fov = 45 * Math.PI / 180;
//     const aspect = gl.canvas.width / gl.canvas.height;
//     const near = 0.1;
//     const far = 100.0;
//     const f = 1.0 / Math.tan(fov/2);

//     const prMatrix = new Float32Array([
//         f/aspect,0,0,0,
//         0,f,0,0,
//         0,0,(far+near)/(near-far),-1,
//         0,0,(2*far*near)/(near-far),0
//     ]);

//     return prMatrix;
// }

// //
// // 5. Отрисовка

// function drawScene() {
//     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

//     gl.useProgram(shaderProgram);

//     var vertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");
//     gl.enableVertexAttribArray(vertexPosition);

//     var uMVMatrix = gl.getUniformLocation(shaderProgram, "uMVMatrix");
//     var uPMatrix = gl.getUniformLocation(shaderProgram, "uPMatrix");

//     var prMatrix = createPrMatrix();

//     gl.uniformMatrix4fv(uPMatrix, false, prMatrix);

//     // ===== КВАДРАТ (слева) =====
//     var mvSquare = new Float32Array([
//         1,0,0,0,
//         0,1,0,0,
//         0,0,1,0,
//         -2.0,0,-6,1
//     ]);

//     gl.uniformMatrix4fv(uMVMatrix, false, mvSquare);

//     gl.bindBuffer(gl.ARRAY_BUFFER, squareBuffer);
//     gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0);
//     // Поддерживает: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP
//     // gl.TRIANGLES, gl.TRIANGLE_STRIP, gl.TRIANGLE_FAN
//     // Не поддерживает: QUADS, POLYGON, QUAD_STRIP
//     gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);


//     // ===== ТРЕУГОЛЬНИК (справа) =====
//     var mvTriangle = new Float32Array([
//         1,0,0,0,
//         0,1,0,0,
//         0,0,1,0,
//         2.0,0,-6,1
//     ]);

//     gl.uniformMatrix4fv(uMVMatrix, false, mvTriangle);

//     gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
//     gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0);
//     gl.drawArrays(gl.TRIANGLES, 0, 3);
// }

// // function drawScene() {

// //     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
// //     gl.useProgram(shaderProgram);

// //     var vertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");
// //     gl.enableVertexAttribArray(vertexPosition);

// //     var uMVMatrix = gl.getUniformLocation(shaderProgram, "uMVMatrix");
// //     var uPMatrix = gl.getUniformLocation(shaderProgram, "uPMatrix");

// //     // Простая проекция без перспективы
// //     var prMatrix = new Float32Array([
// //         1,0,0,0,
// //         0,1,0,0,
// //         0,0,1,0,
// //         0,0,0,1
// //     ]);

// //     gl.uniformMatrix4fv(uPMatrix, false, prMatrix);

// //     gl.bindBuffer(gl.ARRAY_BUFFER, squareBuffer);
// //     gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0);

// //     function draw(mode, xShift) {

// //         var mvMatrix = new Float32Array([
// //             0.15,0,0,0,   // уменьшаем сильно
// //             0,0.15,0,0,
// //             0,0,1,0,
// //             xShift,0,0,1
// //         ]);

// //         gl.uniformMatrix4fv(uMVMatrix, false, mvMatrix);
// //         gl.drawArrays(mode, 0, 4);
// //     }

// //     // теперь большое расстояние
// //     draw(gl.POINTS,        -0.85);
// //     draw(gl.LINES,         -0.55);
// //     draw(gl.LINE_STRIP,    -0.25);
// //     draw(gl.LINE_LOOP,      0.05);
// //     draw(gl.TRIANGLES,      0.35);
// //     draw(gl.TRIANGLE_STRIP, 0.65);
// //     draw(gl.TRIANGLE_FAN,   0.95);
// // }

// //
// // MAIN
// //
// function main() {
//     shaderProgram = initShaderProgram(gl, vsSource, fsSource);
//     //initMatrices();
//     initBuffers();
//     drawScene();
// }

// ==========================================================
"use strict";

var gl;
var shaderProgram;
var squareBuffer;
var triangleBuffer;

function start() {
    var canvas = document.getElementById("glcanvas");
    gl = initWebGL(canvas);

    if (!gl) return;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    main();
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

const vsSource = `
attribute vec3 aVertexPosition;
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

void main(void) {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
}
`;

const fsSource = `
#ifdef GL_ES
precision highp float;
#endif

void main(void) {
    gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
}
`;

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("Shader compile error: " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Unable to initialize shader program.");
        return null;
    }

    return shaderProgram;
}

function initBuffers() {
    // Квадрат
    var squareVertices = [
         1.0,  1.0, 0.0,
        -1.0,  1.0, 0.0,
         1.0, -1.0, 0.0,
        -1.0, -1.0, 0.0
    ];
    squareBuffer = makeF32ArrayBuffer(gl, squareVertices);

    // Треугольник
    var triangleVertices = [
         0.0,  1.0, 0.0,
        -1.0, -1.0, 0.0,
         1.0, -1.0, 0.0
    ];
    triangleBuffer = makeF32ArrayBuffer(gl, triangleVertices);
}

function makeF32ArrayBuffer(gl, array) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(array), gl.STATIC_DRAW);
    return buffer;
}

function createPrMatrix() {
    const fov = 45 * Math.PI / 180;
    const aspect = gl.canvas.width / gl.canvas.height;
    const near = 0.1;
    const far = 100.0;

    let prMatrix = mat4.create();
    mat4.perspective(prMatrix, fov, aspect, near, far);
    return prMatrix;
}

function drawScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(shaderProgram);

    var vertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(vertexPosition);

    var uMVMatrix = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    var uPMatrix = gl.getUniformLocation(shaderProgram, "uPMatrix");

    var prMatrix = createPrMatrix();
    gl.uniformMatrix4fv(uPMatrix, false, prMatrix);

    let mvSquare = mat4.create();
    mat4.translate(mvSquare, mvSquare, [-2.0, 0, -6]);
    gl.uniformMatrix4fv(uMVMatrix, false, mvSquare);

    gl.bindBuffer(gl.ARRAY_BUFFER, squareBuffer);
    gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    let mvTriangle = mat4.create();
    mat4.translate(mvTriangle, mvTriangle, [2.0, 0, -6]);
    gl.uniformMatrix4fv(uMVMatrix, false, mvTriangle);

    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
    gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function main() {
    shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    initBuffers();
    drawScene();
}

