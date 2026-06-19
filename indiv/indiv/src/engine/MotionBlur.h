#pragma once
#include <glad/glad.h>

// FBO for velocity-buffer motion blur (2 MRT: color + velocity)
struct MotionBlurFBO
{
    GLuint fbo = 0;
    GLuint colorTex = 0;     // GL_RGB
    GLuint velocityTex = 0;  // GL_RG16F signed NDC velocity
    GLuint depthRBO = 0;
    int width = 1280, height = 720;

    bool init(int w, int h)
    {
        width = w; height = h;

        glGenFramebuffers(1, &fbo);
        glBindFramebuffer(GL_FRAMEBUFFER, fbo);

        // Color attachment 0
        glGenTextures(1, &colorTex);
        glBindTexture(GL_TEXTURE_2D, colorTex);
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, w, h, 0, GL_RGB, GL_UNSIGNED_BYTE, nullptr);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
        glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, colorTex, 0);

        // Velocity attachment 1 — GL_RGBA16F (float precision, signed)
        glGenTextures(1, &velocityTex);
        glBindTexture(GL_TEXTURE_2D, velocityTex);
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA16F, w, h, 0, GL_RGBA, GL_FLOAT, nullptr);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
        glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT1, GL_TEXTURE_2D, velocityTex, 0);

        GLuint attachments[2] = { GL_COLOR_ATTACHMENT0, GL_COLOR_ATTACHMENT1 };
        glDrawBuffers(2, attachments);

        // Depth renderbuffer
        glGenRenderbuffers(1, &depthRBO);
        glBindRenderbuffer(GL_RENDERBUFFER, depthRBO);
        glRenderbufferStorage(GL_RENDERBUFFER, GL_DEPTH_COMPONENT24, w, h);
        glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, GL_RENDERBUFFER, depthRBO);

        GLenum status = glCheckFramebufferStatus(GL_FRAMEBUFFER);
        std::cout << "[MotionBlur] FBO status: 0x" << std::hex << status << std::dec << "\n";
        bool ok = (status == GL_FRAMEBUFFER_COMPLETE);
        glBindFramebuffer(GL_FRAMEBUFFER, 0);
        return ok;
    }

    void bind()
    {
        glBindFramebuffer(GL_FRAMEBUFFER, fbo);
        GLuint att[2] = { GL_COLOR_ATTACHMENT0, GL_COLOR_ATTACHMENT1 };
        glDrawBuffers(2, att);
    }
    void unbind() { glBindFramebuffer(GL_FRAMEBUFFER, 0); }

    void destroy()
    {
        if (fbo)          { glDeleteFramebuffers(1, &fbo); fbo = 0; }
        if (colorTex)     { glDeleteTextures(1, &colorTex); colorTex = 0; }
        if (velocityTex)  { glDeleteTextures(1, &velocityTex); velocityTex = 0; }
        if (depthRBO)     { glDeleteRenderbuffers(1, &depthRBO); depthRBO = 0; }
    }
};
