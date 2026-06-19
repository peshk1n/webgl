#pragma once
#include <glad/glad.h>
#include <string>
#include <vector>

class Texture
{
public:
    Texture() = default;
    ~Texture();

    Texture(const Texture&) = delete;
    Texture& operator=(const Texture&) = delete;
    Texture(Texture&& other) noexcept;
    Texture& operator=(Texture&& other) noexcept;

    bool load2D(const std::string& path, bool sRGB = true);
    bool loadCubemap(const std::vector<std::string>& faces);

    // Create from raw pixel data (for procedural textures)
    bool create2D(int width, int height, GLenum internalFormat, GLenum format, const void* data, bool mipmap = true);
    bool createCubemapFace(int faceSize, GLenum internalFormat, GLenum format, const void* data[6]);

    void bind(unsigned int unit = 0) const;
    void unbind() const;

    GLuint id() const { return m_texture; }

private:
    GLuint m_texture = 0;
    GLenum m_target = GL_TEXTURE_2D;
};
