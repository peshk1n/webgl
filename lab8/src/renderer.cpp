#include "renderer.h"

#include <iostream>
#include <iomanip>
#include <sstream>
#include <cmath>
#include <algorithm>

// ═══════════════════════════════════════════════════════════════════════════════
// GLFW error callback
// ═══════════════════════════════════════════════════════════════════════════════
void glfwErrorCallback(int error, const char* description)
{
    std::cerr << "[GLFW] Error " << error << ": " << description << std::endl;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OpenGL debug message callback 
// ═══════════════════════════════════════════════════════════════════════════════
void GLAD_APIENTRY glDebugCallback(GLenum source, GLenum type, GLuint id,
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

// ═══════════════════════════════════════════════════════════════════════════════
// Renderer implementation
// ═══════════════════════════════════════════════════════════════════════════════

Renderer::Renderer() = default;

Renderer::~Renderer() = default;

bool Renderer::init()
{
    if (glDebugMessageCallback) {
        glEnable(GL_DEBUG_OUTPUT);
        glEnable(GL_DEBUG_OUTPUT_SYNCHRONOUS);
        glDebugMessageCallback(glDebugCallback, nullptr);
        glDebugMessageControl(GL_DONT_CARE, GL_DONT_CARE,
                              GL_DEBUG_SEVERITY_NOTIFICATION, 0, nullptr, GL_FALSE);
    }

    bool terrainOk = m_terrainShader.loadFromFiles(
        "resources/shaders/terrain.vert",
        "resources/shaders/terrain.tesc",
        "resources/shaders/terrain.tese",
        "",                                  
        "resources/shaders/terrain.frag"
    );
    if (!terrainOk) {
        std::cerr << "[Renderer] Failed to load terrain shader!" << std::endl;
        return false;
    }

    
    bool normalsOk = m_normalsShader.loadFromFiles(
        "resources/shaders/normals.vert",
        "resources/shaders/normals.tesc",
        "resources/shaders/normals.tese",
        "resources/shaders/normals.geom",
        "resources/shaders/normals.frag"
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

void Renderer::resize(int width, int height)
{
    m_screenWidth  = width;
    m_screenHeight = height;
    float aspect = static_cast<float>(width) / std::max(height, 1);
    m_projection = glm::perspective(glm::radians(45.0f), aspect, 0.5f, 300.0f);
    glViewport(0, 0, width, height);
}

void Renderer::toggleNormals()
{
    m_showNormals = !m_showNormals;
    std::cout << "[Renderer] Normals visualization: "
              << (m_showNormals ? "ON" : "OFF") << std::endl;
}

void Renderer::toggleWireframe()
{
    m_showWireframe = !m_showWireframe;
    std::cout << "[Renderer] Wireframe mode: "
              << (m_showWireframe ? "ON" : "OFF") << std::endl;
}

void Renderer::setCommonUniforms(const Shader& shader, const Camera& camera)
{
    shader.setMat4("uModel",      glm::mat4(1.0f));
    shader.setMat4("uView",       camera.getViewMatrix());
    shader.setMat4("uProjection", m_projection);
    shader.setVec3("uCameraPosition", camera.position());
    shader.setFloat("uMaxTessLevel", m_maxTessLevel);
    shader.setFloat("uLODFactor",    m_lodFactor);
    shader.setFloat("uHeightScale",  m_heightScale);
    shader.setInt("uHeightmap", 0);   // texture unit 0
}

float Renderer::estimateTessLevel(const Camera& camera) const
{
    glm::vec3 terrainCenter(0.0f, 5.0f, 0.0f);  
    float dist = glm::length(camera.position() - terrainCenter);
    float tess = m_maxTessLevel / (1.0f + dist * m_lodFactor);
    return std::clamp(tess, 1.0f, m_maxTessLevel);
}

void Renderer::updateFPS(float time)
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

void Renderer::render(const Camera& camera, float dt)
{
    // Wireframe mode
    if (m_showWireframe) {
        glPolygonMode(GL_FRONT_AND_BACK, GL_LINE);
    } else {
        glPolygonMode(GL_FRONT_AND_BACK, GL_FILL);
    }

    // Clear
    glClearColor(0.05f, 0.08f, 0.15f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glEnable(GL_DEPTH_TEST);

    // ── Pass 1: Terrain ────────────────────────────────────────────────────
    m_terrainShader.use();
    setCommonUniforms(m_terrainShader, camera);

    // Lighting uniforms (only terrain shader has them)
    m_terrainShader.setVec3("uLightDirection",  m_lightDir);
    m_terrainShader.setVec3("uLightColor",      m_lightColor);
    m_terrainShader.setFloat("uAmbientStrength", m_ambientStr);

    // Bind heightmap to texture unit 0
    glActiveTexture(GL_TEXTURE0);
    glBindTexture(GL_TEXTURE_2D, m_terrain.heightmapTexture());

    // Set patch vertex count and draw
    glPatchParameteri(GL_PATCH_VERTICES, 4);
    m_terrain.bind();
    glDrawElements(GL_PATCHES, m_terrain.patchCount() * 4, GL_UNSIGNED_SHORT, 0);

    // ── Pass 2: Normals overlay (optional) ────────────────────────────────
    if (m_showNormals) {
        m_normalsShader.use();
        setCommonUniforms(m_normalsShader, camera);

        m_normalsShader.setFloat("uNormalLength", m_normalLength);

        // Re-bind heightmap (same texture unit 0)
        glActiveTexture(GL_TEXTURE0);
        glBindTexture(GL_TEXTURE_2D, m_terrain.heightmapTexture());

        glPatchParameteri(GL_PATCH_VERTICES, 4);
        m_terrain.bind();
        glDrawElements(GL_PATCHES, m_terrain.patchCount() * 4, GL_UNSIGNED_SHORT, 0);
    }

    // Restore polygon mode to fill
    if (m_showWireframe) {
        glPolygonMode(GL_FRONT_AND_BACK, GL_FILL);
    }

    // ── Check for OpenGL errors (debug builds) ─────────────────────────────
#ifdef _DEBUG
    GLenum err;
    while ((err = glGetError()) != GL_NO_ERROR) {
        std::cerr << "[GL] Error after render: " << err << std::endl;
    }
#endif
}
