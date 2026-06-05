"use strict";

// ── Geometry ──────────────────────────────────────────────────────

function createCubeMesh(cx, cy, cz, size) {
    const h = size / 2;
    const x0 = cx - h, x1 = cx + h;
    const y0 = cy - h, y1 = cy + h;
    const z0 = cz - h, z1 = cz + h;

    const faces = [
        { verts: [[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]], n:[ 0, 1, 0], uvs: [[0,0],[1,0],[1,1],[0,1]] },
        { verts: [[x0,y0,z1],[x1,y0,z1],[x1,y0,z0],[x0,y0,z0]], n:[ 0,-1, 0], uvs: [[0,0],[1,0],[1,1],[0,1]] },
        { verts: [[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]], n:[ 0, 0, 1], uvs: [[0,1],[1,1],[1,0],[0,0]] },
        { verts: [[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0]], n:[ 0, 0,-1], uvs: [[0,1],[1,1],[1,0],[0,0]] },
        { verts: [[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1]], n:[ 1, 0, 0], uvs: [[0,1],[1,1],[1,0],[0,0]] },
        { verts: [[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]], n:[-1, 0, 0], uvs: [[0,1],[1,1],[1,0],[0,0]] },
    ];

    const v = [], n = [], t = [], idx = [];
    for (let fi = 0; fi < faces.length; fi++) {
        const f = faces[fi];
        const base = v.length / 3;
        for (let i = 0; i < 4; i++) {
            v.push(...f.verts[i]);
            n.push(...f.n);
            t.push(...f.uvs[i]);
        }
        idx.push(base, base+1, base+2, base, base+2, base+3);
    }
    return { vertices: new Float32Array(v), normals: new Float32Array(n), texCoords: new Float32Array(t), indices: new Uint16Array(idx) };
}

function createSphereMesh(cx, cy, cz, radius, segments) {
    segments = segments || 32;
    const v = [], n = [], t = [], idx = [];
    for (let lat = 0; lat <= segments; lat++) {
        const theta = lat * Math.PI / segments;
        const sinT = Math.sin(theta), cosT = Math.cos(theta);
        for (let lon = 0; lon <= segments; lon++) {
            const phi = lon * 2 * Math.PI / segments;
            const sinP = Math.sin(phi), cosP = Math.cos(phi);
            const nx = cosP * sinT, ny = cosT, nz = sinP * sinT;
            v.push(cx + radius * nx, cy + radius * ny, cz + radius * nz);
            n.push(nx, ny, nz);
            t.push(lon / segments, lat / segments);
        }
    }
    for (let lat = 0; lat < segments; lat++) {
        for (let lon = 0; lon < segments; lon++) {
            const a = lat * (segments + 1) + lon;
            const b = a + segments + 1;
            idx.push(a, b, a + 1, b, b + 1, a + 1);
        }
    }
    return { vertices: new Float32Array(v), normals: new Float32Array(n), texCoords: new Float32Array(t), indices: new Uint16Array(idx) };
}

function createCylinderMesh(cx, cy, cz, radius, height, segments) {
    segments = segments || 32;
    const v = [], n = [], t = [], idx = [];
    const halfH = height / 2;
    for (let i = 0; i <= segments; i++) {
        const angle = i / segments * Math.PI * 2;
        const nx = Math.cos(angle), nz = Math.sin(angle);
        const x = cx + radius * nx, z = cz + radius * nz;
        const topY = cy + halfH, botY = cy - halfH;
        v.push(x, topY, z);  n.push(nx, 0, nz); t.push(i / segments, 1);
        v.push(x, botY, z);  n.push(nx, 0, nz); t.push(i / segments, 0);
    }
    for (let i = 0; i < segments; i++) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        idx.push(a, c, b, b, c, d);
    }
    // top cap
    const topBase = v.length / 3;
    v.push(cx, cy + halfH, cz); n.push(0, 1, 0); t.push(0.5, 0.5);
    for (let i = 0; i <= segments; i++) {
        const angle = i / segments * Math.PI * 2;
        v.push(cx + radius * Math.cos(angle), cy + halfH, cz + radius * Math.sin(angle));
        n.push(0, 1, 0); t.push(Math.cos(angle) * 0.5 + 0.5, Math.sin(angle) * 0.5 + 0.5);
    }
    for (let i = 0; i < segments; i++) idx.push(topBase, topBase + i + 1, topBase + i + 2);
    // bottom cap
    const botBase = v.length / 3;
    v.push(cx, cy - halfH, cz); n.push(0, -1, 0); t.push(0.5, 0.5);
    for (let i = 0; i <= segments; i++) {
        const angle = i / segments * Math.PI * 2;
        v.push(cx + radius * Math.cos(angle), cy - halfH, cz + radius * Math.sin(angle));
        n.push(0, -1, 0); t.push(Math.cos(angle) * 0.5 + 0.5, Math.sin(angle) * 0.5 + 0.5);
    }
    for (let i = 0; i < segments; i++) idx.push(botBase + i + 1, botBase, botBase + i + 2);
    return { vertices: new Float32Array(v), normals: new Float32Array(n), texCoords: new Float32Array(t), indices: new Uint16Array(idx) };
}

function createPlaneMesh(size) {
    const h = size / 2;
    return createCubeMesh(0, 0, 0, 1); // placeholder — use a large cube flattened or a custom quad
}

function createGroundPlane(size) {
    const h = size / 2;
    const v = [
        -h, 0, -h,  h, 0, -h,  h, 0,  h, -h, 0,  h
    ];
    const n = [0,1,0, 0,1,0, 0,1,0, 0,1,0];
    const t = [0,0, size/2,0, size/2,size/2, 0,size/2];
    const idx = [0,1,2, 0,2,3];
    return { vertices: new Float32Array(v), normals: new Float32Array(n), texCoords: new Float32Array(t), indices: new Uint16Array(idx) };
}

// ── Buffers ────────────────────────────────────────────────────────────
function uploadMesh(gl, mesh) {
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
    const nb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, nb); gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);
    const tb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, tb); gl.bufferData(gl.ARRAY_BUFFER, mesh.texCoords, gl.STATIC_DRAW);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    return { vertexBuffer: vb, normalBuffer: nb, texCoordBuffer: tb, indexBuffer: ib, indexCount: mesh.indices.length };
}

// ── shader ─────────────────────────────────────────────────────────────

var shaderScene;

function initSceneShader(gl) {
    const vs = `#version 300 es
    in vec3 aVertexPosition;
    in vec3 aVertexNormal;
    in vec2 aTexCoord;

    uniform mat4 uModelMatrix;
    uniform mat4 uViewMatrix;
    uniform mat4 uPMatrix;

    out vec3 vFragPos;
    out vec3 vNormal;
    out vec2 vTexCoord;

    void main() {
        vec4 worldPos = uModelMatrix * vec4(aVertexPosition, 1.0);
        vFragPos = vec3(uViewMatrix * worldPos);
        vNormal = mat3(uViewMatrix) * mat3(uModelMatrix) * aVertexNormal;
        vTexCoord = aTexCoord;
        gl_Position = uPMatrix * uViewMatrix * worldPos;
    }`;

    const fs = `#version 300 es
    precision highp float;

    in vec3 vFragPos;
    in vec3 vNormal;
    in vec2 vTexCoord;

    uniform vec3 uLightPos;
    uniform vec3 uLightColor;
    uniform float uAmbientStrength;
    uniform float uLinearAttenuation;
    uniform float uQuadraticAttenuation;
    uniform vec3 uObjectColor;
    uniform float uEmissive;
    uniform sampler2D uTexMaterial;

    layout(location = 0) out vec4 fragColor;
    layout(location = 1) out vec4 fragDepth;

    void main() {
        vec3 norm = normalize(vNormal);
        vec3 lightDir = normalize(uLightPos - vFragPos);
        float diff = max(dot(norm, lightDir), 0.0);
        float dist = length(uLightPos - vFragPos);
        float atten = 1.0 / (1.0 + uLinearAttenuation * dist + uQuadraticAttenuation * dist * dist);

        vec4 texColor = texture(uTexMaterial, vTexCoord);
        vec3 baseColor = uObjectColor * texColor.rgb;
        vec3 ambient = uAmbientStrength * uLightColor * baseColor;
        vec3 diffuse = diff * uLightColor * baseColor;
        vec3 emissive = uEmissive * baseColor;

        fragColor = vec4(ambient + diffuse * atten + emissive, 1.0);
        fragDepth = vec4(-vFragPos.z, 0.0, 0.0, 1.0);
    }`;

    shaderScene = initShaderProgram(gl, vs, fs);
}

// ── objects ────────────────────────────────────────────────────────────

var sceneObjects = [];

function initScene(gl) {
    initSceneShader(gl);

    const checkerTex = createCheckerTexture(gl, [0.25, 0.25, 0.35], [0.15, 0.15, 0.22]);
    const whiteTex = createSolidTexture(gl, [0.8, 0.8, 0.85]);
    const glowTex = createGlowTexture(gl);
    const darkTex = createSolidTexture(gl, [0.45, 0.48, 0.55]);
    const warmTex = createSolidTexture(gl, [0.9, 0.6, 0.3]);

    // Ground plane
    const ground = createGroundPlane(24);
    sceneObjects.push({
        mesh: uploadMesh(gl, ground),
        position: [0, -2, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: [0.5, 0.5, 0.55],
        emissive: 0.0,
        texture: checkerTex,
    });

    const cube = createCubeMesh(0, 0, 0, 1);
    const cubeMesh = uploadMesh(gl, cube);
    const cubePositions = [
        { pos: [-3.5, -1, -2.5], color: [0.3, 0.7, 0.3], emissive: 0.0 },
        { pos: [ 3.0, -1, -5.0], color: [0.8, 0.25, 0.25], emissive: 0.2 },
        { pos: [-2.5, 0, -6.0], color: [0.25, 0.5, 0.8], emissive: 0.0 },
        { pos: [ 2.0, -0.5, -1.5], color: [0.9, 0.7, 0.1], emissive: 0.1 },
    ];
    for (const cp of cubePositions) {
        sceneObjects.push({
            mesh: cubeMesh,
            position: cp.pos,
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            color: cp.color,
            emissive: cp.emissive,
            texture: darkTex,
        });
    }

    const sphere = createSphereMesh(0, 0.3, -3.5, 1.0, 48);
    sceneObjects.push({
        mesh: uploadMesh(gl, sphere),
        position: [0, 0.3, -3.5],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: [1.0, 0.85, 0.3],
        emissive: 0.8,
        texture: glowTex,
        isFocusTarget: true,
    });

    // Background 
    const cyl = createCylinderMesh(2.5, -0.2, -6.5, 0.6, 2.5, 32);
    sceneObjects.push({
        mesh: uploadMesh(gl, cyl),
        position: [2.5, -0.2, -6.5],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: [0.3, 0.35, 0.5],
        emissive: 0.05,
        texture: whiteTex,
    });

    // маленькие кубики и анимация
    for (let i = 0; i < 4; i++) {
        const smallCube = createCubeMesh(0, 0, 0, 0.35);
        sceneObjects.push({
            mesh: uploadMesh(gl, smallCube),
            orbitCenter: [0, 0.3, -3.5],
            orbitRadius: 1.8,
            orbitSpeed: 0.8 + i * 0.3,
            orbitPhase: i * Math.PI / 2,
            orbitAxis: i % 2 === 0 ? 'x' : 'y',
            color: [0.4 + i * 0.15, 0.7 - i * 0.1, 0.8 - i * 0.1],
            emissive: 0.3,
            texture: warmTex,
        });
    }

    // маленькие сферы 
    const smallSphere = createSphereMesh(0, 0, 0, 0.25, 24);
    const smallSMesh = uploadMesh(gl, smallSphere);
    const bloomSpheres = [
        { pos: [2.5, 0.8, -5.5], color: [0.2, 0.6, 1.0] },
        { pos: [-2.8, 1.2, -4.8], color: [1.0, 0.3, 0.3] },
        { pos: [1.5, 1.5, -6.0], color: [0.3, 1.0, 0.4] },
    ];
    for (const bs of bloomSpheres) {
        sceneObjects.push({
            mesh: smallSMesh,
            position: bs.pos,
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            color: bs.color,
            emissive: 1.5,
            texture: glowTex,
        });
    }
}

// ── textures ──────────────────────────────────────────────────────
function createSolidTexture(gl, color) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([color[0]*255, color[1]*255, color[2]*255, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
}

function createCheckerTexture(gl, color1, color2) {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            const c = ((Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0) ? color1 : color2;
            data[i] = c[0] * 255; data[i+1] = c[1] * 255; data[i+2] = c[2] * 255; data[i+3] = 255;
        }
    }
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    return tex;
}

function createGlowTexture(gl) {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    const cx = size / 2, cy = size / 2;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            const dist = Math.sqrt((x-cx)*(x-cx) + (y-cy)*(y-cy)) / (size/2);
            const v = Math.max(0, 1.0 - dist);
            const val = Math.floor(v * 255);
            data[i] = val; data[i+1] = val; data[i+2] = val; data[i+3] = val;
        }
    }
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
}

// ── Draw scene ───────────────────────────────────────────────────────────────

function drawScene(gl, viewMatrix, projMatrix, lightPosViewArr, time) {
    gl.useProgram(shaderScene);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

    for (const obj of sceneObjects) {
        bindAttrib(shaderScene, "aVertexPosition", obj.mesh.vertexBuffer, 3);
        bindAttrib(shaderScene, "aVertexNormal",   obj.mesh.normalBuffer, 3);
        bindAttrib(shaderScene, "aTexCoord",       obj.mesh.texCoordBuffer, 2);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.mesh.indexBuffer);

        // model matrix
        const modelMatrix = mat4.create();
        let worldPos = obj.position ? obj.position.slice() : [0, 0, 0];

        if (obj.orbitCenter) {
            const angle = obj.orbitPhase + time * obj.orbitSpeed;
            const r = obj.orbitRadius;
            if (obj.orbitAxis === 'x') {
                worldPos = [obj.orbitCenter[0], obj.orbitCenter[1] + Math.sin(angle) * r, obj.orbitCenter[2] + Math.cos(angle) * r];
            } else {
                worldPos = [obj.orbitCenter[0] + Math.cos(angle) * r, obj.orbitCenter[1] + Math.sin(angle) * r, obj.orbitCenter[2]];
            }
        }

        mat4.translate(modelMatrix, modelMatrix, worldPos);
        if (obj.rotation) {
            mat4.rotateX(modelMatrix, modelMatrix, obj.rotation[0]);
            mat4.rotateY(modelMatrix, modelMatrix, obj.rotation[1]);
            mat4.rotateZ(modelMatrix, modelMatrix, obj.rotation[2]);
        }
        if (obj.scale) mat4.scale(modelMatrix, modelMatrix, obj.scale);

        gl.uniformMatrix4fv(gl.getUniformLocation(shaderScene, "uModelMatrix"), false, modelMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderScene, "uViewMatrix"), false, viewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderScene, "uPMatrix"), false, projMatrix);
        gl.uniform3fv(gl.getUniformLocation(shaderScene, "uLightPos"), lightPosViewArr);
        gl.uniform3fv(gl.getUniformLocation(shaderScene, "uLightColor"), lightColor);
        gl.uniform1f(gl.getUniformLocation(shaderScene, "uAmbientStrength"), ambientStrength);
        gl.uniform1f(gl.getUniformLocation(shaderScene, "uLinearAttenuation"), linearAttenuation);
        gl.uniform1f(gl.getUniformLocation(shaderScene, "uQuadraticAttenuation"), quadraticAttenuation);
        gl.uniform3fv(gl.getUniformLocation(shaderScene, "uObjectColor"), obj.color || [1, 1, 1]);
        gl.uniform1f(gl.getUniformLocation(shaderScene, "uEmissive"), obj.emissive || 0.0);
        bindTexture(gl, shaderScene, "uTexMaterial", obj.texture, 0);

        gl.drawElements(gl.TRIANGLES, obj.mesh.indexCount, gl.UNSIGNED_SHORT, 0);
    }
}

function getFocusObjectViewZ(viewMatrix) {
    // Main sphere [0, 0.3, -3.5]
    const pos = vec4.fromValues(0, 0.3, -3.5, 1.0);
    const viewPos = vec4.create();
    vec4.transformMat4(viewPos, pos, viewMatrix);
    return Math.abs(viewPos[2]); 
}
