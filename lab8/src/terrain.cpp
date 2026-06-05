#include "terrain.h"

#include <glm/gtc/noise.hpp>      
#include <glm/gtc/constants.hpp>
#include <iostream>
#include <cmath>

// ═══════════════════════════════════════════════════════════════════════════════
// Procedural heightmap — layered simplex noise
// ═══════════════════════════════════════════════════════════════════════════════
std::vector<float> Terrain::generateHeightmapData()
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
            h /= totalAmp;          // normalize to [-1, 1]
            h = h * 0.5f + 0.5f;    // remap to [0, 1]

            // Add some ridges / mountain peaks
            float ridge = 1.0f - std::abs(h * 2.0f - 1.0f);
            h = h * 0.7f + ridge * 0.3f;

            // Edge attenuation — smoothly fade to 0 at borders for a natural island
            float edgeX = std::sin(nx * glm::pi<float>());
            float edgeY = std::sin(ny * glm::pi<float>());
            float edgeFade = edgeX * edgeY;
            edgeFade = std::pow(edgeFade, 0.5f);   // softer fade
            h *= edgeFade;

            data[y * HEIGHTMAP_W + x] = h;
        }
    }
    return data;
}

void Terrain::uploadHeightmap(const std::vector<float>& data)
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

// ═══════════════════════════════════════════════════════════════════════════════
// Patch grid — 10×10 quad patches covering world-space
// ═══════════════════════════════════════════════════════════════════════════════
void Terrain::generatePatches()
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

            // UV corners
            float u0 = static_cast<float>(ix) / GRID_SIZE;
            float u1 = static_cast<float>(ix + 1) / GRID_SIZE;
            float v0 = static_cast<float>(iz) / GRID_SIZE;
            float v1 = static_cast<float>(iz + 1) / GRID_SIZE;

            TerrainPatch patch;
            // CCW order for quads
            patch.corners[0] = glm::vec3(x0, 0.0f, z0);
            patch.corners[1] = glm::vec3(x1, 0.0f, z0);
            patch.corners[2] = glm::vec3(x1, 0.0f, z1);
            patch.corners[3] = glm::vec3(x0, 0.0f, z1);

            patch.uvs[0] = glm::vec2(u0, v0);
            patch.uvs[1] = glm::vec2(u1, v0);
            patch.uvs[2] = glm::vec2(u1, v1);
            patch.uvs[3] = glm::vec2(u0, v1);

            m_patches.push_back(patch);

            // Build interleaved vertex arrays for VAO
            GLushort baseIdx = static_cast<GLushort>(m_vertices.size());
            for (int i = 0; i < 4; ++i) {
                m_vertices.push_back(patch.corners[i]);
                m_texCoords.push_back(patch.uvs[i]);
            }
            // One quad = 4 vertices → draw as GL_PATCHES with glPatchParameteri(4)
            m_indices.push_back(baseIdx);
            m_indices.push_back(baseIdx + 1);
            m_indices.push_back(baseIdx + 2);
            m_indices.push_back(baseIdx + 3);
        }
    }

    std::cout << "[Terrain] Generated " << m_patches.size() << " patches, "
              << m_vertices.size() << " vertices" << std::endl;
}

void Terrain::createBuffers()
{
    glGenVertexArrays(1, &m_vao);
    glBindVertexArray(m_vao);

    // Vertex positions (location = 0)
    glGenBuffers(1, &m_vbo);
    glBindBuffer(GL_ARRAY_BUFFER, m_vbo);
    glBufferData(GL_ARRAY_BUFFER,
                 m_vertices.size() * sizeof(glm::vec3),
                 m_vertices.data(), GL_STATIC_DRAW);
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, sizeof(glm::vec3), (void*)0);
    glEnableVertexAttribArray(0);

    // TexCoords (location = 1)
    glGenBuffers(1, &m_tbo);
    glBindBuffer(GL_ARRAY_BUFFER, m_tbo);
    glBufferData(GL_ARRAY_BUFFER,
                 m_texCoords.size() * sizeof(glm::vec2),
                 m_texCoords.data(), GL_STATIC_DRAW);
    glVertexAttribPointer(1, 2, GL_FLOAT, GL_FALSE, sizeof(glm::vec2), (void*)0);
    glEnableVertexAttribArray(1);

    // Element array (patches)
    glGenBuffers(1, &m_ibo);
    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, m_ibo);
    glBufferData(GL_ELEMENT_ARRAY_BUFFER,
                 m_indices.size() * sizeof(GLushort),
                 m_indices.data(), GL_STATIC_DRAW);

    glBindVertexArray(0);
}

// ═══════════════════════════════════════════════════════════════════════════════
Terrain::Terrain() = default;

Terrain::~Terrain()
{
    if (m_vao)  glDeleteVertexArrays(1, &m_vao);
    if (m_vbo)  glDeleteBuffers(1, &m_vbo);
    if (m_tbo)  glDeleteBuffers(1, &m_tbo);
    if (m_ibo)  glDeleteBuffers(1, &m_ibo);
    if (m_heightmapTex) glDeleteTextures(1, &m_heightmapTex);
}

void Terrain::init()
{
    auto heightData = generateHeightmapData();
    uploadHeightmap(heightData);
    generatePatches();
    createBuffers();

    std::cout << "[Terrain] Initialized — heightmap " << HEIGHTMAP_W << "×" << HEIGHTMAP_H << std::endl;
}

void Terrain::bind() const
{
    glBindVertexArray(m_vao);
}
