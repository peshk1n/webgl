#pragma once

#include "glad.h"

#define GLM_FORCE_PURE
#include <glm/glm.hpp>

#include <vector>

struct TerrainPatch
{
    glm::vec3 corners[4];
    glm::vec2 uvs[4];
};

class Terrain
{
public:
    static constexpr int GRID_SIZE = 10;  
    static constexpr int HEIGHTMAP_W = 256;
    static constexpr int HEIGHTMAP_H = 256;
    static constexpr float WORLD_SIZE = 60.0f;  

    Terrain();
    ~Terrain();

    void init();
    void bind() const;
    GLsizei patchCount() const { return static_cast<GLsizei>(m_patches.size()); }
    GLuint heightmapTexture() const { return m_heightmapTex; }

    const std::vector<TerrainPatch>& patches() const { return m_patches; }

private:
    std::vector<TerrainPatch> m_patches;
    std::vector<glm::vec3>    m_vertices;    // interleaved positions for VAO
    std::vector<glm::vec2>    m_texCoords;   // interleaved UVs for VAO
    std::vector<GLushort>     m_indices;     // patch primitive indices

    GLuint m_vao = 0;
    GLuint m_vbo = 0;
    GLuint m_tbo = 0;      // texcoord buffer
    GLuint m_ibo = 0;
    GLuint m_heightmapTex = 0;

    // Procedural heightmap generation
    std::vector<float> generateHeightmapData();
    void uploadHeightmap(const std::vector<float>& data);

    // Populate patch grid
    void generatePatches();
    void createBuffers();
};
