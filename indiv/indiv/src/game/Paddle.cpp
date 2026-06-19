#include "Paddle.h"
#include <glm/gtc/matrix_transform.hpp>
#include <vector>


static const char* paddleVertSrc = R"(
#version 330 core
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;

out vec3 FragPos;
out vec3 Normal;
out vec2 vVelocity;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat4 uPrevMVP;

void main()
{
    vec4 curClip  = uProjection * uView * uModel * vec4(aPos, 1.0);
    vec4 prevClip = uPrevMVP * vec4(aPos, 1.0);
    vec2 curNDC   = curClip.xy / curClip.w;
    vec2 prevNDC  = prevClip.xy / prevClip.w;
    vVelocity = curNDC - prevNDC;

    FragPos = vec3(uModel * vec4(aPos, 1.0));
    Normal = mat3(transpose(inverse(uModel))) * aNormal;
    gl_Position = curClip;
}
)";

static const char* paddleFragSrc = R"(
#version 330 core
layout(location = 0) out vec4 FragColor;
layout(location = 1) out vec2 FragVelocity;

in vec3 FragPos;
in vec3 Normal;
in vec2 vVelocity;

uniform vec3 uColor;
uniform vec3 uViewPos;
uniform float uAlpha;

void main()
{
    vec3 N = normalize(Normal);
    vec3 V = normalize(uViewPos - FragPos);

    vec3 ambient = uColor * 0.40;

    vec3 lightDir = normalize(vec3(0.5, 0.8, 0.3));
    float diff = max(dot(N, lightDir), 0.0);
    vec3 diffuse = uColor * diff * 0.85;

    vec3 H = normalize(lightDir + V);
    float spec = pow(max(dot(N, H), 0.0), 64.0);
    vec3 specular = vec3(1.0, 0.95, 0.8) * spec * 0.6;

    vec3 result = ambient + diffuse + specular;
    FragColor = vec4(result, uAlpha);
    FragVelocity = vVelocity;
}
)";

// --- Paddle methods ---

Paddle::Paddle(bool leftSide)
    : m_leftSide(leftSide)
{
    float x = leftSide ? -9.0f : 9.0f;
    m_position = glm::vec3(x, 0.0f, 0.0f);
}

bool Paddle::init()
{
    if (!m_shader.load(paddleVertSrc, paddleFragSrc))
        return false;

    generateBox();
    return true;
}

void Paddle::update(float dt, float targetY)
{
    m_position.y = targetY;
}

void Paddle::render(const glm::mat4& view, const glm::mat4& proj, const glm::vec3& camPos)
{
    glm::mat4 model = glm::translate(glm::mat4(1.0f), m_position);
    glm::mat4 mvp = proj * view * model;

    m_shader.use();
    m_shader.setUniform("uView", view);
    m_shader.setUniform("uProjection", proj);
    m_shader.setUniform("uViewPos", camPos);

    if (m_firstRender) { m_prevMVP = mvp; m_firstRender = false; }
    m_shader.setUniform("uPrevMVP", m_prevMVP);

    glm::vec3 color = m_leftSide ? glm::vec3(0.2f, 0.5f, 1.0f) : glm::vec3(1.0f, 0.1f, 0.7f);

    m_trail.push_back(m_position);
    while ((int)m_trail.size() > MAX_TRAIL) m_trail.erase(m_trail.begin());

    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    glDepthMask(GL_FALSE);
    for (size_t i = 0; i < m_trail.size(); ++i)
    {
        float alpha = 0.03f + 0.25f * float(i + 1) / MAX_TRAIL;
        glm::mat4 ghostModel = glm::translate(glm::mat4(1.0f), m_trail[i]);
        m_shader.setUniform("uModel", ghostModel);
        m_shader.setUniform("uColor", color);
        m_shader.setUniform("uAlpha", alpha);
        m_mesh.draw();
    }
    glDepthMask(GL_TRUE);
    glDisable(GL_BLEND);

    m_shader.setUniform("uModel", model);
    m_shader.setUniform("uColor", color);
    m_shader.setUniform("uAlpha", 1.0f);
    m_mesh.draw();

    m_prevMVP = mvp;
}

void Paddle::generateBox()
{
    float hw = WIDTH / 2.0f;
    float hh = HEIGHT / 2.0f;
    float hd = DEPTH / 2.0f;

    std::vector<Vertex> verts = {
        // Front face
        {{-hw, -hh,  hd}, {0,0, 1}, {0,0}}, {{ hw, -hh,  hd}, {0,0, 1}, {1,0}}, {{ hw,  hh,  hd}, {0,0, 1}, {1,1}},
        {{-hw, -hh,  hd}, {0,0, 1}, {0,0}}, {{ hw,  hh,  hd}, {0,0, 1}, {1,1}}, {{-hw,  hh,  hd}, {0,0, 1}, {0,1}},
        // Back face
        {{ hw, -hh, -hd}, {0,0,-1}, {0,0}}, {{-hw, -hh, -hd}, {0,0,-1}, {1,0}}, {{-hw,  hh, -hd}, {0,0,-1}, {1,1}},
        {{ hw, -hh, -hd}, {0,0,-1}, {0,0}}, {{-hw,  hh, -hd}, {0,0,-1}, {1,1}}, {{ hw,  hh, -hd}, {0,0,-1}, {0,1}},
        // Top face
        {{-hw,  hh, -hd}, {0,1, 0}, {0,0}}, {{ hw,  hh, -hd}, {0,1, 0}, {1,0}}, {{ hw,  hh,  hd}, {0,1, 0}, {1,1}},
        {{-hw,  hh, -hd}, {0,1, 0}, {0,0}}, {{ hw,  hh,  hd}, {0,1, 0}, {1,1}}, {{-hw,  hh,  hd}, {0,1, 0}, {0,1}},
        // Bottom face
        {{-hw, -hh,  hd}, {0,-1,0}, {0,0}}, {{ hw, -hh,  hd}, {0,-1,0}, {1,0}}, {{ hw, -hh, -hd}, {0,-1,0}, {1,1}},
        {{-hw, -hh,  hd}, {0,-1,0}, {0,0}}, {{ hw, -hh, -hd}, {0,-1,0}, {1,1}}, {{-hw, -hh, -hd}, {0,-1,0}, {0,1}},
        // Right face
        {{ hw, -hh,  hd}, {1,0, 0}, {0,0}}, {{ hw, -hh, -hd}, {1,0, 0}, {1,0}}, {{ hw,  hh, -hd}, {1,0, 0}, {1,1}},
        {{ hw, -hh,  hd}, {1,0, 0}, {0,0}}, {{ hw,  hh, -hd}, {1,0, 0}, {1,1}}, {{ hw,  hh,  hd}, {1,0, 0}, {0,1}},
        // Left face
        {{-hw, -hh, -hd}, {-1,0,0}, {0,0}}, {{-hw, -hh,  hd}, {-1,0,0}, {1,0}}, {{-hw,  hh,  hd}, {-1,0,0}, {1,1}},
        {{-hw, -hh, -hd}, {-1,0,0}, {0,0}}, {{-hw,  hh,  hd}, {-1,0,0}, {1,1}}, {{-hw,  hh, -hd}, {-1,0,0}, {0,1}},
    };

    std::vector<GLuint> indices(36);
    for (size_t i = 0; i < 36; ++i) indices[i] = static_cast<GLuint>(i);

    m_mesh.create(verts, indices);
}
