#include "Court.h"
#include <glm/gtc/matrix_transform.hpp>
#include <iostream>
#include <vector>

// === OBJECT-SPACE NORMAL-MAPPED SHADER (no TBN, no tangents needed) ===
static const char* vertSrc = R"(
#version 330 core
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aTexCoord;

out vec3 FragPos;
out vec2 TexCoord;
out vec3 WorldNormal;
out vec2 vVelocity;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

void main()
{
    FragPos = vec3(uModel * vec4(aPos, 1.0));
    WorldNormal = mat3(transpose(inverse(uModel))) * aNormal;
    TexCoord = aTexCoord;
    gl_Position = uProjection * uView * vec4(FragPos, 1.0);
    vVelocity = vec2(0.0);
}
)";

static const char* fragSrc = R"(
#version 330 core
layout(location = 0) out vec4 FragColor;
layout(location = 1) out vec2 FragVelocity;

in vec3 FragPos;
in vec2 TexCoord;
in vec3 WorldNormal;
in vec2 vVelocity;

uniform sampler2D uTexture;
uniform sampler2D uBumpMap;
uniform bool   uUseBump;
uniform vec3   uBaseNormal;   
uniform float  uBumpScale;  

uniform vec3 uViewPos;

void main()
{
    vec4 texColor = texture(uTexture, TexCoord);

    vec3 N;
    if (uUseBump)
    {
        vec3 bump = texture(uBumpMap, TexCoord).rgb * 2.0 - 1.0;
        vec3 T1 = normalize(cross(uBaseNormal, vec3(0.0, 1.0, 0.0)));
        if (length(T1) < 0.01) T1 = normalize(cross(uBaseNormal, vec3(1.0, 0.0, 0.0)));
        vec3 T2 = cross(T1, uBaseNormal);
        vec3 perturbed = uBaseNormal + (T1 * bump.x + T2 * bump.y) * uBumpScale;
        N = normalize(perturbed);
    }
    else
    {
        N = normalize(WorldNormal);
    }

    vec3 V = normalize(uViewPos - FragPos);
    vec3 L = normalize(vec3(0.3, 0.8, 0.5));
    vec3 H = normalize(L + V);

    float NdotL = max(dot(N, L), 0.0);
    float spec = pow(max(dot(N, H), 0.0), 32.0);

    vec3 ambient = texColor.rgb * 0.70;
    vec3 diffuse = texColor.rgb * NdotL * 0.55;
    vec3 specular = vec3(0.35) * spec;

    FragColor = vec4(ambient + diffuse + specular, 1.0);
    FragVelocity = vec2(0.0);
}
)";

static const char* vertTex = R"(
#version 330 core
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aTexCoord;
out vec3 FragPos;
out vec2 TexCoord;
out vec3 Normal;
out vec2 vVelocity;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
void main() {
    FragPos = vec3(uModel * vec4(aPos, 1.0));
    Normal = mat3(transpose(inverse(uModel))) * aNormal;
    TexCoord = aTexCoord;
    gl_Position = uProjection * uView * vec4(FragPos, 1.0);
    vVelocity = vec2(0.0);
}
)";
static const char* fragTex = R"(
#version 330 core
layout(location = 0) out vec4 FragColor;
layout(location = 1) out vec2 FragVelocity;
in vec3 FragPos;
in vec2 TexCoord;
in vec3 Normal;
in vec2 vVelocity;
uniform sampler2D uTexture;
uniform vec3 uViewPos;
void main() {
    vec4 tex = texture(uTexture, TexCoord);
    vec3 N = normalize(Normal);
    vec3 V = normalize(uViewPos - FragPos);
    vec3 L = normalize(vec3(0.3, 0.8, 0.5));
    vec3 H = normalize(L + V);
    float NdotL = max(dot(N, L), 0.0);
    float spec = pow(max(dot(N, H), 0.0), 32.0);
    FragColor = vec4(tex.rgb * 0.55 + tex.rgb * NdotL * 0.45 + vec3(0.25) * spec, 1.0);
    FragVelocity = vec2(0.0);
}
)";


static const char* skyVertSrc = R"(
#version 330 core
layout(location = 0) in vec3 aPos;
out vec3 TexCoords;
uniform mat4 uView;
uniform mat4 uProjection;
void main() {
    TexCoords = aPos;
    vec4 pos = uProjection * mat4(mat3(uView)) * vec4(aPos, 1.0);
    gl_Position = pos.xyww;
}
)";

static const char* skyFragSrc = R"(
#version 330 core
out vec4 FragColor;
in vec3 TexCoords;
uniform samplerCube uSkybox;
void main() {
    FragColor = texture(uSkybox, TexCoords);
}
)";


void Court::computeTangents(std::vector<Vertex>& verts, const std::vector<GLuint>& indices)
{
    for (size_t i = 0; i + 2 < indices.size(); i += 3)
    {
        Vertex& v0 = verts[indices[i]];
        Vertex& v1 = verts[indices[i + 1]];
        Vertex& v2 = verts[indices[i + 2]];

        glm::vec3 e1 = v1.position - v0.position;
        glm::vec3 e2 = v2.position - v0.position;
        glm::vec2 duv1 = v1.texCoord - v0.texCoord;
        glm::vec2 duv2 = v2.texCoord - v0.texCoord;

        float f = 1.0f / (duv1.x * duv2.y - duv2.x * duv1.y);
        glm::vec3 tangent;
        tangent.x = f * (duv2.y * e1.x - duv1.y * e2.x);
        tangent.y = f * (duv2.y * e1.y - duv1.y * e2.y);
        tangent.z = f * (duv2.y * e1.z - duv1.y * e2.z);

        v0.tangent += tangent;
        v1.tangent += tangent;
        v2.tangent += tangent;
    }
    for (auto& v : verts)
        if (glm::length(v.tangent) > 0.0001f)
            v.tangent = glm::normalize(v.tangent);
}

bool Court::init()
{
    if (!m_shader.load(vertSrc, fragSrc))
        { std::cerr << "Court shader failed!\n"; return false; }
    

    std::cout << "Court shaders loaded OK\n";

    generateBumpMaps();
    generateTextures();
    generateFloor();
    generateWalls();
    generateSkybox();
    generateSkyboxTexture();
    return true;
}

void Court::cleanup() {}

void Court::render(const Camera& camera)
{
    glDisable(GL_CULL_FACE);

    glm::mat4 view = camera.getViewMatrix();
    glm::mat4 proj = camera.getProjectionMatrix();

    m_shader.use();
    m_shader.setUniform("uView", view);
    m_shader.setUniform("uProjection", proj);
    m_shader.setUniform("uViewPos", camera.getPosition());
    m_shader.setUniform("uModel", glm::mat4(1.0f));

    
    m_shader.setUniform("uUseBump", true);
    m_shader.setUniform("uBumpScale", 0.15f);
    m_shader.setUniform("uBaseNormal", glm::vec3(0.0f, 1.0f, 0.0f));   // up
    m_floorTex.bind(0);
    m_shader.setUniform("uTexture", 0);
    m_bumpMap.bind(1);
    m_shader.setUniform("uBumpMap", 1);
    m_floorMesh.draw();

    m_shader.setUniform("uBaseNormal", glm::vec3(0.0f, 0.0f, 1.0f));   // toward camera
    m_wallTex.bind(0);
    m_wallBumpMap.bind(1);
    m_shader.setUniform("uBumpMap", 1);
    m_frontBackMesh.draw();

    m_shader.setUniform("uBaseNormal", glm::vec3(0.0f, -1.0f, 0.0f));  // down
    m_bumpMap.bind(1);
    m_shader.setUniform("uBumpMap", 1);
    m_topCeilMesh.draw();

    m_shader.setUniform("uBaseNormal", glm::vec3(1.0f, 0.0f, 0.0f));   // right (GLM applies model=identity)
    m_goalTex.bind(0);
    m_bumpMap.bind(1);
    m_shader.setUniform("uBumpMap", 1);
    m_leftRightMesh.draw();

    glEnable(GL_CULL_FACE);
}

void Court::generateFloor()
{
    float hw = WIDTH / 2.0f;
    float hd = DEPTH / 2.0f;
    float y = -HEIGHT / 2.0f;

    std::vector<Vertex> verts = {
        {{-hw, y, -hd}, {0,1,0}, {0,0}},
        {{-hw, y,  hd}, {0,1,0}, {0,6}},
        {{ hw, y,  hd}, {0,1,0}, {10,6}},
        {{ hw, y, -hd}, {0,1,0}, {10,0}},
    };
    std::vector<GLuint> indices = { 0, 1, 2, 2, 3, 0 };
    computeTangents(verts, indices);
    m_floorMesh.create(verts, indices);
}

void Court::generateWalls()
{
    float hw = WIDTH / 2.0f;
    float hh = HEIGHT / 2.0f;
    float hd = DEPTH / 2.0f;

    auto addQuadCCW = [&](std::vector<Vertex>& v, std::vector<GLuint>& idx,
        glm::vec3 lb, glm::vec3 rb, glm::vec3 rt, glm::vec3 lt,
        glm::vec3 n, float uScale, float vScale)
    {
        GLuint base = static_cast<GLuint>(v.size());
        v.push_back({lb, n, {0, 0}});
        v.push_back({rb, n, {uScale, 0}});
        v.push_back({rt, n, {uScale, vScale}});
        v.push_back({lt, n, {0, vScale}});
        idx.insert(idx.end(), {base, base+1, base+2, base+2, base+3, base});
    };

    {
        std::vector<Vertex> verts;
        std::vector<GLuint> indices;
        addQuadCCW(verts, indices, {-hw,-hh,-hd}, { hw,-hh,-hd}, { hw,hh,-hd}, {-hw,hh,-hd}, {0,0, 1}, 4,2);
        computeTangents(verts, indices);
        m_frontBackMesh.create(verts, indices);
    }
    {
        std::vector<Vertex> verts;
        std::vector<GLuint> indices;
        addQuadCCW(verts, indices, {-hw,hh,hd}, {hw,hh,hd}, {hw,hh,-hd}, {-hw,hh,-hd}, {0,-1,0}, 4,2);
        computeTangents(verts, indices);
        m_topCeilMesh.create(verts, indices);
    }
    {
        std::vector<Vertex> verts;
        std::vector<GLuint> indices;
        addQuadCCW(verts, indices, {-hw,-hh,-hd}, {-hw,-hh,hd}, {-hw,hh,hd}, {-hw,hh,-hd}, {1,0,0}, 2,2);
        addQuadCCW(verts, indices, { hw,-hh, hd}, { hw,-hh,-hd}, { hw,hh,-hd}, { hw,hh, hd}, {-1,0,0}, 2,2);
        m_leftRightMesh.create(verts, indices);
    }
}

void Court::generateSkybox()
{
    float v[] = {
        -1, 1,-1, -1,-1,-1,  1,-1,-1,  1,-1,-1,  1, 1,-1, -1, 1,-1,
        -1,-1, 1, -1,-1,-1, -1, 1,-1, -1, 1,-1, -1, 1, 1, -1,-1, 1,
         1,-1,-1,  1,-1, 1,  1, 1, 1,  1, 1, 1,  1, 1,-1,  1,-1,-1,
        -1,-1, 1, -1, 1, 1,  1, 1, 1,  1, 1, 1,  1,-1, 1, -1,-1, 1,
        -1, 1,-1,  1, 1,-1,  1, 1, 1,  1, 1, 1, -1, 1, 1, -1, 1,-1,
        -1,-1,-1, -1,-1, 1,  1,-1,-1,  1,-1,-1, -1,-1, 1,  1,-1, 1,
    };
    std::vector<Vertex> verts(36);
    for (int i = 0; i < 36; i++)
        verts[i] = { glm::vec3(v[i*3], v[i*3+1], v[i*3+2]), {0,0,0}, {0,0} };
    std::vector<GLuint> indices(36);
    for (size_t i = 0; i < 36; i++) indices[i] = static_cast<GLuint>(i);
    m_skyboxMesh.create(verts, indices);
}

static void generateBumpMap(Texture& tex, int size, int cellPx)
{
    unsigned char* data = new unsigned char[size * size * 3];
    for (int y = 0; y < size; y++)
    {
        for (int x = 0; x < size; x++)
        {
            float bx = (x % cellPx) / (float)cellPx;  
            float by = (y % cellPx) / (float)cellPx;
            float nx = (bx - 0.5f) * 2.0f;  
            float ny = (by - 0.5f) * 2.0f;  
            int idx = (y * size + x) * 3;
            data[idx+0] = (unsigned char)((nx * 0.5f + 0.5f) * 255);  
            data[idx+1] = (unsigned char)((ny * 0.5f + 0.5f) * 255);
            data[idx+2] = 128;  
        }
    }
    tex.create2D(size, size, GL_RGB, GL_RGB, data, false);
    delete[] data;
}

void Court::generateBumpMaps()
{
    generateBumpMap(m_bumpMap, 256, 32);     
    generateBumpMap(m_wallBumpMap, 256, 64);  
}

void Court::generateSkyboxTexture()
{
    const int fs = 64;
    unsigned char fdata[6][fs * fs * 3];
    const void* fptr[6];
    for (int face = 0; face < 6; face++)
    {
        fptr[face] = fdata[face];
        for (int y = 0; y < fs; y++)
            for (int x = 0; x < fs; x++)
            {
                float fy = (float)y / fs;
                float r, g, b;
                if (face == 2)      { r=0.85f; g=0.78f; b=0.60f; } // +Y top = cream
                else if (face == 3) { r=0.60f; g=0.40f; b=0.20f; } // -Y bottom = brown
                else if (face == 0 || face == 1) { r=0.90f; g=0.20f; b=0.15f; } // ±X left/right = RED
                else if (face == 4) { r=0.75f; g=0.65f; b=0.45f; } // +Z back = cream
                else                { r=0.30f; g=0.30f; b=0.30f; } // -Z front = dark
                int idx = (y * fs + x) * 3;
                fdata[face][idx+0] = (unsigned char)(r*255);
                fdata[face][idx+1] = (unsigned char)(g*255);
                fdata[face][idx+2] = (unsigned char)(b*255);
            }
    }
    m_skyboxTex.createCubemapFace(fs, GL_SRGB, GL_RGB, fptr);
}

void Court::generateTextures()
{
    {
        const int s = 256;
        unsigned char data[s * s * 3];
        for (int y = 0; y < s; y++)
            for (int x = 0; x < s; x++)
            {
                bool light = ((x / 32) + (y / 32)) % 2 == 0;
                int i = (y * s + x) * 3;
                data[i+0] = light ? 205 : 130;
                data[i+1] = light ? 160 : 95;
                data[i+2] = light ? 110 : 55;
            }
        m_floorTex.create2D(s, s, GL_RGB, GL_RGB, data, true);
    }
    {
        const int s = 256;
        unsigned char data[s * s * 3];
        for (int y = 0; y < s; y++)
            for (int x = 0; x < s; x++)
            {
                bool line = (x % 64 < 2) || (y % 64 < 2);
                int i = (y * s + x) * 3;
                data[i+0] = line ? 155 : 195;
                data[i+1] = line ? 125 : 165;
                data[i+2] = line ? 85  : 125;
            }
        m_wallTex.create2D(s, s, GL_RGB, GL_RGB, data, true);
    }
    {
        const int s = 256;
        unsigned char data[s * s * 3];
        for (int y = 0; y < s; y++)
            for (int x = 0; x < s; x++)
            {
                bool line = (x % 32 < 2) || (y % 32 < 2);
                int i = (y * s + x) * 3;
                data[i+0] = line ? 135 : 195;
                data[i+1] = line ? 28  : 45;
                data[i+2] = line ? 28  : 45;
            }
        m_goalTex.create2D(s, s, GL_RGB, GL_RGB, data, true);
    }
}
