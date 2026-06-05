#pragma once

#include <string>
#include <unordered_map>
#include "glad.h"

#define GLM_FORCE_PURE
#include <glm/glm.hpp>
#include <glm/gtc/type_ptr.hpp>

// ═══════════════════════════════════════════════════════════════════════════════
// Minimal OpenGL shader program wrapper.
// Loads vertex / tess-control / tess-eval / geometry / fragment shaders from
// separate files and links them into a single program.
// ═══════════════════════════════════════════════════════════════════════════════

class Shader
{
public:
    Shader() = default;
    ~Shader();

    // File paths may be empty for stages that are not used.
    bool loadFromFiles(const std::string& vertPath,
                       const std::string& tescPath,
                       const std::string& tesePath,
                       const std::string& geomPath,
                       const std::string& fragPath);

    void use() const;
    GLuint id() const { return m_program; }
    bool valid() const { return m_program != 0; }

    // Uniform setters
    void setInt(const std::string& name, int value) const;
    void setFloat(const std::string& name, float value) const;
    void setVec2(const std::string& name, const glm::vec2& v) const;
    void setVec3(const std::string& name, const glm::vec3& v) const;
    void setVec4(const std::string& name, const glm::vec4& v) const;
    void setMat4(const std::string& name, const glm::mat4& m) const;

private:
    GLuint m_program = 0;

    GLuint compileShader(GLenum type, const std::string& source);
    GLint getUniformLocation(const std::string& name) const;
    mutable std::unordered_map<std::string, GLint> m_uniformCache;

    void clear();
};
