#pragma once

#include "glad.h"

#define GLM_FORCE_PURE
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>

#include "shader.h"
#include "camera.h"
#include "terrain.h"

// ═══════════════════════════════════════════════════════════════════════════════
// Renderer — owns shader programs, terrain, and debug state.
//
// The render loop:
//   1. Clear framebuffer
//   2. Draw terrain with tessellation pipeline
//   3. (if enabled) Draw normals overlay with geometry-shader pipeline
//   4. (if enabled) Draw wireframe
// ═══════════════════════════════════════════════════════════════════════════════

class Renderer
{
public:
    Renderer();
    ~Renderer();

    // Must be called after OpenGL context is ready.
    bool init();

    // Main draw call. Pass camera and delta-time.
    void render(const Camera& camera, float dt);

    // Resize viewport.
    void resize(int width, int height);

    // Debug toggles
    void toggleNormals();
    void toggleWireframe();
    bool normalsEnabled()  const { return m_showNormals; }
    bool wireframeEnabled() const { return m_showWireframe; }

    // FPS
    float fps() const { return m_fps; }

    // Compute average tessellation level for debug display.
    // Estimates based on camera distance to terrain center.
    float estimateTessLevel(const Camera& camera) const;

private:
    Shader m_terrainShader;    // vert + tesc + tese + frag
    Shader m_normalsShader;    // vert + tesc + tese + geom + frag

    Terrain m_terrain;

    bool m_showNormals   = false;
    bool m_showWireframe = false;

    // Projection
    glm::mat4 m_projection = glm::mat4(1.0f);
    int m_screenWidth  = 1280;
    int m_screenHeight = 720;

    // FPS tracking (ring buffer, ported from lab7)
    static constexpr int FPS_RING_SIZE = 60;
    float m_fpsRing[FPS_RING_SIZE] = {};
    int   m_fpsRingIdx   = 0;
    int   m_fpsRingCount  = 0;
    float m_lastFpsTime   = 0.0f;
    float m_fps           = 0.0f;

    void updateFPS(float time);

    // Render parameters
    float m_maxTessLevel = 64.0f;
    float m_lodFactor    = 0.06f;
    float m_heightScale  = 10.0f;
    float m_normalLength = 1.5f;

    // Lighting
    glm::vec3 m_lightDir     = glm::normalize(glm::vec3(0.5f, 1.0f, 0.3f));
    glm::vec3 m_lightColor   = glm::vec3(1.0f, 0.95f, 0.85f);
    float     m_ambientStr   = 0.35f;

    // Shared uniforms helper
    void setCommonUniforms(const Shader& shader, const Camera& camera);
};

// ═══════════════════════════════════════════════════════════════════════════════
// Global GLFW error callback
void glfwErrorCallback(int error, const char* description);

// OpenGL debug message callback (GL 4.3+ KHR_debug)
void GLAD_APIENTRY glDebugCallback(GLenum source, GLenum type, GLuint id,
                                   GLenum severity, GLsizei length,
                                   const GLchar* message, const void* userParam);
