#pragma once
#include "../engine/Shader.h"
#include "../engine/Mesh.h"
#include "../engine/Texture.h"
#include "../engine/Camera.h"
#include <glm/glm.hpp>

class Court
{
public:
    Court() = default;

    bool init();
    void render(const Camera& camera);
    void cleanup();

    static constexpr float WIDTH = 20.0f;
    static constexpr float HEIGHT = 10.0f;
    static constexpr float DEPTH = 12.0f;

    float leftWall()   const { return -WIDTH / 2.0f; }
    float rightWall()  const { return  WIDTH / 2.0f; }
    float topWall()    const { return  HEIGHT / 2.0f; }
    float bottomWall() const { return -HEIGHT / 2.0f; }

    GLuint getSkyboxTexture() const { return m_skyboxTex.id(); }

private:
    void generateFloor();
    void generateWalls();
    void generateSkybox();
    void generateSkyboxTexture();
    void generateBumpMaps();
    void generateTextures();
    void computeTangents(std::vector<Vertex>& verts, const std::vector<GLuint>& indices);

    Shader m_shader;          
    Shader m_skyboxShader;   

    Mesh m_floorMesh;
    Mesh m_frontBackMesh;     
    Mesh m_topCeilMesh;       
    Mesh m_leftRightMesh;     
    Mesh m_skyboxMesh;

    Texture m_bumpMap;       
    Texture m_wallBumpMap;    
    Texture m_skyboxTex;
    Texture m_floorTex;
    Texture m_wallTex;
    Texture m_goalTex;

    glm::vec3 m_floorColor     { 0.60f, 0.40f, 0.20f };  
    glm::vec3 m_backWallColor  { 0.75f, 0.65f, 0.45f };  
    glm::vec3 m_topWallColor   { 0.85f, 0.78f, 0.60f };  
    glm::vec3 m_goalWallColor  { 0.90f, 0.20f, 0.15f };  
};
