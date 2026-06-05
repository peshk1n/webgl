// ═══════════════════════════════════════════════════════════════════════════════
// Lab 8 — Terrain Tessellation with Adaptive LOD & Normals Visualization
// SINGLE-FILE MERGED VERSION
//
// OpenGL 4.0+ | C++17 | GLFW | GLAD | GLM
//
// Controls:
//   WASD  — move camera
//   Q/E   — down/up
//   Mouse — look around (hold left button)
//   N     — toggle normals visualization
//   R     — toggle wireframe mode
//   ESC   — exit
//
// Compile (MSVC):
//   Requires: GLFW3.lib linked, glad included, GLM headers
// ═══════════════════════════════════════════════════════════════════════════════

// ── GLAD (OpenGL loader) ─────────────────────────────────────────────────────
#include "vendor/glad/glad.h"

#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <windows.h>
#endif

#include <GLFW/glfw3.h>

#define GLM_FORCE_PURE
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>
#include <glm/gtc/noise.hpp>
#include <glm/gtc/constants.hpp>

#include <iostream>
#include <iomanip>
#include <sstream>
#include <fstream>
#include <vector>
#include <string>
#include <unordered_map>
#include <cmath>
#include <algorithm>

// ═══════════════════════════════════════════════════════════════════════════════
// SHADER SOURCES (inlined — originally in resources/shaders/)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Terrain vertex shader ────────────────────────────────────────────────────
static const char* kTerrainVS = R"(#version 400 core
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec2 aTexCoord;

out vec3 vWorldPos;
out vec2 vTexCoord;

void main()
{
    vWorldPos  = aPosition;
    vTexCoord  = aTexCoord;
    gl_Position = vec4(aPosition, 1.0);
}
)";

// ── Terrain tessellation control shader ──────────────────────────────────────
static const char* kTerrainTCS = R"(#version 400 core
layout(vertices = 4) out;

in vec3 vWorldPos[];
in vec2 vTexCoord[];

out vec3 tcWorldPos[];
out vec2 tcTexCoord[];

uniform float uMaxTessLevel;
uniform float uLODFactor;
uniform vec3  uCameraPosition;

float tessForPoint(vec3 point)
{
    float dist = length(point - uCameraPosition);
    float level = uMaxTessLevel / (1.0 + dist * uLODFactor);
    return clamp(level, 1.0, uMaxTessLevel);
}

void main()
{
    tcWorldPos[gl_InvocationID] = vWorldPos[gl_InvocationID];
    tcTexCoord[gl_InvocationID] = vTexCoord[gl_InvocationID];

    if (gl_InvocationID == 0)
    {
        // Per-EDGE tessellation levels — prevents cracks between patches.
        // The key: adjacent patches share an edge and compute the SAME level
        // because they use the same edge midpoint for the distance test.
        //
        // Vertex order (CCW quad):  3──2
        //                            │  │
        //                            0──1
        //
        // gl_TessLevelOuter mapping (OpenGL spec for quads):
        //   Outer[0] = edge V0→V1  (bottom,  between vertices 0 and 1)
        //   Outer[1] = edge V1→V2  (right,   between vertices 1 and 2)
        //   Outer[2] = edge V2→V3  (top,     between vertices 2 and 3)
        //   Outer[3] = edge V3→V0  (left,    between vertices 3 and 0)
        //
        // Using the CORRECT spec mapping — matching the reference code.

        vec3 edgeMid0 = (vWorldPos[0] + vWorldPos[1]) * 0.5;  // bottom
        vec3 edgeMid1 = (vWorldPos[1] + vWorldPos[2]) * 0.5;  // right
        vec3 edgeMid2 = (vWorldPos[2] + vWorldPos[3]) * 0.5;  // top
        vec3 edgeMid3 = (vWorldPos[3] + vWorldPos[0]) * 0.5;  // left

        gl_TessLevelOuter[0] = tessForPoint(edgeMid0);  // bottom
        gl_TessLevelOuter[1] = tessForPoint(edgeMid1);  // right
        gl_TessLevelOuter[2] = tessForPoint(edgeMid2);  // top
        gl_TessLevelOuter[3] = tessForPoint(edgeMid3);  // left

        float innerLevel = (gl_TessLevelOuter[0] + gl_TessLevelOuter[1] +
                            gl_TessLevelOuter[2] + gl_TessLevelOuter[3]) * 0.25;
        gl_TessLevelInner[0] = innerLevel;
        gl_TessLevelInner[1] = innerLevel;
    }
}
)";

// ── Terrain tessellation evaluation shader ───────────────────────────────────
// CRITICAL FIX: fractional_even_spacing (not fractional_odd_spacing!)
// The reference code uses fractional_even_spacing which guarantees at least
// 2 segments per edge → adjacent patches always share vertices at edge midpoints.
// fractional_odd_spacing can produce just 1 segment → visible gaps.
static const char* kTerrainTES = R"(#version 400 core
layout(quads, fractional_even_spacing, ccw) in;

in vec3 tcWorldPos[];
in vec2 tcTexCoord[];

out vec3 teWorldPos;
out vec3 teWorldNormal;
out vec2 teTexCoord;
out float teHeight;

uniform sampler2D uHeightmap;
uniform float uHeightScale;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

vec2 interpolate2D(vec2 v0, vec2 v1, vec2 v2, vec2 v3)
{
    return mix(mix(v0, v1, gl_TessCoord.x),
               mix(v3, v2, gl_TessCoord.x),
               gl_TessCoord.y);
}

vec3 interpolate3D(vec3 v0, vec3 v1, vec3 v2, vec3 v3)
{
    return mix(mix(v0, v1, gl_TessCoord.x),
               mix(v3, v2, gl_TessCoord.x),
               gl_TessCoord.y);
}

void main()
{
    vec3 flatPos = interpolate3D(tcWorldPos[0], tcWorldPos[1], tcWorldPos[2], tcWorldPos[3]);
    vec2 uv      = interpolate2D(tcTexCoord[0], tcTexCoord[1], tcTexCoord[2], tcTexCoord[3]);

    // CRITICAL FIX: Use texture() NOT textureLod().
    // textureLod forces LOD 0 but can cause sampler state mismatch with
    // neighboring patches. texture() uses default filtering which produces
    // consistent results at shared edges.
    float height = texture(uHeightmap, uv).r;

    vec3 worldPos = flatPos;
    worldPos.y = height * uHeightScale;

    // Normal from heightmap gradient (finite differences)
    float texelSize = 1.0 / 256.0;
    float worldStep = 60.0 / 256.0;

    float hL = texture(uHeightmap, uv + vec2(-texelSize, 0.0)).r * uHeightScale;
    float hR = texture(uHeightmap, uv + vec2( texelSize, 0.0)).r * uHeightScale;
    float hD = texture(uHeightmap, uv + vec2(0.0, -texelSize)).r * uHeightScale;
    float hU = texture(uHeightmap, uv + vec2(0.0,  texelSize)).r * uHeightScale;

    vec3 tangentX = normalize(vec3(2.0 * worldStep, hR - hL, 0.0));
    vec3 tangentZ = normalize(vec3(0.0, hU - hD, 2.0 * worldStep));
    vec3 normal = normalize(cross(tangentZ, tangentX));
    vec3 worldNormal = normalize(mat3(uModel) * normal);

    teWorldPos   = worldPos;
    teWorldNormal = worldNormal;
    teTexCoord   = uv;
    teHeight     = height;

    vec4 worldPos4 = uModel * vec4(worldPos, 1.0);
    vec4 viewPos   = uView  * worldPos4;
    gl_Position    = uProjection * viewPos;
}
)";

// ── Terrain fragment shader ──────────────────────────────────────────────────
static const char* kTerrainFS = R"(#version 400 core

in vec3 teWorldPos;
in vec3 teWorldNormal;
in vec2 teTexCoord;
in float teHeight;

out vec4 fragColor;

uniform vec3  uLightDirection;
uniform vec3  uLightColor;
uniform float uAmbientStrength;
uniform vec3  uCameraPosition;

vec3 getTerrainColor(float h)
{
    vec3 waterColor  = vec3(0.1, 0.3, 0.6);
    vec3 sandColor   = vec3(0.76, 0.70, 0.50);
    vec3 grassColor  = vec3(0.28, 0.55, 0.20);
    vec3 rockColor   = vec3(0.45, 0.42, 0.38);
    vec3 snowColor   = vec3(0.95, 0.95, 0.97);

    float sandStart  = 0.0;
    float grassStart = 0.08;
    float rockStart  = 0.45;
    float snowStart  = 0.78;

    vec3 color;
    if (h < grassStart) {
        color = mix(waterColor, sandColor, smoothstep(sandStart, grassStart, h));
    } else if (h < rockStart) {
        color = mix(sandColor, grassColor, smoothstep(grassStart, rockStart, h));
    } else if (h < snowStart) {
        color = mix(grassColor, rockColor, smoothstep(rockStart, snowStart, h));
    } else {
        color = mix(rockColor, snowColor, smoothstep(snowStart, 1.0, h));
    }
    return color;
}

void main()
{
    vec3 N = normalize(teWorldNormal);
    vec3 L = normalize(uLightDirection);

    float diff = max(dot(N, L), 0.0);

    vec3 V = normalize(uCameraPosition - teWorldPos);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 32.0);

    vec3 ambient = uAmbientStrength * uLightColor;

    vec3 terrainColor = getTerrainColor(teHeight);
    vec3 diffuse  = diff  * uLightColor * terrainColor;
    vec3 specular = spec  * uLightColor * 0.4;

    fragColor = vec4(ambient * terrainColor + diffuse + specular, 1.0);
}
)";

// ── Normals vertex shader ────────────────────────────────────────────────────
static const char* kNormalsVS = R"(#version 400 core
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec2 aTexCoord;

out vec3 vWorldPos;
out vec2 vTexCoord;

void main()
{
    vWorldPos  = aPosition;
    vTexCoord  = aTexCoord;
    gl_Position = vec4(aPosition, 1.0);
}
)";

// ── Normals tessellation control shader ──────────────────────────────────────
static const char* kNormalsTCS = R"(#version 400 core
layout(vertices = 4) out;

in vec3 vWorldPos[];
in vec2 vTexCoord[];

out vec3 tcWorldPos[];
out vec2 tcTexCoord[];

uniform float uMaxTessLevel;
uniform float uLODFactor;
uniform vec3  uCameraPosition;

float tessForPoint(vec3 point)
{
    float dist = length(point - uCameraPosition);
    float level = uMaxTessLevel / (1.0 + dist * uLODFactor);
    return clamp(level, 1.0, uMaxTessLevel);
}

void main()
{
    tcWorldPos[gl_InvocationID] = vWorldPos[gl_InvocationID];
    tcTexCoord[gl_InvocationID] = vTexCoord[gl_InvocationID];

    if (gl_InvocationID == 0)
    {
        vec3 edgeMid0 = (vWorldPos[0] + vWorldPos[1]) * 0.5;
        vec3 edgeMid1 = (vWorldPos[1] + vWorldPos[2]) * 0.5;
        vec3 edgeMid2 = (vWorldPos[2] + vWorldPos[3]) * 0.5;
        vec3 edgeMid3 = (vWorldPos[3] + vWorldPos[0]) * 0.5;

        gl_TessLevelOuter[0] = tessForPoint(edgeMid0);
        gl_TessLevelOuter[1] = tessForPoint(edgeMid1);
        gl_TessLevelOuter[2] = tessForPoint(edgeMid2);
        gl_TessLevelOuter[3] = tessForPoint(edgeMid3);

        float innerLevel = (gl_TessLevelOuter[0] + gl_TessLevelOuter[1] +
                            gl_TessLevelOuter[2] + gl_TessLevelOuter[3]) * 0.25;
        gl_TessLevelInner[0] = innerLevel;
        gl_TessLevelInner[1] = innerLevel;
    }
}
)";

// ── Normals tessellation evaluation shader ───────────────────────────────────
static const char* kNormalsTES = R"(#version 400 core
layout(quads, fractional_even_spacing, ccw) in;

in vec3 tcWorldPos[];
in vec2 tcTexCoord[];

out vec3 gsWorldPos;
out vec3 gsWorldNormal;

uniform sampler2D uHeightmap;
uniform float    uHeightScale;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

vec2 interpolate2D(vec2 v0, vec2 v1, vec2 v2, vec2 v3)
{
    return mix(mix(v0, v1, gl_TessCoord.x),
               mix(v3, v2, gl_TessCoord.x),
               gl_TessCoord.y);
}

vec3 interpolate3D(vec3 v0, vec3 v1, vec3 v2, vec3 v3)
{
    return mix(mix(v0, v1, gl_TessCoord.x),
               mix(v3, v2, gl_TessCoord.x),
               gl_TessCoord.y);
}

void main()
{
    vec3 flatPos = interpolate3D(tcWorldPos[0], tcWorldPos[1], tcWorldPos[2], tcWorldPos[3]);
    vec2 uv      = interpolate2D(tcTexCoord[0], tcTexCoord[1], tcTexCoord[2], tcTexCoord[3]);

    float height = texture(uHeightmap, uv).r;
    vec3 worldPos = flatPos;
    worldPos.y = height * uHeightScale;

    float texelSize = 1.0 / 256.0;
    float worldStep = 60.0 / 256.0;

    float hL = texture(uHeightmap, uv + vec2(-texelSize, 0.0)).r * uHeightScale;
    float hR = texture(uHeightmap, uv + vec2( texelSize, 0.0)).r * uHeightScale;
    float hD = texture(uHeightmap, uv + vec2(0.0, -texelSize)).r * uHeightScale;
    float hU = texture(uHeightmap, uv + vec2(0.0,  texelSize)).r * uHeightScale;

    vec3 tangentX = normalize(vec3(2.0 * worldStep, hR - hL, 0.0));
    vec3 tangentZ = normalize(vec3(0.0, hU - hD, 2.0 * worldStep));
    vec3 normal = normalize(cross(tangentZ, tangentX));
    vec3 worldNormal = normalize(mat3(uModel) * normal);

    gsWorldPos   = worldPos;
    gsWorldNormal = worldNormal;

    vec4 worldPos4 = uModel * vec4(worldPos, 1.0);
    vec4 viewPos   = uView  * worldPos4;
    gl_Position    = uProjection * viewPos;
}
)";

// ── Normals geometry shader ──────────────────────────────────────────────────
static const char* kNormalsGS = R"(#version 400 core
layout(triangles) in;
layout(line_strip, max_vertices = 6) out;

in vec3 gsWorldPos[];
in vec3 gsWorldNormal[];

out vec3 gsColor;

uniform mat4  uView;
uniform mat4  uProjection;
uniform float uNormalLength;

void main()
{
    vec3 center = (gsWorldPos[0] + gsWorldPos[1] + gsWorldPos[2]) / 3.0;
    vec3 avgNormal = normalize(gsWorldNormal[0] + gsWorldNormal[1] + gsWorldNormal[2]);

    vec4 p0 = uProjection * uView * vec4(center, 1.0);
    vec4 p1 = uProjection * uView * vec4(center + avgNormal * uNormalLength, 1.0);

    gl_Position = p0;
    gsColor = vec3(1.0, 0.3, 0.3);
    EmitVertex();

    gl_Position = p1;
    gsColor = vec3(1.0, 0.9, 0.2);
    EmitVertex();

    EndPrimitive();
}
)";

// ── Normals fragment shader ──────────────────────────────────────────────────
static const char* kNormalsFS = R"(#version 400 core
in vec3 gsColor;
out vec4 fragColor;

void main()
{
    fragColor = vec4(gsColor, 1.0);
}
)";

// ═══════════════════════════════════════════════════════════════════════════════
// CAMERA — First-person 3D camera (yaw/pitch FPS-style)
// ═══════════════════════════════════════════════════════════════════════════════

class Camera
{
public:
    Camera() = default;

    glm::mat4 getViewMatrix() const
    {
        return glm::lookAt(m_position, m_position + getForward(), glm::vec3(0.0f, 1.0f, 0.0f));
    }

    glm::vec3 getForward() const
    {
        float yawRad   = glm::radians(m_yaw);
        float pitchRad = glm::radians(m_pitch);
        return glm::vec3(
            std::cos(yawRad) * std::cos(pitchRad),
            std::sin(pitchRad),
            std::sin(yawRad) * std::cos(pitchRad)
        );
    }

    glm::vec3 getRight() const
    {
        return glm::normalize(glm::cross(getForward(), glm::vec3(0.0f, 1.0f, 0.0f)));
    }

    glm::vec3 getUp() const
    {
        return glm::cross(getRight(), getForward());
    }

    void processKeyboard(bool w, bool s, bool a, bool d, bool q, bool e, float dt)
    {
        float velocity = m_moveSpeed * dt;
        glm::vec3 forward = getForward();
        glm::vec3 right   = getRight();

        if (w) m_position += forward * velocity;
        if (s) m_position -= forward * velocity;
        if (a) m_position -= right   * velocity;
        if (d) m_position += right   * velocity;
        if (q) m_position.y -= velocity;
        if (e) m_position.y += velocity;
    }

    void processMouse(float dx, float dy)
    {
        m_yaw   += dx * m_mouseSens;
        m_pitch -= dy * m_mouseSens;

        m_pitch = std::clamp(m_pitch, -m_maxPitch, m_maxPitch);

        if (m_yaw >= 360.0f)  m_yaw -= 360.0f;
        if (m_yaw < 0.0f)     m_yaw += 360.0f;
    }

    const glm::vec3& position() const { return m_position; }
    float yaw()   const { return m_yaw; }
    float pitch() const { return m_pitch; }

private:
    glm::vec3 m_position = glm::vec3(0.0f, 8.0f, 20.0f);
    float     m_yaw      = -90.0f;
    float     m_pitch    = -20.0f;
    float     m_moveSpeed = 12.0f;
    float     m_mouseSens = 0.15f;
    float     m_maxPitch  = 89.0f;
};

// ═══════════════════════════════════════════════════════════════════════════════
// SHADER — Minimal OpenGL shader program wrapper
// ═══════════════════════════════════════════════════════════════════════════════

class Shader
{
public:
    Shader() = default;

    ~Shader()
    {
        if (m_program) {
            glDeleteProgram(m_program);
            m_program = 0;
        }
    }

    // Load from inline source strings (empty = skip stage)
    bool loadFromSources(const std::string& vertSrc,
                         const std::string& tescSrc,
                         const std::string& teseSrc,
                         const std::string& geomSrc,
                         const std::string& fragSrc)
    {
        GLuint vs  = compileShader(GL_VERTEX_SHADER,          vertSrc);
        GLuint tcs = compileShader(GL_TESS_CONTROL_SHADER,    tescSrc);
        GLuint tes = compileShader(GL_TESS_EVALUATION_SHADER, teseSrc);
        GLuint gs  = compileShader(GL_GEOMETRY_SHADER,        geomSrc);
        GLuint fs  = compileShader(GL_FRAGMENT_SHADER,        fragSrc);

        m_program = glCreateProgram();

        auto attach = [&](GLuint s) { if (s) glAttachShader(m_program, s); };
        attach(vs); attach(tcs); attach(tes); attach(gs); attach(fs);

        glLinkProgram(m_program);

        GLint success = 0;
        glGetProgramiv(m_program, GL_LINK_STATUS, &success);
        if (!success) {
            char infoLog[1024];
            glGetProgramInfoLog(m_program, sizeof(infoLog), nullptr, infoLog);
            std::cerr << "[Shader] Link error:\n" << infoLog << std::endl;
            glDeleteProgram(m_program);
            m_program = 0;
        }

        auto detachAndDelete = [&](GLuint s) {
            if (s) { glDetachShader(m_program, s); glDeleteShader(s); }
        };
        detachAndDelete(vs); detachAndDelete(tcs); detachAndDelete(tes);
        detachAndDelete(gs); detachAndDelete(fs);

        m_uniformCache.clear();
        return m_program != 0;
    }

    void use() const { glUseProgram(m_program); }
    GLuint id() const { return m_program; }
    bool valid() const { return m_program != 0; }

    void setInt(const std::string& name, int value) const
        { glUniform1i(getUniformLocation(name), value); }
    void setFloat(const std::string& name, float value) const
        { glUniform1f(getUniformLocation(name), value); }
    void setVec2(const std::string& name, const glm::vec2& v) const
        { glUniform2fv(getUniformLocation(name), 1, glm::value_ptr(v)); }
    void setVec3(const std::string& name, const glm::vec3& v) const
        { glUniform3fv(getUniformLocation(name), 1, glm::value_ptr(v)); }
    void setVec4(const std::string& name, const glm::vec4& v) const
        { glUniform4fv(getUniformLocation(name), 1, glm::value_ptr(v)); }
    void setMat4(const std::string& name, const glm::mat4& m) const
        { glUniformMatrix4fv(getUniformLocation(name), 1, GL_FALSE, glm::value_ptr(m)); }

private:
    GLuint m_program = 0;
    mutable std::unordered_map<std::string, GLint> m_uniformCache;

    GLuint compileShader(GLenum type, const std::string& source)
    {
        if (source.empty()) return 0;

        GLuint shader = glCreateShader(type);
        const char* src = source.c_str();
        glShaderSource(shader, 1, &src, nullptr);
        glCompileShader(shader);

        GLint success = 0;
        glGetShaderiv(shader, GL_COMPILE_STATUS, &success);
        if (!success) {
            char infoLog[1024];
            glGetShaderInfoLog(shader, sizeof(infoLog), nullptr, infoLog);
            std::cerr << "[Shader] Compile error (type=" << type << "):\n" << infoLog << std::endl;
            glDeleteShader(shader);
            return 0;
        }
        return shader;
    }

    GLint getUniformLocation(const std::string& name) const
    {
        auto it = m_uniformCache.find(name);
        if (it != m_uniformCache.end()) return it->second;

        GLint loc = glGetUniformLocation(m_program, name.c_str());
        if (loc < 0) {
            std::cerr << "[Shader] Uniform '" << name << "' not found in program " << m_program << std::endl;
        }
        m_uniformCache[name] = loc;
        return loc;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// TERRAIN — Patch grid with procedural heightmap
// ═══════════════════════════════════════════════════════════════════════════════

struct TerrainPatch
{
    glm::vec3 corners[4];
    glm::vec2 uvs[4];
};

class Terrain
{
public:
    static constexpr int GRID_SIZE    = 10;
    static constexpr int HEIGHTMAP_W  = 256;
    static constexpr int HEIGHTMAP_H  = 256;
    static constexpr float WORLD_SIZE = 60.0f;

    Terrain() = default;

    ~Terrain()
    {
        if (m_vao)  glDeleteVertexArrays(1, &m_vao);
        if (m_vbo)  glDeleteBuffers(1, &m_vbo);
        if (m_tbo)  glDeleteBuffers(1, &m_tbo);
        if (m_ibo)  glDeleteBuffers(1, &m_ibo);
        if (m_heightmapTex) glDeleteTextures(1, &m_heightmapTex);
    }

    void init()
    {
        auto heightData = generateHeightmapData();
        uploadHeightmap(heightData);
        generatePatches();
        createBuffers();
        std::cout << "[Terrain] Initialized — heightmap " << HEIGHTMAP_W << "x" << HEIGHTMAP_H << std::endl;
    }

    void bind() const { glBindVertexArray(m_vao); }
    GLsizei patchCount() const { return static_cast<GLsizei>(m_patches.size()); }
    GLuint heightmapTexture() const { return m_heightmapTex; }
    const std::vector<TerrainPatch>& patches() const { return m_patches; }

private:
    std::vector<TerrainPatch> m_patches;
    std::vector<glm::vec3>    m_vertices;
    std::vector<glm::vec2>    m_texCoords;
    std::vector<GLushort>     m_indices;

    GLuint m_vao = 0;
    GLuint m_vbo = 0;
    GLuint m_tbo = 0;
    GLuint m_ibo = 0;
    GLuint m_heightmapTex = 0;

    std::vector<float> generateHeightmapData()
    {
        std::vector<float> data(HEIGHTMAP_W * HEIGHTMAP_H);

        for (int y = 0; y < HEIGHTMAP_H; ++y) {
            for (int x = 0; x < HEIGHTMAP_W; ++x) {
                float nx = static_cast<float>(x) / (HEIGHTMAP_W - 1);
                float ny = static_cast<float>(y) / (HEIGHTMAP_H - 1);

                float h = 0.0f;
                float amp = 1.0f;
                float freq = 4.0f;
                float totalAmp = 0.0f;

                for (int oct = 0; oct < 6; ++oct) {
                    glm::vec2 p(nx * freq, ny * freq);
                    h += glm::simplex(p) * amp;
                    totalAmp += amp;
                    amp *= 0.5f;
                    freq *= 2.0f;
                }
                h /= totalAmp;
                h = h * 0.5f + 0.5f;

                float ridge = 1.0f - std::abs(h * 2.0f - 1.0f);
                h = h * 0.7f + ridge * 0.3f;

                float edgeX = std::sin(nx * glm::pi<float>());
                float edgeY = std::sin(ny * glm::pi<float>());
                float edgeFade = edgeX * edgeY;
                edgeFade = std::pow(edgeFade, 0.5f);
                h *= edgeFade;

                data[y * HEIGHTMAP_W + x] = h;
            }
        }
        return data;
    }

    void uploadHeightmap(const std::vector<float>& data)
    {
        glGenTextures(1, &m_heightmapTex);
        glBindTexture(GL_TEXTURE_2D, m_heightmapTex);

        glTexImage2D(GL_TEXTURE_2D, 0, GL_R32F,
                     HEIGHTMAP_W, HEIGHTMAP_H, 0,
                     GL_RED, GL_FLOAT, data.data());

        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);

        glBindTexture(GL_TEXTURE_2D, 0);
    }

    void generatePatches()
    {
        m_patches.clear();
        m_vertices.clear();
        m_texCoords.clear();
        m_indices.clear();

        float half = WORLD_SIZE * 0.5f;
        float step = WORLD_SIZE / GRID_SIZE;

        for (int iz = 0; iz < GRID_SIZE; ++iz) {
            for (int ix = 0; ix < GRID_SIZE; ++ix) {
                float x0 = -half + ix * step;
                float x1 = x0 + step;
                float z0 = -half + iz * step;
                float z1 = z0 + step;

                float u0 = static_cast<float>(ix) / GRID_SIZE;
                float u1 = static_cast<float>(ix + 1) / GRID_SIZE;
                float v0 = static_cast<float>(iz) / GRID_SIZE;
                float v1 = static_cast<float>(iz + 1) / GRID_SIZE;

                TerrainPatch patch;
                // CCW order: bottom-left, bottom-right, top-right, top-left
                patch.corners[0] = glm::vec3(x0, 0.0f, z0);
                patch.corners[1] = glm::vec3(x1, 0.0f, z0);
                patch.corners[2] = glm::vec3(x1, 0.0f, z1);
                patch.corners[3] = glm::vec3(x0, 0.0f, z1);

                patch.uvs[0] = glm::vec2(u0, v0);
                patch.uvs[1] = glm::vec2(u1, v0);
                patch.uvs[2] = glm::vec2(u1, v1);
                patch.uvs[3] = glm::vec2(u0, v1);

                m_patches.push_back(patch);

                GLushort baseIdx = static_cast<GLushort>(m_vertices.size());
                for (int i = 0; i < 4; ++i) {
                    m_vertices.push_back(patch.corners[i]);
                    m_texCoords.push_back(patch.uvs[i]);
                }
                m_indices.push_back(baseIdx);
                m_indices.push_back(baseIdx + 1);
                m_indices.push_back(baseIdx + 2);
                m_indices.push_back(baseIdx + 3);
            }
        }

        std::cout << "[Terrain] Generated " << m_patches.size() << " patches, "
                  << m_vertices.size() << " vertices" << std::endl;
    }

    void createBuffers()
    {
        glGenVertexArrays(1, &m_vao);
        glBindVertexArray(m_vao);

        glGenBuffers(1, &m_vbo);
        glBindBuffer(GL_ARRAY_BUFFER, m_vbo);
        glBufferData(GL_ARRAY_BUFFER,
                     m_vertices.size() * sizeof(glm::vec3),
                     m_vertices.data(), GL_STATIC_DRAW);
        glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, sizeof(glm::vec3), (void*)0);
        glEnableVertexAttribArray(0);

        glGenBuffers(1, &m_tbo);
        glBindBuffer(GL_ARRAY_BUFFER, m_tbo);
        glBufferData(GL_ARRAY_BUFFER,
                     m_texCoords.size() * sizeof(glm::vec2),
                     m_texCoords.data(), GL_STATIC_DRAW);
        glVertexAttribPointer(1, 2, GL_FLOAT, GL_FALSE, sizeof(glm::vec2), (void*)0);
        glEnableVertexAttribArray(1);

        glGenBuffers(1, &m_ibo);
        glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, m_ibo);
        glBufferData(GL_ELEMENT_ARRAY_BUFFER,
                     m_indices.size() * sizeof(GLushort),
                     m_indices.data(), GL_STATIC_DRAW);

        glBindVertexArray(0);
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// RENDERER — owns shader programs, terrain, and debug state
// ═══════════════════════════════════════════════════════════════════════════════

class Renderer
{
public:
    Renderer() = default;
    ~Renderer() = default;

    bool init()
    {
        // Enable OpenGL debug output if available (4.3+)
        if (glDebugMessageCallback) {
            glEnable(GL_DEBUG_OUTPUT);
            glEnable(GL_DEBUG_OUTPUT_SYNCHRONOUS);
            glDebugMessageCallback(glDebugCallback, nullptr);
            glDebugMessageControl(GL_DONT_CARE, GL_DONT_CARE,
                                  GL_DEBUG_SEVERITY_NOTIFICATION, 0, nullptr, GL_FALSE);
        }

        // Load terrain shader from inline sources
        bool terrainOk = m_terrainShader.loadFromSources(
            kTerrainVS, kTerrainTCS, kTerrainTES, "", kTerrainFS
        );
        if (!terrainOk) {
            std::cerr << "[Renderer] Failed to load terrain shader!" << std::endl;
            return false;
        }

        // Load normals visualization shader from inline sources
        bool normalsOk = m_normalsShader.loadFromSources(
            kNormalsVS, kNormalsTCS, kNormalsTES, kNormalsGS, kNormalsFS
        );
        if (!normalsOk) {
            std::cerr << "[Renderer] Failed to load normals shader!" << std::endl;
            return false;
        }

        m_terrain.init();

        float aspect = static_cast<float>(m_screenWidth) / m_screenHeight;
        m_projection = glm::perspective(glm::radians(45.0f), aspect, 0.5f, 300.0f);

        std::cout << "[Renderer] Initialized successfully." << std::endl;
        return true;
    }

    void render(const Camera& camera, float /*dt*/)
    {
        if (m_showWireframe)
            glPolygonMode(GL_FRONT_AND_BACK, GL_LINE);
        else
            glPolygonMode(GL_FRONT_AND_BACK, GL_FILL);

        glClearColor(0.05f, 0.08f, 0.15f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
        glEnable(GL_DEPTH_TEST);

        // ── Pass 1: Terrain ────────────────────────────────────────────────
        m_terrainShader.use();
        setCommonUniforms(m_terrainShader, camera);

        m_terrainShader.setVec3("uLightDirection",  m_lightDir);
        m_terrainShader.setVec3("uLightColor",      m_lightColor);
        m_terrainShader.setFloat("uAmbientStrength", m_ambientStr);

        glActiveTexture(GL_TEXTURE0);
        glBindTexture(GL_TEXTURE_2D, m_terrain.heightmapTexture());

        glPatchParameteri(GL_PATCH_VERTICES, 4);
        m_terrain.bind();
        glDrawElements(GL_PATCHES, m_terrain.patchCount() * 4, GL_UNSIGNED_SHORT, 0);

        // ── Pass 2: Normals overlay (optional) ─────────────────────────────
        if (m_showNormals) {
            m_normalsShader.use();
            setCommonUniforms(m_normalsShader, camera);
            m_normalsShader.setFloat("uNormalLength", m_normalLength);

            glActiveTexture(GL_TEXTURE0);
            glBindTexture(GL_TEXTURE_2D, m_terrain.heightmapTexture());

            glPatchParameteri(GL_PATCH_VERTICES, 4);
            m_terrain.bind();
            glDrawElements(GL_PATCHES, m_terrain.patchCount() * 4, GL_UNSIGNED_SHORT, 0);
        }

        if (m_showWireframe)
            glPolygonMode(GL_FRONT_AND_BACK, GL_FILL);

#ifdef _DEBUG
        GLenum err;
        while ((err = glGetError()) != GL_NO_ERROR) {
            std::cerr << "[GL] Error after render: " << err << std::endl;
        }
#endif
    }

    void resize(int width, int height)
    {
        m_screenWidth  = width;
        m_screenHeight = height;
        float aspect = static_cast<float>(width) / std::max(height, 1);
        m_projection = glm::perspective(glm::radians(45.0f), aspect, 0.5f, 300.0f);
        glViewport(0, 0, width, height);
    }

    void toggleNormals()
    {
        m_showNormals = !m_showNormals;
        std::cout << "[Renderer] Normals visualization: "
                  << (m_showNormals ? "ON" : "OFF") << std::endl;
    }

    void toggleWireframe()
    {
        m_showWireframe = !m_showWireframe;
        std::cout << "[Renderer] Wireframe mode: "
                  << (m_showWireframe ? "ON" : "OFF") << std::endl;
    }

    bool normalsEnabled()  const { return m_showNormals; }
    bool wireframeEnabled() const { return m_showWireframe; }

    float fps() const { return m_fps; }

    float estimateTessLevel(const Camera& camera) const
    {
        glm::vec3 terrainCenter(0.0f, 5.0f, 0.0f);
        float dist = glm::length(camera.position() - terrainCenter);
        float tess = m_maxTessLevel / (1.0f + dist * m_lodFactor);
        return std::clamp(tess, 1.0f, m_maxTessLevel);
    }

    void updateFPS(float time)
    {
        if (m_lastFpsTime > 0.0f) {
            float dt = time - m_lastFpsTime;
            if (dt > 0.0f) {
                m_fpsRing[m_fpsRingIdx] = 1.0f / dt;
                m_fpsRingIdx = (m_fpsRingIdx + 1) % FPS_RING_SIZE;
                if (m_fpsRingCount < FPS_RING_SIZE) m_fpsRingCount++;
            }
        }
        m_lastFpsTime = time;

        if (m_fpsRingCount > 0) {
            float sum = 0.0f;
            for (int i = 0; i < m_fpsRingCount; ++i) sum += m_fpsRing[i];
            m_fps = sum / m_fpsRingCount;
        }
    }

private:
    Shader m_terrainShader;
    Shader m_normalsShader;

    Terrain m_terrain;

    bool m_showNormals   = false;
    bool m_showWireframe = false;

    glm::mat4 m_projection = glm::mat4(1.0f);
    int m_screenWidth  = 1280;
    int m_screenHeight = 720;

    static constexpr int FPS_RING_SIZE = 60;
    float m_fpsRing[FPS_RING_SIZE] = {};
    int   m_fpsRingIdx   = 0;
    int   m_fpsRingCount  = 0;
    float m_lastFpsTime   = 0.0f;
    float m_fps           = 0.0f;

    float m_maxTessLevel = 64.0f;
    float m_lodFactor    = 0.06f;
    float m_heightScale  = 10.0f;
    float m_normalLength = 1.5f;

    glm::vec3 m_lightDir   = glm::normalize(glm::vec3(0.5f, 1.0f, 0.3f));
    glm::vec3 m_lightColor = glm::vec3(1.0f, 0.95f, 0.85f);
    float     m_ambientStr = 0.35f;

    void setCommonUniforms(const Shader& shader, const Camera& camera)
    {
        shader.setMat4("uModel",      glm::mat4(1.0f));
        shader.setMat4("uView",       camera.getViewMatrix());
        shader.setMat4("uProjection", m_projection);
        shader.setVec3("uCameraPosition", camera.position());
        shader.setFloat("uMaxTessLevel", m_maxTessLevel);
        shader.setFloat("uLODFactor",    m_lodFactor);
        shader.setFloat("uHeightScale",  m_heightScale);
        shader.setInt("uHeightmap", 0);
    }

    static void GLAD_APIENTRY glDebugCallback(GLenum source, GLenum type, GLuint id,
                                              GLenum severity, GLsizei /*length*/,
                                              const GLchar* message, const void* /*userParam*/)
    {
        if (severity == GL_DEBUG_SEVERITY_NOTIFICATION) return;

        const char* srcStr = "Unknown";
        switch (source) {
            case GL_DEBUG_SOURCE_API:             srcStr = "API"; break;
            case GL_DEBUG_SOURCE_WINDOW_SYSTEM:   srcStr = "Window"; break;
            case GL_DEBUG_SOURCE_SHADER_COMPILER: srcStr = "Shader"; break;
            case GL_DEBUG_SOURCE_THIRD_PARTY:     srcStr = "3rdParty"; break;
            case GL_DEBUG_SOURCE_APPLICATION:     srcStr = "App"; break;
            case GL_DEBUG_SOURCE_OTHER:           srcStr = "Other"; break;
        }

        const char* typeStr = "Unknown";
        switch (type) {
            case GL_DEBUG_TYPE_ERROR:               typeStr = "ERROR"; break;
            case GL_DEBUG_TYPE_DEPRECATED_BEHAVIOR: typeStr = "DEPRECATED"; break;
            case GL_DEBUG_TYPE_UNDEFINED_BEHAVIOR:  typeStr = "UNDEFINED"; break;
            case GL_DEBUG_TYPE_PORTABILITY:         typeStr = "PORTABILITY"; break;
            case GL_DEBUG_TYPE_PERFORMANCE:         typeStr = "PERF"; break;
            case GL_DEBUG_TYPE_OTHER:               typeStr = "Other"; break;
        }

        std::cerr << "[GL][" << srcStr << "][" << typeStr << "] #" << id
                  << ": " << message << std::endl;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBALS & CALLBACKS
// ═══════════════════════════════════════════════════════════════════════════════

static GLFWwindow* g_window = nullptr;
static Renderer    g_renderer;
static Camera      g_camera;

static int  g_screenWidth  = 1280;
static int  g_screenHeight = 720;

static bool  g_keys[GLFW_KEY_LAST] = {};
static bool  g_mouseDown = false;
static float g_lastMouseX = 0.0f;
static float g_lastMouseY = 0.0f;
static bool  g_firstMouse = true;

static float g_lastFrameTime = 0.0f;
static float g_totalTime     = 0.0f;

static int   g_frameCounter   = 0;
static const int UI_UPDATE_FRAMES = 30;

static void glfwErrorCallback(int error, const char* description)
{
    std::cerr << "[GLFW] Error " << error << ": " << description << std::endl;
}

static void keyCallback(GLFWwindow* window, int key, int /*scancode*/, int action, int /*mods*/)
{
    if (action == GLFW_PRESS) {
        g_keys[key] = true;

        switch (key) {
            case GLFW_KEY_ESCAPE:
                glfwSetWindowShouldClose(window, GLFW_TRUE);
                break;
            case GLFW_KEY_N:
                g_renderer.toggleNormals();
                break;
            case GLFW_KEY_R:
                g_renderer.toggleWireframe();
                break;
        }
    } else if (action == GLFW_RELEASE) {
        g_keys[key] = false;
    }
}

static void mouseButtonCallback(GLFWwindow* /*window*/, int button, int action, int /*mods*/)
{
    if (button == GLFW_MOUSE_BUTTON_LEFT) {
        g_mouseDown = (action == GLFW_PRESS);
        if (g_mouseDown) {
            g_firstMouse = true;
        }
    }
}

static void cursorPosCallback(GLFWwindow* /*window*/, double xpos, double ypos)
{
    if (!g_mouseDown) return;

    if (g_firstMouse) {
        g_lastMouseX = static_cast<float>(xpos);
        g_lastMouseY = static_cast<float>(ypos);
        g_firstMouse = false;
        return;
    }

    float dx = static_cast<float>(xpos) - g_lastMouseX;
    float dy = static_cast<float>(ypos) - g_lastMouseY;

    g_camera.processMouse(dx, dy);

    g_lastMouseX = static_cast<float>(xpos);
    g_lastMouseY = static_cast<float>(ypos);
}

static void framebufferSizeCallback(GLFWwindow* /*window*/, int width, int height)
{
    g_screenWidth  = width;
    g_screenHeight = height;
    g_renderer.resize(width, height);
}

static void printDebugInfo()
{
    std::ostringstream title;
    title << "Lab 8 — Terrain Tessellation"
          << " | FPS: " << std::fixed << std::setprecision(0) << g_renderer.fps()
          << " | Tess: " << std::fixed << std::setprecision(1)
          << g_renderer.estimateTessLevel(g_camera)
          << " | Normals: " << (g_renderer.normalsEnabled() ? "ON" : "OFF")
          << " | Wire: " << (g_renderer.wireframeEnabled() ? "ON" : "OFF");
    glfwSetWindowTitle(g_window, title.str().c_str());

    g_frameCounter++;
    if (g_frameCounter % UI_UPDATE_FRAMES == 0) {
        std::cout << "\r[INFO] "
                  << "FPS: "      << std::fixed << std::setprecision(0) << std::setw(4) << g_renderer.fps()
                  << " | Tess: "  << std::fixed << std::setprecision(1) << std::setw(4)
                                   << g_renderer.estimateTessLevel(g_camera)
                  << " | Cam: ("   << std::fixed << std::setprecision(1)
                                   << g_camera.position().x << ", "
                                   << g_camera.position().y << ", "
                                   << g_camera.position().z << ")"
                  << " | Normals: " << (g_renderer.normalsEnabled() ? "ON " : "OFF")
                  << " | Wire: "   << (g_renderer.wireframeEnabled() ? "ON " : "OFF")
                  << "    " << std::flush;
    }
}

static void update(float dt)
{
    g_camera.processKeyboard(
        g_keys[GLFW_KEY_W],
        g_keys[GLFW_KEY_S],
        g_keys[GLFW_KEY_A],
        g_keys[GLFW_KEY_D],
        g_keys[GLFW_KEY_Q],
        g_keys[GLFW_KEY_E],
        dt
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

int main()
{
#ifdef _WIN32
    char exePath[MAX_PATH];
    GetModuleFileNameA(nullptr, exePath, MAX_PATH);
    std::string exeDir(exePath);
    exeDir = exeDir.substr(0, exeDir.find_last_of("\\/"));
    SetCurrentDirectoryA(exeDir.c_str());
#endif

    std::cout << "==============================================" << std::endl;
    std::cout << " Lab 8 — Terrain Tessellation Demo" << std::endl;
    std::cout << " OpenGL 4.0+ with Tessellation & Geometry Shaders" << std::endl;
    std::cout << "==============================================" << std::endl;
    std::cout << " Controls:" << std::endl;
    std::cout << "   WASD  — move camera" << std::endl;
    std::cout << "   Q/E   — down/up" << std::endl;
    std::cout << "   Mouse — look around (hold left button)" << std::endl;
    std::cout << "   N     — toggle normals visualization" << std::endl;
    std::cout << "   R     — toggle wireframe mode" << std::endl;
    std::cout << "   ESC   — exit" << std::endl;
    std::cout << "==============================================" << std::endl;

    glfwSetErrorCallback(glfwErrorCallback);

    if (!glfwInit()) {
        std::cerr << "[FATAL] Failed to initialize GLFW" << std::endl;
        return 1;
    }

    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 4);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 0);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GLFW_TRUE);
    glfwWindowHint(GLFW_RESIZABLE, GLFW_TRUE);
    glfwWindowHint(GLFW_SAMPLES, 4);

    g_window = glfwCreateWindow(g_screenWidth, g_screenHeight,
                                "Lab 8 — Terrain Tessellation",
                                nullptr, nullptr);
    if (!g_window) {
        std::cerr << "[FATAL] Failed to create GLFW window" << std::endl;
        glfwTerminate();
        return 1;
    }

    glfwMakeContextCurrent(g_window);
    glfwSwapInterval(1);

    if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress)) {
        std::cerr << "[FATAL] Failed to initialize GLAD" << std::endl;
        glfwDestroyWindow(g_window);
        glfwTerminate();
        return 1;
    }

    std::cout << "[OpenGL] Version:  " << glGetString(GL_VERSION) << std::endl;
    std::cout << "[OpenGL] Renderer: " << glGetString(GL_RENDERER) << std::endl;
    std::cout << "[OpenGL] Vendor:   " << glGetString(GL_VENDOR) << std::endl;
    std::cout << "[OpenGL] GLSL:     " << glGetString(GL_SHADING_LANGUAGE_VERSION) << std::endl;

    GLint maxTessLevel = 0;
    glGetIntegerv(GL_MAX_TESS_GEN_LEVEL, &maxTessLevel);
    std::cout << "[OpenGL] Max tessellation level: " << maxTessLevel << std::endl;

    glfwSetKeyCallback(g_window, keyCallback);
    glfwSetMouseButtonCallback(g_window, mouseButtonCallback);
    glfwSetCursorPosCallback(g_window, cursorPosCallback);
    glfwSetFramebufferSizeCallback(g_window, framebufferSizeCallback);

    glViewport(0, 0, g_screenWidth, g_screenHeight);

    if (!g_renderer.init()) {
        std::cerr << "[FATAL] Renderer initialization failed" << std::endl;
        glfwDestroyWindow(g_window);
        glfwTerminate();
        return 1;
    }

    g_lastFrameTime = static_cast<float>(glfwGetTime());

    std::cout << "\n[Main] Entering render loop...\n" << std::endl;

    while (!glfwWindowShouldClose(g_window))
    {
        float currentTime = static_cast<float>(glfwGetTime());
        float dt = currentTime - g_lastFrameTime;
        g_lastFrameTime = currentTime;
        g_totalTime += dt;

        dt = std::min(dt, 0.1f);

        update(dt);

        g_renderer.updateFPS(currentTime);
        g_renderer.render(g_camera, dt);

        printDebugInfo();

        glfwSwapBuffers(g_window);
        glfwPollEvents();
    }

    std::cout << "\n[Main] Shutting down..." << std::endl;

    glfwDestroyWindow(g_window);
    glfwTerminate();

    std::cout << "[Main] Done." << std::endl;
    return 0;
}
