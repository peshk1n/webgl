"use strict";

// ═══════════════════════════════════════════════════════════════════════════════
// ШЕЙДЕРЫ ДЛЯ ЧАСТИЦ
// ═══════════════════════════════════════════════════════════════════════════════

let shaderParticle;       // обычный, GL_POINTS
let shaderParticleAdd;    // аддитивный 
let shaderParticleInst;   // инстансинг
let useInstancing = true;

function initParticleShaders() {

    // Обычный
    const vsParticle = `#version 300 es
    in vec3 aPosition;
    in vec4 aColor;
    in float aSize;

    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;

    out vec4 vColor;

    void main() {
        vColor = aColor;
        gl_Position = uPMatrix * uMVMatrix * vec4(aPosition, 1.0);
        gl_PointSize = aSize;
    }`;

    const fsParticle = `#version 300 es
    precision highp float;
    in vec4 vColor;
    out vec4 fragColor;

    void main() {
        // круг
        vec2  c = gl_PointCoord - 0.5;
        float dist = length(c);
        if (dist > 0.5) discard;
        float alpha = (1.0 - dist * 2.0) * vColor.a;
        fragColor = vec4(vColor.rgb, alpha);
    }`;

    shaderParticle = initShaderProgram(gl, vsParticle, fsParticle);
    shaderParticleAdd = initShaderProgram(gl, vsParticle, fsParticle); // тот же шейдер, разный blend

    // инстансинг
    const vsInst = `#version 300 es
    in vec2  aPosition; // вершина квада [-0.5..0.5]
    in vec3  aOffset;   // позиция экземпляра в мире
    in vec4  aColor;    // цвет экземпляра
    in float aSize;     // размер экземпляра

    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;
    uniform vec2 uScreenSize;

    out vec4 vColor;
    out vec2 vUV;

    void main() {
        vColor = aColor;
        vUV    = aPosition + 0.5;

        vec4 center = uPMatrix * uMVMatrix * vec4(aOffset, 1.0);
        // vec2 offset = aPosition * aSize * 0.01;
        // gl_Position = center + vec4(offset * center.w, 0.0, 0.0);
        vec2 offset = aPosition * aSize * 2.0 / uScreenSize;
        gl_Position = center + vec4(offset * center.w, 0.0, 0.0);
    }`;

    const fsInst = `#version 300 es
    precision highp float;
    in vec4 vColor;
    in vec2 vUV;
    out vec4 fragColor;

    void main() {
        vec2  c    = vUV - 0.5;
        float dist = length(c);
        if (dist > 0.5) discard;
        float alpha = (1.0 - dist * 2.0) * vColor.a;
        fragColor = vec4(vColor.rgb, alpha);
    }`;

    shaderParticleInst = initShaderProgram(gl, vsInst, fsInst);
}

// ═══════════════════════════════════════════════════════════════════════════════
// БАЗОВЫЙ КЛАСС 
// ═══════════════════════════════════════════════════════════════════════════════

class ParticleSystem {
    constructor(config) {
        this.position = config.position    || [0, 0, 0];
        this.maxParticles = config.maxParticles || 500;
        this.spawnRate = config.spawnRate   || 50;   // частиц/сек
        this.gravity = config.gravity     || -9.8;
        this.wind = config.wind        || [0, 0, 0];
        this.damping = config.damping     || 0.0;
        this.additive = config.additive    || false; // аддитивный blend
        this.spawnAccum = 0;

        this.particles = [];

        this.posBuffer = gl.createBuffer();
        this.colorBuffer = gl.createBuffer();
        this.sizeBuffer = gl.createBuffer();

        this._pos = new Float32Array(this.maxParticles * 3);
        this._color = new Float32Array(this.maxParticles * 4);
        this._size = new Float32Array(this.maxParticles);
    }

    spawnParticle() { return null; }

    update(dt) {
        this.spawnAccum += this.spawnRate * dt;
        while (this.spawnAccum >= 1 && this.particles.length < this.maxParticles) {
            const p = this.spawnParticle();
            if (p) this.particles.push(p);
            this.spawnAccum -= 1;
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) { this.particles.splice(i, 1); continue; }

            p.vel[1] += this.gravity * dt;
            p.vel[0] += this.wind[0] * dt;
            p.vel[2] += this.wind[2] * dt;
            p.vel[0] *= (1 - this.damping * dt);
            p.vel[1] *= (1 - this.damping * dt);
            p.vel[2] *= (1 - this.damping * dt);

            p.pos[0] += p.vel[0] * dt;
            p.pos[1] += p.vel[1] * dt;
            p.pos[2] += p.vel[2] * dt;

            this.updateParticle(p, dt);
        }

        const n = this.particles.length;
        for (let i = 0; i < n; i++) {
            const p = this.particles[i];
            this._pos[i*3]   = p.pos[0];
            this._pos[i*3+1] = p.pos[1];
            this._pos[i*3+2] = p.pos[2];
            this._color[i*4]   = p.color[0];
            this._color[i*4+1] = p.color[1];
            this._color[i*4+2] = p.color[2];
            this._color[i*4+3] = p.alpha;
            this._size[i] = p.size;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._pos.subarray(0, n*3), gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._color.subarray(0, n*4), gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._size.subarray(0, n), gl.DYNAMIC_DRAW);
    }

    updateParticle(p, dt) {}

    draw(mvMatrix, prMatrix) {
        const n = this.particles.length;
        if (n === 0) return;

        const prog = this.additive ? shaderParticleAdd : shaderParticle;
        gl.useProgram(prog);

        if (this.additive) {
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // аддитивный
        } else {
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }

        gl.uniformMatrix4fv(gl.getUniformLocation(prog, "uMVMatrix"), false, mvMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(prog, "uPMatrix"),  false, prMatrix);

        const bindA = (name, buf, size) => {
            const loc = gl.getAttribLocation(prog, name);
            if (loc < 0) return;
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(loc);
        };

        bindA("aPosition", this.posBuffer, 3);
        bindA("aColor",this.colorBuffer, 4);
        bindA("aSize", this.sizeBuffer, 1);

        gl.drawArrays(gl.POINTS, 0, n);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. БЕНГАЛЬСКИЙ ОГОНЬ
// ═══════════════════════════════════════════════════════════════════════════════

class Sparkler extends ParticleSystem {
    constructor(position) {
        super({
            position,
            maxParticles: 500,
            spawnRate: 200,
            gravity: -2.5, //-1.5,
            wind: [0.3, 0, 0],
            damping: 1.0,// 1.5,
            additive: true,
        });
    }

    // spawnParticle() {
    //     const angle  = Math.random() * Math.PI * 2;
    //     const speed  = 1.5 + Math.random() * 2.5;
    //     const spread = 0.4;
    //     const life = 0.3 + Math.random() * 0.5;
    //     return {
    //         pos:     [...this.position],
    //         vel:     [
    //             Math.cos(angle) * speed * spread + (Math.random()-0.5)*0.5,
    //             Math.sin(angle) * speed * spread + 1.0 + Math.random(),
    //             (Math.random()-0.5) * spread,
    //         ],
    //         life: life,
    //         maxLife: life, // 0.8
    //         color:   [1.0, 0.95, 0.7],
    //         alpha:   1.0,
    //         size:    4 + Math.random() * 4,
    //     };
    // }

    spawnParticle() {
        const angle = Math.random() * Math.PI * 2;
        const elev  = (Math.random()-0.5) * Math.PI; // вверх/вниз
        const speed = 2.0 + Math.random() * 3.5;
        const life = 0.3 + Math.random() * 0.5; 
        const sz = 10 + Math.random() * 8;
        return {
            pos: [...this.position],
            vel: [
                Math.cos(angle) * Math.cos(elev) * speed,
                Math.sin(elev)  * speed + 0.5,
                Math.sin(angle) * Math.cos(elev) * speed,
            ],
            life,
            maxLife: life,
            color: [1.0, 0.95, 0.7],
            alpha: 0.0,
            size: sz,
            _baseSize: sz,
        };
    }

    // updateParticle(p, dt) {
    //     const t = 1 - p.life / p.maxLife; // 0..1
    //     // Цвет: белый - жёлтый - оранжевый - красный
    //     p.color[0] = 1.0;
    //     p.color[1] = Math.max(0, 0.95 - t * 0.8);
    //     p.color[2] = Math.max(0, 0.7  - t * 0.7);
    //     p.alpha    = Math.min(1.0, p.life * 2.5);
    //     p.size     = Math.max(1, p.size - dt * 8);
    // }
    updateParticle(p, dt) {
        const t = 1 - p.life / p.maxLife;

        p.color[0] = 1.0;
        p.color[1] = Math.max(0, 0.95 - t * 1.0);
        p.color[2] = Math.max(0, 0.70 - t * 0.7);

        p.alpha = Math.sin(Math.PI * Math.pow(t, 0.25)) * 1.0;
        // уменьшение к старости
        p.size = p._baseSize * Math.max(0.05, 1.0 - t * t * 1.2);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ДЫМ
// ═══════════════════════════════════════════════════════════════════════════════

class Smoke extends ParticleSystem {
    constructor(position) {
        super({
            // position,
            // maxParticles: 200,
            // spawnRate:    20,
            // gravity:      0.3,  // лёгкий подъём
            // wind:         [0.2, 0, 0],
            // damping:      0.8,
            // additive:     false,
            position,
            maxParticles: 350,
            spawnRate: 35,
            gravity: 0.3,  
            wind: [0.2, 0, 0],
            damping: 0.8,
            additive: false,
        });
    }

    spawnParticle() {
        const life = 2.0 + Math.random() * 2.0;
        return {
            pos: [
                this.position[0] + (Math.random()-0.5)*0.3,
                this.position[1],
                this.position[2] + (Math.random()-0.5)*0.3,
            ],
            vel: [
                (Math.random()-0.5) * 0.3,
                0.5 + Math.random() * 0.5,
                (Math.random()-0.5) * 0.3,
            ],
            life: life,
            maxLife: life, 
            color: [0.6, 0.6, 0.6],
            alpha: 0.4,
            size: 18 + Math.random() * 20,  //  8+8//8 + Math.random() * 8,
        };
    }

    updateParticle(p, dt) {
        p.size  += dt * 6;
        //p.alpha  = Math.max(0, p.life * 0.12);
        const t = p.life / p.maxLife;
        p.alpha = t * 0.4;
        const g  = Math.min(1, 0.5 + (1 - p.life / p.maxLife) * 0.3);
        //p.color  = [g, g, g];
        p.color[0] = g;
        p.color[1] = g;
        p.color[2] = g; 
        p.vel[0] += (Math.random()-0.5) * 0.2 * dt;
        p.vel[2] += (Math.random()-0.5) * 0.2 * dt;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. ДОЖДЬ
// ═══════════════════════════════════════════════════════════════════════════════

class Rain extends ParticleSystem {
    constructor(position) {
        super({
            position,
            maxParticles: 800,
            spawnRate: 300,
            gravity: -20.0,
            wind: [0.5, 0, 0],
            damping: 0.0,
            additive: false,
        });
    }

    spawnParticle() {
        return {
            pos: [
                this.position[0] + (Math.random()-0.5) * 20,
                this.position[1] + 8 + Math.random() * 4,
                this.position[2] + (Math.random()-0.5) * 20,
            ],
            vel: [
                (Math.random()-0.5) * 0.2,
                -2.0 - Math.random(),
                (Math.random()-0.5) * 0.2
            ],
            life: 2.0 + Math.random(),
            maxLife: 3.0,
            color: [0.7, 0.85, 1.0],
            alpha: 0.6,
            size: 4, //2.5,
        };
    }

    updateParticle(p, dt) {
        const groundY = -1;
        if (p.pos[1] < groundY) {
            p.life = 0;
        }
        //p.alpha = 0.4 + p.life * 0.1;
        const t = p.life / p.maxLife;
        p.alpha = 0.3 + t * 0.3;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. ОБЛАКА 
// ═══════════════════════════════════════════════════════════════════════════════

class Steam extends ParticleSystem {
    constructor(position) {
        super({
            position,
            maxParticles: 300,
            spawnRate: 25,
            gravity: 0.00001,
            wind: [0.05, 0.02, 0.02],
            damping: 2.5,   
            additive: false,
        });
    }

    spawnParticle() {
        const isDetail = Math.random() < 0.4;  // мелкая/крупная
        const r = isDetail ? 0.6 : 1.4;
        const life = isDetail ? 2.0 + Math.random()*2 : 4.0 + Math.random()*3;
        const ox = (Math.random()-0.5)*r;
        const oz = (Math.random()-0.5)*r;
        const distFromCenter = Math.sqrt(ox*ox + oz*oz) / (r * 0.5);
        return {
            pos: [
                this.position[0] + (Math.random()-0.5)*r,
                this.position[1] + (Math.random()-0.5)*r*0.5,
                this.position[2] + (Math.random()-0.5)*r,
            ],
            vel: [(Math.random()-0.5)*0.06, (Math.random()-0.5)*0.03, (Math.random()-0.5)*0.06],
            life: life,
            maxLife: life,
            // color:   isDetail ? [1.0, 1.0, 1.0] : [0.88, 0.92, 0.97],
            // alpha:   0.0,
            // size:    isDetail ? 15 + Math.random()*20 : 55 + Math.random()*40,
            color: isDetail ? [1.0, 1.0, 1.0] : [0.88, 0.92, 0.97],
            alpha: 0.0,
            size:  isDetail ? 15 + Math.random()*20 : 55 + Math.random()*40,
            _maxAlpha: isDetail ? 0.08 : 0.14, 
            _edgeFactor: Math.min(1.0, distFromCenter), 
        };
    }

    updateParticle(p, dt) {
        const age = p.maxLife - p.life;         
        const t = age / p.maxLife;             

        //p.alpha = 0.30 * Math.sin(Math.PI * Math.pow(t, 0.4));
        //p.alpha = (p._maxAlpha ?? 0.12) * Math.sin(Math.PI * Math.pow(t, 0.4));

        const edgeBoost = 0.5 + 0.5 * p._edgeFactor;  // центр тусклее
        p.alpha = 0.10 * edgeBoost * Math.sin(Math.PI * Math.pow(t, 0.4));

        p.size += dt * 5;
        p.size  = Math.min(120, p.size);

        // турбулентность
        p.vel[0] += (Math.random()-0.5)*0.03;
        p.vel[2] += (Math.random()-0.5)*0.03;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. ФЕЙЕРВЕРК
// ═══════════════════════════════════════════════════════════════════════════════
// ракета + взрыв 
class Firework {
    constructor(position) {
        this.origin = [...position];
        this.reset();
    }

    reset() {
        this.phase  = "rocket"; 
        this.rocketPos = [...this.origin];
        this.rocketVel = [
            (Math.random()-0.5)*2,
            12 + Math.random()*4,
            (Math.random()-0.5)*2,
        ];
        this.rocketLife = 1.2 + Math.random()*0.5;
        this.particles = [];
        this.timer = 3 + Math.random()*2; // пауза до следующего запуска
        this.burstType  = ["sphere", "ring", "star"][Math.floor(Math.random()*3)];
        this.burstColor = [
            [1.0, 0.3, 0.1],
            [0.2, 0.6, 1.0],
            [0.3, 1.0, 0.3],
            [1.0, 0.9, 0.1],
            [1.0, 0.2, 0.8],
        ][Math.floor(Math.random()*5)];

        this._pos = new Float32Array(500 * 3);
        this._color = new Float32Array(500 * 4);
        this._size  = new Float32Array(500);
        this.posBuffer   = this.posBuffer   || gl.createBuffer();
        this.colorBuffer = this.colorBuffer || gl.createBuffer();
        this.sizeBuffer  = this.sizeBuffer  || gl.createBuffer();
    }

    burst(pos) {
        const count = 200 + Math.floor(Math.random()*100);
        for (let i = 0; i < count; i++) {
            let vel;
            const speed = 3 + Math.random()*4;

            if (this.burstType === "sphere") {
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2*Math.random()-1);
                vel = [
                    Math.sin(phi)*Math.cos(theta)*speed,
                    Math.sin(phi)*Math.sin(theta)*speed,
                    Math.cos(phi)*speed,
                ];
            } else if (this.burstType === "ring") {
                const theta = (i / count) * Math.PI * 2;
                vel = [Math.cos(theta)*speed, (Math.random()-0.5)*0.5, Math.sin(theta)*speed];
            } else {
                const arm   = Math.floor(i / (count/5));
                const theta = arm * (Math.PI*2/5) + (Math.random()-0.5)*0.3;
                vel = [Math.cos(theta)*speed, (Math.random()-0.5)*speed*0.3, Math.sin(theta)*speed];
            }

            this.particles.push({
                pos: [...pos],
                vel,
                life: 1.0 + Math.random()*0.8,
                color: [...this.burstColor],
                alpha: 1.0,
                size: 5 + Math.random()*4,
            });
        }
    }

    update(dt) {
        if (this.phase === "wait") {
            this.timer -= dt;
            if (this.timer <= 0) this.reset();
            return;
        }

        if (this.phase === "rocket") {
            this.rocketVel[1] -= 5 * dt;
            this.rocketPos[0] += this.rocketVel[0] * dt;
            this.rocketPos[1] += this.rocketVel[1] * dt;
            this.rocketPos[2] += this.rocketVel[2] * dt;
            this.rocketLife -= dt;

            if (this.rocketLife <= 0) {
                this.phase = "burst";
                this.burst(this.rocketPos);
            }
            return;
        }

        for (let i = this.particles.length-1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) { this.particles.splice(i, 1); continue; }
            p.vel[1]  -= 3 * dt;
            p.vel[0]  *= (1 - 0.8*dt);
            p.vel[1]  *= (1 - 0.8*dt);
            p.vel[2]  *= (1 - 0.8*dt);
            p.pos[0]  += p.vel[0]*dt;
            p.pos[1]  += p.vel[1]*dt;
            p.pos[2]  += p.vel[2]*dt;
            p.alpha = p.life * 0.9;
            p.size = Math.max(1, p.size - dt*3);
        }

        if (this.particles.length === 0) {
            this.phase = "wait";
            this.timer = 2 + Math.random()*3;
        }

        const n = this.particles.length;
        for (let i = 0; i < n; i++) {
            const p = this.particles[i];
            this._pos[i*3]   = p.pos[0];
            this._pos[i*3+1] = p.pos[1];
            this._pos[i*3+2] = p.pos[2];
            this._color[i*4]   = p.color[0];
            this._color[i*4+1] = p.color[1];
            this._color[i*4+2] = p.color[2];
            this._color[i*4+3] = p.alpha;
            this._size[i] = p.size;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._pos.subarray(0, n*3), gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._color.subarray(0, n*4), gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._size.subarray(0, n), gl.DYNAMIC_DRAW);
    }

    draw(mvMatrix, prMatrix) {
        const prog = shaderParticleAdd;
        gl.useProgram(prog);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.uniformMatrix4fv(gl.getUniformLocation(prog, "uMVMatrix"), false, mvMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(prog, "uPMatrix"),  false, prMatrix);

        const bindA = (name, buf, size) => {
            const loc = gl.getAttribLocation(prog, name);
            if (loc < 0) return;
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(loc);
        };

        // Ракета 
        if (this.phase === "rocket") {
            const rPos   = new Float32Array(this.rocketPos);
            const rColor = new Float32Array([1.0, 0.8, 0.3, 1.0]);
            const rSize  = new Float32Array([6.0]);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, rPos,   gl.DYNAMIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, rColor, gl.DYNAMIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, rSize,  gl.DYNAMIC_DRAW);
            bindA("aPosition", this.posBuffer,   3);
            bindA("aColor",    this.colorBuffer, 4);
            bindA("aSize",     this.sizeBuffer,  1);
            gl.drawArrays(gl.POINTS, 0, 1);
        }

        // Взрыв
        if (this.phase === "burst" && this.particles.length > 0) {
            bindA("aPosition", this.posBuffer,   3);
            bindA("aColor", this.colorBuffer, 4);
            bindA("aSize", this.sizeBuffer,  1);
            gl.drawArrays(gl.POINTS, 0, this.particles.length);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. ОГОНЬ КОСТРА
// ══════════════════════════════════════════════════════════════════════════════
class Campfire extends ParticleSystem {
    constructor(position) {
        super({
            position,
            maxParticles: 400,
            spawnRate: 150,  // 100
            gravity: 0.8,   // вверх
            wind: [0.15, 0, 0.05],
            damping: 0.5,
            additive: true,
        });
    }

    spawnParticle() {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.3;
        const life = 0.6 + Math.random()*0.6;
        return {
            pos: [
                this.position[0] + Math.cos(angle)*r,
                this.position[1],
                this.position[2] + Math.sin(angle)*r,
            ],
            vel: [
                (Math.random()-0.5)*0.4,
                1.5 + Math.random()*1.5,
                (Math.random()-0.5)*0.4,
            ],
            life:    life,
            maxLife: life,
            color:   [1.0, 1.0, 0.8],
            alpha:   0.0, // 0.9
            size:    10 + Math.random()*8,
            _baseSize: 15 + Math.random()*15,
        };
    }

    // updateParticle(p, dt) {
    //     const t = 1 - (p.life / p.maxLife); 
    //     // белый - жёлтый - оранжевый - красный
    //     p.color[0] = 1.0;
    //     p.color[1] = Math.max(0, 1.0 - t * 1.2);
    //     p.color[2] = Math.max(0, 0.8 - t * 0.8);
    //     p.alpha    = (1 - t) * 0.85;
    //     //p.size     = Math.max(1, p.size * (1 - dt * 1.5));
    //     p.size = p._baseSize * (1.0 - (t - 0.3) * (t - 0.3) * 2.5 + 0.2);
    //     p.size = Math.max(1, p.size);
    // }
    updateParticle(p, dt) {
        const t = 1 - (p.life / p.maxLife);

        p.color[0] = 1.0;
        p.color[1] = Math.max(0, 1.0 - t * 1.4);
        p.color[2] = Math.max(0, 0.6 - t * 0.6);
        p.alpha = Math.sin(Math.PI * Math.pow(t, 0.2)) * 0.8;

        p.size = p._baseSize * Math.max(0.05, 1.0 - t * t);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. СЛЕД ЗА КУРСОРОМ
// ═══════════════════════════════════════════════════════════════════════════════

class MagicTrail {
    constructor() {
        this.particles = [];
        this.maxParticles = 300;
        this.spawnAccum  = 0;

        this._pos   = new Float32Array(this.maxParticles * 3);
        this._color = new Float32Array(this.maxParticles * 4);
        this._size  = new Float32Array(this.maxParticles);
        this.posBuffer = gl.createBuffer();
        this.colorBuffer = gl.createBuffer();
        this.sizeBuffer  = gl.createBuffer();

        this.hue = 0;
    }

    screenToWorld(screenX, screenY, mvMatrix, prMatrix, depth) {
        const canvas = gl.canvas;
        // NDC [-1, 1]
        const rect  = canvas.getBoundingClientRect();
        const ndcX  =  ((screenX - rect.left) / rect.width)  * 2 - 1;
        const ndcY  = -((screenY - rect.top)  / rect.height) * 2 + 1;
        // const ndcX =  (screenX / canvas.width)  * 2 - 1;
        // const ndcY = -(screenY / canvas.height) * 2 + 1;

        const invP = mat4.create();
        mat4.invert(invP, prMatrix);

        const viewPos = vec4.fromValues(0, 0, 0, 1);
        const clipPos = vec4.fromValues(ndcX, ndcY, -1.0, 1.0);
        vec4.transformMat4(viewPos, clipPos, invP);
        const rayView = [viewPos[0]/viewPos[3], viewPos[1]/viewPos[3], viewPos[2]/viewPos[3]];
        const t = depth / (-rayView[2]);
        const vx = rayView[0] * t;
        const vy = rayView[1] * t;

        const invMV = mat4.create();
        mat4.invert(invMV, mvMatrix);
        const worldPos = vec4.create();
        vec4.transformMat4(worldPos, vec4.fromValues(vx, vy, -depth, 1.0), invMV);

        return [worldPos[0], worldPos[1], worldPos[2]];
    }

    // hue [0..1] → RGB
    hsvToRgb(h) {
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const q = 1 - f;
        switch (i % 6) {
            case 0: return [1, f, 0];
            case 1: return [q, 1, 0];
            case 2: return [0, 1, f];
            case 3: return [0, q, 1];
            case 4: return [f, 0, 1];
            case 5: return [1, 0, q];
        }
        return [1, 1, 1];
    }

    update(dt, mvMatrix, prMatrix) {
        this.hue = (this.hue + dt * 0.5) % 1.0;

        this.spawnAccum += 80 * dt;
        while (this.spawnAccum >= 1 && this.particles.length < this.maxParticles) {
            const worldPos = this.screenToWorld(mouseX, mouseY, mvMatrix, prMatrix, 8);
            const color    = this.hsvToRgb((this.hue + Math.random()*0.15) % 1.0);
            this.particles.push({
                pos:   worldPos,
                vel:   [
                    (Math.random()-0.5)*1.5,
                    (Math.random()-0.5)*1.5 + 0.5,
                    (Math.random()-0.5)*0.5,
                ],
                life:  0.4 + Math.random()*0.4,
                color,
                alpha: 1.0,
                size:  6 + Math.random()*6,
            });
            this.spawnAccum -= 1;
        }

        for (let i = this.particles.length-1; i >= 0; i--) {
            const p = this.particles[i];
            p.life    -= dt;
            if (p.life <= 0) { this.particles.splice(i, 1); continue; }
            p.vel[1]  -= 1.5 * dt;
            p.pos[0]  += p.vel[0]*dt;
            p.pos[1]  += p.vel[1]*dt;
            p.pos[2]  += p.vel[2]*dt;
            p.alpha    = p.life * 2.5;
            p.size     = Math.max(1, p.size - dt*8);
        }

        const n = this.particles.length;
        for (let i = 0; i < n; i++) {
            const p = this.particles[i];
            this._pos[i*3]     = p.pos[0];
            this._pos[i*3+1]   = p.pos[1];
            this._pos[i*3+2]   = p.pos[2];
            this._color[i*4]   = p.color[0];
            this._color[i*4+1] = p.color[1];
            this._color[i*4+2] = p.color[2];
            this._color[i*4+3] = p.alpha;
            this._size[i]      = p.size;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._pos.subarray(0, n*3), gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._color.subarray(0, n*4), gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._size.subarray(0, n), gl.DYNAMIC_DRAW);
    }

    draw(mvMatrix, prMatrix) {
        const n = this.particles.length;
        if (n === 0) return;

        const prog = shaderParticleAdd;
        gl.useProgram(prog);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.uniformMatrix4fv(gl.getUniformLocation(prog, "uMVMatrix"), false, mvMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(prog, "uPMatrix"),  false, prMatrix);

        const bindA = (name, buf, size) => {
            const loc = gl.getAttribLocation(prog, name);
            if (loc < 0) return;
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(loc);
        };

        bindA("aPosition", this.posBuffer,   3);
        bindA("aColor",    this.colorBuffer, 4);
        bindA("aSize",     this.sizeBuffer,  1);
        gl.drawArrays(gl.POINTS, 0, n);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. ФЕЙЕРВЕРК С ИНСТАНСИНГОМ (доп)
// ═══════════════════════════════════════════════════════════════════════════════

// class FireworkInstanced {
//     constructor(position) {
//         this.origin      = [...position];
//         this.maxParticles = 5000;
//         this.particles   = [];
//         this.phase       = "wait";
//         this.timer       = 1.0;
//         this.burstColor  = [1.0, 0.5, 0.1];

//         // Квад из двух треугольников (6 вершин)
//         this.quadBuffer = gl.createBuffer();
//         gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
//         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
//             -0.5,-0.5,  0.5,-0.5,  0.5, 0.5,
//             -0.5,-0.5,  0.5, 0.5, -0.5, 0.5,
//         ]), gl.STATIC_DRAW);

//         // Инстансные буферы
//         this.offsetBuffer = gl.createBuffer();
//         this.iColorBuffer = gl.createBuffer();
//         this.iSizeBuffer  = gl.createBuffer();

//         this._offsets = new Float32Array(this.maxParticles * 3);
//         this._icolors = new Float32Array(this.maxParticles * 4);
//         this._isizes  = new Float32Array(this.maxParticles);

//         // FPS замер
//         this.fpsHistory  = [];
//         this.fpsInterval = 0;
//     }

//     burst() {
//         this.particles = [];
//         const colors = [
//             [1.0, 0.2, 0.1], [0.1, 0.5, 1.0], [0.2, 1.0, 0.3],
//             [1.0, 0.9, 0.1], [1.0, 0.2, 0.9],
//         ];
//         this.burstColor = colors[Math.floor(Math.random()*colors.length)];

//         for (let i = 0; i < this.maxParticles; i++) {
//             const theta = Math.random() * Math.PI * 2;
//             const phi   = Math.acos(2*Math.random()-1);
//             const speed = 2 + Math.random()*5;
//             this.particles.push({
//                 pos:   [...this.origin],
//                 vel:   [
//                     Math.sin(phi)*Math.cos(theta)*speed,
//                     Math.sin(phi)*Math.sin(theta)*speed,
//                     Math.cos(phi)*speed,
//                 ],
//                 life:  1.5 + Math.random(),
//                 color: [...this.burstColor],
//                 alpha: 1.0,
//                 size:  4 + Math.random()*3,
//             });
//         }
//     }

//     update(dt, timestamp) {
//         // FPS замер
//         this.fpsInterval -= dt;
//         if (this.fpsInterval <= 0) {
//             this.fpsInterval = 0.5;
//             const fps = 1 / dt;
//             this.fpsHistory.push({ t: timestamp / 1000, fps });
//             if (this.fpsHistory.length > 60) this.fpsHistory.shift();
//             updateFPSGraph(this.fpsHistory);
//         }

//         if (this.phase === "wait") {
//             this.timer -= dt;
//             if (this.timer <= 0) { this.burst(); this.phase = "burst"; }
//             return;
//         }

//         let alive = 0;
//         for (let i = 0; i < this.particles.length; i++) {
//             const p = this.particles[i];
//             p.life    -= dt;
//             if (p.life <= 0) continue;
//             p.vel[1]  -= 3  * dt;
//             p.vel[0]  *= (1 - 0.6*dt);
//             p.vel[1]  *= (1 - 0.6*dt);
//             p.vel[2]  *= (1 - 0.6*dt);
//             p.pos[0]  += p.vel[0]*dt;
//             p.pos[1]  += p.vel[1]*dt;
//             p.pos[2]  += p.vel[2]*dt;
//             p.alpha    = Math.min(1, p.life * 0.8);

//             this._offsets[alive*3]   = p.pos[0];
//             this._offsets[alive*3+1] = p.pos[1];
//             this._offsets[alive*3+2] = p.pos[2];
//             this._icolors[alive*4]   = p.color[0];
//             this._icolors[alive*4+1] = p.color[1];
//             this._icolors[alive*4+2] = p.color[2];
//             this._icolors[alive*4+3] = p.alpha;
//             this._isizes[alive]      = p.size;
//             alive++;
//         }
//         this.aliveCount = alive;

//         if (alive === 0) { this.phase = "wait"; this.timer = 3 + Math.random()*2; }

//         gl.bindBuffer(gl.ARRAY_BUFFER, this.offsetBuffer);
//         gl.bufferData(gl.ARRAY_BUFFER, this._offsets.subarray(0, alive*3), gl.DYNAMIC_DRAW);
//         gl.bindBuffer(gl.ARRAY_BUFFER, this.iColorBuffer);
//         gl.bufferData(gl.ARRAY_BUFFER, this._icolors.subarray(0, alive*4), gl.DYNAMIC_DRAW);
//         gl.bindBuffer(gl.ARRAY_BUFFER, this.iSizeBuffer);
//         gl.bufferData(gl.ARRAY_BUFFER, this._isizes.subarray(0, alive), gl.DYNAMIC_DRAW);
//     }

//     draw(mvMatrix, prMatrix) {
//         if (this.phase !== "burst" || !this.aliveCount) return;

//         const prog = shaderParticleInst;
//         gl.useProgram(prog);
//         gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
//         gl.uniformMatrix4fv(gl.getUniformLocation(prog, "uMVMatrix"), false, mvMatrix);
//         gl.uniformMatrix4fv(gl.getUniformLocation(prog, "uPMatrix"),  false, prMatrix);

//         const bindA = (name, buf, size, divisor) => {
//             const loc = gl.getAttribLocation(prog, name);
//             if (loc < 0) return;
//             gl.bindBuffer(gl.ARRAY_BUFFER, buf);
//             gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
//             gl.enableVertexAttribArray(loc);
//             gl.vertexAttribDivisor(loc, divisor);
//         };

//         bindA("aPosition", this.quadBuffer,    2, 0); // per-vertex
//         bindA("aOffset",   this.offsetBuffer,  3, 1); // per-instance
//         bindA("aColor",    this.iColorBuffer,  4, 1);
//         bindA("aSize",     this.iSizeBuffer,   1, 1);

//         gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.aliveCount);

//         // Сбрасываем divisor чтобы не сломать другие draw calls
//         ["aPosition","aOffset","aColor","aSize"].forEach(name => {
//             const loc = gl.getAttribLocation(prog, name);
//             if (loc >= 0) gl.vertexAttribDivisor(loc, 0);
//         });
//     }
// }

class FireworkInstanced {
    constructor(position) {
        this.origin = [...position];
        this.maxParticles = 10000,// 5000;
        this.particles = [];
        this.phase = "wait";
        this.timer = 1.0;
        this.burstColor= [1.0, 0.5, 0.1];
        this.aliveCount= 0;

        this.quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -0.5,-0.5,  0.5,-0.5,  0.5, 0.5,
            -0.5,-0.5,  0.5, 0.5, -0.5, 0.5,
        ]), gl.STATIC_DRAW);

        this.offsetBuffer = gl.createBuffer();
        this.iColorBuffer = gl.createBuffer();
        this.iSizeBuffer  = gl.createBuffer();

        this.posBuffer   = gl.createBuffer();
        this.colorBuffer = gl.createBuffer();
        this.sizeBuffer  = gl.createBuffer();

        this._offsets = new Float32Array(this.maxParticles * 3);
        this._icolors = new Float32Array(this.maxParticles * 4);
        this._isizes  = new Float32Array(this.maxParticles);

        this._pos   = this._offsets; 
        this._color = this._icolors;
        this._size  = this._isizes;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.offsetBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._offsets, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._icolors, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iSizeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._isizes, gl.DYNAMIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._offsets, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._icolors, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._isizes, gl.DYNAMIC_DRAW);

        this.fpsHistory  = [];
        this.fpsInterval = 0;
    }

    burst() {
        this.particles = [];
        const colors = [
            [1.0, 0.2, 0.1], [0.1, 0.5, 1.0], [0.2, 1.0, 0.3],
            [1.0, 0.9, 0.1], [1.0, 0.2, 0.9],
        ];
        this.burstColor = colors[Math.floor(Math.random()*colors.length)];

        for (let i = 0; i < this.maxParticles; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi   = Math.acos(2*Math.random()-1);
            const speed = 2 + Math.random()*5;
            this.particles.push({
                pos: [...this.origin],
                vel: [
                    Math.sin(phi)*Math.cos(theta)*speed,
                    Math.sin(phi)*Math.sin(theta)*speed,
                    Math.cos(phi)*speed,
                ],
                life:  1.5 + Math.random(),
                color: [...this.burstColor],
                alpha: 1.0,
                size:  4 + Math.random()*3,
            });
        }
    }

    update(dt, timestamp) {
        // FPS замер
        this.fpsInterval -= dt;
        if (this.fpsInterval <= 0) {
            this.fpsInterval = 0.5;
            const fps = 1 / dt;
            this.fpsHistory.push({ t: timestamp / 1000, fps });
            if (this.fpsHistory.length > 60) this.fpsHistory.shift();
            updateFPSGraph(this.fpsHistory);
        }

        if (this.phase === "wait") {
            this.timer -= dt;
            if (this.timer <= 0) { this.burst(); this.phase = "burst"; }
            return;
        }

        let alive = 0;
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.life   -= dt;
            if (p.life <= 0) continue;
            p.vel[1] -= 3  * dt;
            p.vel[0] *= (1 - 0.6*dt);
            p.vel[1] *= (1 - 0.6*dt);
            p.vel[2] *= (1 - 0.6*dt);
            p.pos[0] += p.vel[0]*dt;
            p.pos[1] += p.vel[1]*dt;
            p.pos[2] += p.vel[2]*dt;
            p.alpha   = Math.min(1, p.life * 0.8);

            // Данные одинаковые для обоих режимов — пишем один раз
            this._offsets[alive*3]   = p.pos[0];
            this._offsets[alive*3+1] = p.pos[1];
            this._offsets[alive*3+2] = p.pos[2];
            this._icolors[alive*4]   = p.color[0];
            this._icolors[alive*4+1] = p.color[1];
            this._icolors[alive*4+2] = p.color[2];
            this._icolors[alive*4+3] = p.alpha;
            this._isizes[alive]      = p.size;
            alive++;
        }
        this.aliveCount = alive;

        if (alive === 0) { this.phase = "wait"; this.timer = 3 + Math.random()*2; }

        // bufferSubData — не пересоздаём буфер, только обновляем данные
        const n3 = alive * 3;
        const n4 = alive * 4;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.offsetBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._offsets.subarray(0, n3));
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iColorBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._icolors.subarray(0, n4));
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iSizeBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._isizes.subarray(0, alive));

        // Те же буферы используем для GL_POINTS — данные идентичны
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._offsets.subarray(0, n3));
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._icolors.subarray(0, n4));
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._isizes.subarray(0, alive));
    }

    draw(mvMatrix, prMatrix) {
        if (this.phase !== "burst" || !this.aliveCount) return;

        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

        if (useInstancing) {
            this._drawInstanced(mvMatrix, prMatrix);
        } else {
            this._drawPoints(mvMatrix, prMatrix);
        }
    }

    _drawInstanced(mvMatrix, prMatrix) {
        const prog = shaderParticleInst;
        gl.useProgram(prog);
        gl.uniformMatrix4fv(gl.getUniformLocation(prog, "uMVMatrix"), false, mvMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(prog, "uPMatrix"),  false, prMatrix);
        gl.uniform2f(gl.getUniformLocation(prog, "uScreenSize"),
            gl.drawingBufferWidth, gl.drawingBufferHeight);

        const bindA = (name, buf, size, divisor) => {
            const loc = gl.getAttribLocation(prog, name);
            if (loc < 0) return;
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribDivisor(loc, divisor);
        };

        bindA("aPosition", this.quadBuffer,    2, 0);
        bindA("aOffset",   this.offsetBuffer,  3, 1);
        bindA("aColor",    this.iColorBuffer,  4, 1);
        bindA("aSize",     this.iSizeBuffer,   1, 1);

        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.aliveCount);

        ["aPosition","aOffset","aColor","aSize"].forEach(name => {
            const loc = gl.getAttribLocation(prog, name);
            if (loc >= 0) gl.vertexAttribDivisor(loc, 0);
        });
    }

    _drawPoints(mvMatrix, prMatrix) {
        const prog = shaderParticleAdd;
        gl.useProgram(prog);
        gl.uniformMatrix4fv(gl.getUniformLocation(prog, "uMVMatrix"), false, mvMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(prog, "uPMatrix"),  false, prMatrix);

        const bindA = (name, buf, size) => {
            const loc = gl.getAttribLocation(prog, name);
            if (loc < 0) return;
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(loc);
        };

        bindA("aPosition", this.posBuffer,   3);
        bindA("aColor",    this.colorBuffer, 4);
        bindA("aSize",     this.sizeBuffer,  1);

        gl.drawArrays(gl.POINTS, 0, this.aliveCount);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FPS ГРАФИК 
// ═══════════════════════════════════════════════════════════════════════════════

let fpsCanvas, fpsCtx;

function initFPSGraph() {
    fpsCanvas = document.createElement("canvas");
    fpsCanvas.width  = 300;
    fpsCanvas.height = 100;
    Object.assign(fpsCanvas.style, {
        position: "fixed", top: "10px", left: "10px",
        background: "rgba(0,0,0,0.6)", borderRadius: "6px",
        zIndex: 999,
    });
    document.body.appendChild(fpsCanvas);
    fpsCtx = fpsCanvas.getContext("2d");
}

function updateFPSGraph(history) {
    if (!fpsCtx) return;
    const W = fpsCanvas.width, H = fpsCanvas.height;
    fpsCtx.clearRect(0, 0, W, H);

    fpsCtx.strokeStyle = "rgba(255,255,255,0.1)";
    fpsCtx.lineWidth = 1;
    [30, 60, 90, 120].forEach(fps => {
        const y = H - (fps / 140) * H;
        fpsCtx.beginPath();
        fpsCtx.moveTo(0, y); fpsCtx.lineTo(W, y);
        fpsCtx.stroke();
        fpsCtx.fillStyle = "rgba(255,255,255,0.4)";
        fpsCtx.font = "9px monospace";
        fpsCtx.fillText(fps, 2, y - 2);
    });

    if (history.length < 2) return;

    const smooth = history.map((h, i) => {
        const window = history.slice(Math.max(0, i - 4), i + 1);
        const avg = window.reduce((s, x) => s + x.fps, 0) / window.length;
        return { ...h, fps: avg };
    });

    fpsCtx.beginPath();
    fpsCtx.strokeStyle = "#4fc";
    fpsCtx.lineWidth   = 2;
    smooth.forEach((h, i) => {
        const x = (i / (smooth.length - 1)) * W;
        const y = H - Math.min(h.fps / 140, 1) * H;
        i === 0 ? fpsCtx.moveTo(x, y) : fpsCtx.lineTo(x, y);
    });
    fpsCtx.stroke();

    const cur = Math.round(smooth[smooth.length - 1].fps);
    fpsCtx.fillStyle = cur > 55 ? "#4fc" : cur > 30 ? "#fa0" : "#f44";
    fpsCtx.font = "bold 14px monospace";
    fpsCtx.fillText(`${cur} FPS`, 8, 16);
}

// function updateFPSGraph(history) {
//     if (!fpsCtx) return;
//     const W = fpsCanvas.width, H = fpsCanvas.height;
//     fpsCtx.clearRect(0, 0, W, H);

//     // Сетка
//     fpsCtx.strokeStyle = "rgba(255,255,255,0.1)";
//     fpsCtx.lineWidth = 1;
//     [30, 60, 90, 120].forEach(fps => {
//         const y = H - (fps / 140) * H;
//         fpsCtx.beginPath();
//         fpsCtx.moveTo(0, y); fpsCtx.lineTo(W, y);
//         fpsCtx.stroke();
//         fpsCtx.fillStyle = "rgba(255,255,255,0.4)";
//         fpsCtx.font = "9px monospace";
//         fpsCtx.fillText(fps, 2, y - 2);
//     });

//     if (history.length < 2) return;

//     // Линия FPS
//     fpsCtx.beginPath();
//     fpsCtx.strokeStyle = "#4fc";
//     fpsCtx.lineWidth   = 2;
//     history.forEach((h, i) => {
//         const x = (i / (history.length-1)) * W;
//         const y = H - Math.min(h.fps / 140, 1) * H;
//         i === 0 ? fpsCtx.moveTo(x, y) : fpsCtx.lineTo(x, y);
//     });
//     fpsCtx.stroke();

//     // Текущий FPS
//     const cur = Math.round(history[history.length-1].fps);
//     fpsCtx.fillStyle = cur > 55 ? "#4fc" : cur > 30 ? "#fa0" : "#f44";
//     fpsCtx.font = "bold 14px monospace";
//     fpsCtx.fillText(`${cur} FPS (instanced 5k)`, 8, 16);
// }

// ═══════════════════════════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ
// ═══════════════════════════════════════════════════════════════════════════════

function initParticleSystems() {
    initParticleShaders();
   // initFPSGraph();

    particleSystems.push(new Sparkler([ 0.0, 0.0,  0.0]));
    particleSystems.push(new Smoke([-3.0, 0.0,  0.0]));
    particleSystems.push(new Rain([ 0.0, 0.0,  0.0]));
    particleSystems.push(new Steam([ 3.0, 0.0,  0.0]));
    particleSystems.push(new Campfire([-2.0, -0.2, 0.0]));
    //particleSystems.push(new MagicTrail());

    // фейерверки
    particleSystems.push(new Firework([-4.0, 0.0,  0.0]));
    particleSystems.push(new Firework([ 4.0, 0.0,  0.0]));
    particleSystems.push(new Firework([ 0.0, 0.0, -4.0]));

    //particleSystems.push(new FireworkInstanced([ 0.0, 20.0,  4.0]));
}