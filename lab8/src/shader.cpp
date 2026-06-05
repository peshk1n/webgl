#include "shader.h"

#include <fstream>
#include <sstream>
#include <iostream>

// ═══════════════════════════════════════════════════════════════════════════════
// Utility: read entire file into a string
// ═══════════════════════════════════════════════════════════════════════════════
static std::string readFile(const std::string& path)
{
    std::ifstream file(path);
    if (!file.is_open()) {
        std::cerr << "[Shader] Cannot open file: " << path << std::endl;
        return "";
    }
    std::stringstream buffer;
    buffer << file.rdbuf();
    return buffer.str();
}

// ═══════════════════════════════════════════════════════════════════════════════
Shader::~Shader()
{
    clear();
}

void Shader::clear()
{
    if (m_program) {
        glDeleteProgram(m_program);
        m_program = 0;
    }
    m_uniformCache.clear();
}

GLuint Shader::compileShader(GLenum type, const std::string& source)
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

bool Shader::loadFromFiles(const std::string& vertPath,
                           const std::string& tescPath,
                           const std::string& tesePath,
                           const std::string& geomPath,
                           const std::string& fragPath)
{
    // Read all source files
    std::string vertSrc = vertPath.empty() ? "" : readFile(vertPath);
    std::string tescSrc = tescPath.empty() ? "" : readFile(tescPath);
    std::string teseSrc = tesePath.empty() ? "" : readFile(tesePath);
    std::string geomSrc = geomPath.empty() ? "" : readFile(geomPath);
    std::string fragSrc = fragPath.empty() ? "" : readFile(fragPath);

    // Compile individual shaders
    GLuint vs  = compileShader(GL_VERTEX_SHADER,          vertSrc);
    GLuint tcs = compileShader(GL_TESS_CONTROL_SHADER,    tescSrc);
    GLuint tes = compileShader(GL_TESS_EVALUATION_SHADER, teseSrc);
    GLuint gs  = compileShader(GL_GEOMETRY_SHADER,        geomSrc);
    GLuint fs  = compileShader(GL_FRAGMENT_SHADER,        fragSrc);

    // Link program
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

    // Cleanup shader objects (already linked into program)
    auto detachAndDelete = [&](GLuint s) {
        if (s) { glDetachShader(m_program, s); glDeleteShader(s); }
    };
    detachAndDelete(vs);
    detachAndDelete(tcs);
    detachAndDelete(tes);
    detachAndDelete(gs);
    detachAndDelete(fs);

    m_uniformCache.clear();
    return m_program != 0;
}

void Shader::use() const
{
    glUseProgram(m_program);
}

GLint Shader::getUniformLocation(const std::string& name) const
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

void Shader::setInt(const std::string& name, int value) const
{
    glUniform1i(getUniformLocation(name), value);
}

void Shader::setFloat(const std::string& name, float value) const
{
    glUniform1f(getUniformLocation(name), value);
}

void Shader::setVec2(const std::string& name, const glm::vec2& v) const
{
    glUniform2fv(getUniformLocation(name), 1, glm::value_ptr(v));
}

void Shader::setVec3(const std::string& name, const glm::vec3& v) const
{
    glUniform3fv(getUniformLocation(name), 1, glm::value_ptr(v));
}

void Shader::setVec4(const std::string& name, const glm::vec4& v) const
{
    glUniform4fv(getUniformLocation(name), 1, glm::value_ptr(v));
}

void Shader::setMat4(const std::string& name, const glm::mat4& m) const
{
    glUniformMatrix4fv(getUniformLocation(name), 1, GL_FALSE, glm::value_ptr(m));
}
