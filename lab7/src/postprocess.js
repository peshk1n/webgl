"use strict";

var shaderBrightPass, shaderBlurH, shaderBlurV, shaderComposite;
var shaderVignette, shaderGrain, shaderDOF, shaderLUT;
var shaderCopy;

// ═══════════════════════════════════════════════════════════════════════════════
// BLOOM
// ═══════════════════════════════════════════════════════════════════════════════

function initBloomShaders(gl) {
    const vsBright = `#version 300 es
    in vec2 aPosition; in vec2 aTexCoord;
    out vec2 vTexCoord;
    void main() { vTexCoord = aTexCoord; gl_Position = vec4(aPosition, 0.0, 1.0); }`;

    const fsBright = `#version 300 es
    precision highp float;
    in vec2 vTexCoord;
    uniform sampler2D uSceneTex;
    uniform float uThreshold;
    out vec4 fragColor;
    void main() {
        vec4 color = texture(uSceneTex, vTexCoord);
        float brightness = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        if (brightness > uThreshold) {
            fragColor = color;
        } else {
            fragColor = vec4(0.0);
        }
    }`;
    shaderBrightPass = initShaderProgram(gl, vsBright, fsBright);

    // Horizontal blur
    const vsBlur = `#version 300 es
    in vec2 aPosition; in vec2 aTexCoord;
    out vec2 vTexCoord;
    void main() { vTexCoord = aTexCoord; gl_Position = vec4(aPosition, 0.0, 1.0); }`;

    const fsBlurH = `#version 300 es
    precision highp float;
    in vec2 vTexCoord;
    uniform sampler2D uTex;
    uniform vec2 uTexelSize;
    uniform float uIntensity;
    out vec4 fragColor;
    void main() {
        vec3 result = vec3(0.0);
        float weights[5] = float[5](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
        for (int i = -4; i <= 4; i++) {
            float w = weights[abs(i)];
            result += texture(uTex, vTexCoord + vec2(uTexelSize.x * float(i) * uIntensity, 0.0)).rgb * w;
        }
        fragColor = vec4(result, 1.0);
    }`;
    shaderBlurH = initShaderProgram(gl, vsBlur, fsBlurH);

    // Vertical blur
    const fsBlurV = `#version 300 es
    precision highp float;
    in vec2 vTexCoord;
    uniform sampler2D uTex;
    uniform vec2 uTexelSize;
    uniform float uIntensity;
    out vec4 fragColor;
    void main() {
        vec3 result = vec3(0.0);
        float weights[5] = float[5](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
        for (int i = -4; i <= 4; i++) {
            float w = weights[abs(i)];
            result += texture(uTex, vTexCoord + vec2(0.0, uTexelSize.y * float(i) * uIntensity)).rgb * w;
        }
        fragColor = vec4(result, 1.0);
    }`;
    shaderBlurV = initShaderProgram(gl, vsBlur, fsBlurV);

    // Composite
    const fsComposite = `#version 300 es
    precision highp float;
    in vec2 vTexCoord;
    uniform sampler2D uSceneTex;
    uniform sampler2D uBloomTex;
    uniform float uBloomIntensity;
    out vec4 fragColor;
    void main() {
        vec3 scene = texture(uSceneTex, vTexCoord).rgb;
        vec3 bloom = texture(uBloomTex, vTexCoord).rgb;
        fragColor = vec4(scene + bloom * uBloomIntensity, 1.0);
    }`;
    shaderComposite = initShaderProgram(gl, vsBright, fsComposite);
}

function applyBloom(gl, sceneTex, outputFBO, params) {
    if (!params.enabled) return sceneTex;

    const halfSize = getHalfRenderSize();

    // brightFBO 1/2
    gl.bindFramebuffer(gl.FRAMEBUFFER, brightFBO.fbo);
    gl.viewport(0, 0, halfSize.width, halfSize.height);
    gl.useProgram(shaderBrightPass);
    bindTexture(gl, shaderBrightPass, "uSceneTex", sceneTex, 0);
    gl.uniform1f(gl.getUniformLocation(shaderBrightPass, "uThreshold"), params.threshold);
    drawFullscreenQuad(gl, shaderBrightPass);

    // 2. Horizontal blur -> blurFBO1
    gl.bindFramebuffer(gl.FRAMEBUFFER, blurFBO1.fbo);
    gl.viewport(0, 0, halfSize.width, halfSize.height);
    gl.useProgram(shaderBlurH);
    bindTexture(gl, shaderBlurH, "uTex", brightFBO.tex, 0);
    gl.uniform2f(gl.getUniformLocation(shaderBlurH, "uTexelSize"), 1.0 / halfSize.width, 1.0 / halfSize.height);
    gl.uniform1f(gl.getUniformLocation(shaderBlurH, "uIntensity"), 1.0);
    drawFullscreenQuad(gl, shaderBlurH);

    // 3. Vertical blur -> blurFBO2
    gl.bindFramebuffer(gl.FRAMEBUFFER, blurFBO2.fbo);
    gl.viewport(0, 0, halfSize.width, halfSize.height);
    gl.useProgram(shaderBlurV);
    bindTexture(gl, shaderBlurV, "uTex", blurFBO1.tex, 0);
    gl.uniform2f(gl.getUniformLocation(shaderBlurV, "uTexelSize"), 1.0 / halfSize.width, 1.0 / halfSize.height);
    gl.uniform1f(gl.getUniformLocation(shaderBlurV, "uIntensity"), 1.0);
    drawFullscreenQuad(gl, shaderBlurV);

    // 4. Composite -> outputFBO
    const size = getRenderSize();
    gl.bindFramebuffer(gl.FRAMEBUFFER, outputFBO.fbo);
    gl.viewport(0, 0, size.width, size.height);
    gl.useProgram(shaderComposite);
    bindTexture(gl, shaderComposite, "uSceneTex", sceneTex, 0);
    bindTexture(gl, shaderComposite, "uBloomTex", blurFBO2.tex, 1);
    gl.uniform1f(gl.getUniformLocation(shaderComposite, "uBloomIntensity"), params.intensity);
    drawFullscreenQuad(gl, shaderComposite);

    return outputFBO.tex;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIGNETTE
// ═══════════════════════════════════════════════════════════════════════════════

function initVignetteShader(gl) {
    const vs = `#version 300 es
    in vec2 aPosition; in vec2 aTexCoord;
    out vec2 vTexCoord;
    void main() { vTexCoord = aTexCoord; gl_Position = vec4(aPosition, 0.0, 1.0); }`;

    const fs = `#version 300 es
    precision highp float;
    in vec2 vTexCoord;
    uniform sampler2D uTex;
    uniform float uIntensity;
    out vec4 fragColor;
    void main() {
        vec3 color = texture(uTex, vTexCoord).rgb;
        vec2 uv = vTexCoord - 0.5;
        float dist = length(uv);
        float vignette = 1.0 - smoothstep(0.15, 0.85, dist) * uIntensity;
        fragColor = vec4(color * vignette, 1.0);
    }`;
    shaderVignette = initShaderProgram(gl, vs, fs);
}

function applyVignette(gl, inputTex, outputFBO, params) {
    if (!params.enabled) return inputTex;

    const size = getRenderSize();
    gl.bindFramebuffer(gl.FRAMEBUFFER, outputFBO.fbo);
    gl.viewport(0, 0, size.width, size.height);
    gl.useProgram(shaderVignette);
    bindTexture(gl, shaderVignette, "uTex", inputTex, 0);
    gl.uniform1f(gl.getUniformLocation(shaderVignette, "uIntensity"), params.intensity);
    drawFullscreenQuad(gl, shaderVignette);
    return outputFBO.tex;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRAIN
// ═══════════════════════════════════════════════════════════════════════════════

function initGrainShader(gl) {
    const vs = `#version 300 es
    in vec2 aPosition; in vec2 aTexCoord;
    out vec2 vTexCoord;
    void main() { vTexCoord = aTexCoord; gl_Position = vec4(aPosition, 0.0, 1.0); }`;

    const fs = `#version 300 es
    precision highp float;
    in vec2 vTexCoord;
    uniform sampler2D uTex;
    uniform float uIntensity;
    uniform float uTime;
    uniform vec2 uScreenSize;
    out vec4 fragColor;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
        vec3 color = texture(uTex, vTexCoord).rgb;
        vec2 uv = vTexCoord * uScreenSize;
        float noise = hash(uv + uTime * 100.0);
        float grain = (noise - 0.5) * uIntensity;
        fragColor = vec4(color + grain, 1.0);
    }`;
    shaderGrain = initShaderProgram(gl, vs, fs);
}

function applyGrain(gl, inputTex, outputFBO, params, time, screenSize) {
    if (!params.enabled) return inputTex;

    const size = getRenderSize();
    gl.bindFramebuffer(gl.FRAMEBUFFER, outputFBO.fbo);
    gl.viewport(0, 0, size.width, size.height);
    gl.useProgram(shaderGrain);
    bindTexture(gl, shaderGrain, "uTex", inputTex, 0);
    gl.uniform1f(gl.getUniformLocation(shaderGrain, "uIntensity"), params.intensity);
    gl.uniform1f(gl.getUniformLocation(shaderGrain, "uTime"), time);
    gl.uniform2f(gl.getUniformLocation(shaderGrain, "uScreenSize"), screenSize[0], screenSize[1]);
    drawFullscreenQuad(gl, shaderGrain);
    return outputFBO.tex;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPTH OF FIELD
// ═══════════════════════════════════════════════════════════════════════════════

function initDOFShader(gl) {
    const vs = `#version 300 es
    in vec2 aPosition; in vec2 aTexCoord;
    out vec2 vTexCoord;
    void main() { vTexCoord = aTexCoord; gl_Position = vec4(aPosition, 0.0, 1.0); }`;

    const fs = `#version 300 es
    precision highp float;
    in vec2 vTexCoord;
    uniform sampler2D uSceneTex;
    uniform sampler2D uDepthTex;
    uniform float uFocusDistance;
    uniform float uBlurStrength;
    uniform vec2 uTexelSize;
    out vec4 fragColor;

    void main() {
        vec3 color = texture(uSceneTex, vTexCoord).rgb;
        float depth = texture(uDepthTex, vTexCoord).r;

        // depth is already view-space distance, no linearization needed
        float coc = abs(depth - uFocusDistance) * uBlurStrength / max(depth, 0.5);
        coc = clamp(coc, 0.0, 15.0);

        if (coc < 0.15) {
            fragColor = vec4(color, 1.0);
            return;
        }

        vec3 blurred = vec3(0.0);
        int samples = 8;
        for (int i = 0; i < 8; i++) {
            float angle = float(i) * 2.399963;
            float r = coc * (float(i) + 0.5) / float(samples);
            vec2 offset = vec2(cos(angle), sin(angle)) * r * uTexelSize;
            blurred += texture(uSceneTex, vTexCoord + offset).rgb;
        }
        blurred /= float(samples);
        fragColor = vec4(blurred, 1.0);
    }`;
    shaderDOF = initShaderProgram(gl, vs, fs);
}

function applyDOF(gl, sceneTex, depthTex, outputFBO, params) {
    if (!params.enabled) return sceneTex;

    const size = getRenderSize();
    gl.bindFramebuffer(gl.FRAMEBUFFER, outputFBO.fbo);
    gl.viewport(0, 0, size.width, size.height);
    gl.useProgram(shaderDOF);
    bindTexture(gl, shaderDOF, "uSceneTex", sceneTex, 0);
    bindTexture(gl, shaderDOF, "uDepthTex", depthTex, 1);
    gl.uniform1f(gl.getUniformLocation(shaderDOF, "uFocusDistance"), params.focusDistance);
    gl.uniform1f(gl.getUniformLocation(shaderDOF, "uBlurStrength"), params.blurStrength);
    gl.uniform2f(gl.getUniformLocation(shaderDOF, "uTexelSize"), 1.0 / size.width, 1.0 / size.height);
    drawFullscreenQuad(gl, shaderDOF);
    return outputFBO.tex;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLOR GRADING (LUT)
// ═══════════════════════════════════════════════════════════════════════════════

var lutTexture;

function createLUTTexture(gl) {
    const lutSize = 64;
    const width = lutSize;
    const height = lutSize * lutSize;
    const L = 32;
    const texW = L;
    const texH = L * L;
    const data = new Uint8Array(texW * texH * 4);

    for (let b = 0; b < L; b++) {
        for (let g = 0; g < L; g++) {
            for (let r = 0; r < L; r++) {
                const x = r;
                const y = g + b * L;
                const idx = (y * texW + x) * 4;

                let cr = r / (L - 1);
                let cg = g / (L - 1);
                let cb = b / (L - 1);

                cr = cr < 0.5 ? 2.0 * cr * cr : 1.0 - Math.pow(-2.0 * cr + 2.0, 2.0) / 2.0;
                cg = cg < 0.5 ? 2.0 * cg * cg : 1.0 - Math.pow(-2.0 * cg + 2.0, 2.0) / 2.0;
                cb = cb < 0.5 ? 2.0 * cb * cb : 1.0 - Math.pow(-2.0 * cb + 2.0, 2.0) / 2.0;
               
                cr = cr * 1.08 + 0.02;
                cg = cg * 1.03;
                cb = cb * 0.92 + 0.01;

                cr = cr * 0.95 + 0.01;
                cg = cg * 0.95 + 0.01;
                cb = cb * 0.95 + 0.01;

                data[idx]   = Math.min(255, Math.max(0, Math.floor(cr * 255)));
                data[idx+1] = Math.min(255, Math.max(0, Math.floor(cg * 255)));
                data[idx+2] = Math.min(255, Math.max(0, Math.floor(cb * 255)));
                data[idx+3] = 255;
            }
        }
    }

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texW, texH, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
}

function initLUTShader(gl) {
    const vs = `#version 300 es
    in vec2 aPosition; in vec2 aTexCoord;
    out vec2 vTexCoord;
    void main() { vTexCoord = aTexCoord; gl_Position = vec4(aPosition, 0.0, 1.0); }`;

    const fs = `#version 300 es
    precision highp float;
    in vec2 vTexCoord;
    uniform sampler2D uSceneTex;
    uniform sampler2D uLUTTex;
    uniform float uIntensity;
    uniform float uLUTSize; // 32.0
    out vec4 fragColor;

    vec3 applyLUT(vec3 color) {
        float bSize = uLUTSize;
        float bSliceSize = bSize;

        vec3 clamped = clamp(color, 0.0, 1.0);
        float bIndex = clamped.b * (bSize - 1.0);

        float bFloor = floor(bIndex);
        float bFrac = bIndex - bFloor;

        float cellR = clamped.r * (bSize - 1.0);
        float cellG = clamped.g * (bSize - 1.0);

        float x1 = (cellR + 0.5) / bSize;
        float y1 = (cellG + bFloor * bSize + 0.5) / (bSize * bSize);

        float x2 = (cellR + 0.5) / bSize;
        float y2 = (cellG + (bFloor + 1.0) * bSize + 0.5) / (bSize * bSize);

        vec3 lut1 = texture(uLUTTex, vec2(x1, y1)).rgb;
        vec3 lut2 = texture(uLUTTex, vec2(x2, y2)).rgb;
        return mix(lut1, lut2, bFrac);
    }

    void main() {
        vec3 color = texture(uSceneTex, vTexCoord).rgb;
        vec3 lutColor = applyLUT(color);
        fragColor = vec4(mix(color, lutColor, uIntensity), 1.0);
    }`;
    shaderLUT = initShaderProgram(gl, vs, fs);
}

function applyLUT(gl, inputTex, outputFBO, params) {
    if (!params.enabled) return inputTex;

    const size = getRenderSize();
    gl.bindFramebuffer(gl.FRAMEBUFFER, outputFBO.fbo);
    gl.viewport(0, 0, size.width, size.height);
    gl.useProgram(shaderLUT);
    bindTexture(gl, shaderLUT, "uSceneTex", inputTex, 0);
    bindTexture(gl, shaderLUT, "uLUTTex", lutTexture, 1);
    gl.uniform1f(gl.getUniformLocation(shaderLUT, "uIntensity"), params.intensity);
    gl.uniform1f(gl.getUniformLocation(shaderLUT, "uLUTSize"), 32.0);
    drawFullscreenQuad(gl, shaderLUT);
    return outputFBO.tex;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COPY (passthrough)
// ═══════════════════════════════════════════════════════════════════════════════

function initCopyShader(gl) {
    const vs = `#version 300 es
    in vec2 aPosition; in vec2 aTexCoord;
    out vec2 vTexCoord;
    void main() { vTexCoord = aTexCoord; gl_Position = vec4(aPosition, 0.0, 1.0); }`;

    const fs = `#version 300 es
    precision highp float;
    in vec2 vTexCoord;
    uniform sampler2D uTex;
    out vec4 fragColor;
    void main() { fragColor = texture(uTex, vTexCoord); }`;
    shaderCopy = initShaderProgram(gl, vs, fs);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INIT ALL
// ═══════════════════════════════════════════════════════════════════════════════

function initPostProcess(gl) {
    initBloomShaders(gl);
    initVignetteShader(gl);
    initGrainShader(gl);
    initDOFShader(gl);
    initLUTShader(gl);
    initCopyShader(gl);
    lutTexture = createLUTTexture(gl);
}
