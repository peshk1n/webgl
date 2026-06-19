#include "Ball.h"
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/constants.hpp>
#include <vector>
#include <cmath>
#include <cstdlib>

// --- Reflection shader 

static const char* ballVertSrc = R"(
#version 330 core
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;

out vec3 WorldPos;
out vec3 Normal;
out vec3 ViewDir;
out vec2 vVelocity;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform vec3 uCamPos;

void main()
{
    WorldPos = vec3(uModel * vec4(aPos, 1.0));
    Normal = mat3(transpose(inverse(uModel))) * aNormal;
    ViewDir = uCamPos - WorldPos;
    gl_Position = uProjection * uView * vec4(WorldPos, 1.0);
    vVelocity = vec2(0.0);
}
)";

static const char* ballFragSrc = R"(
#version 330 core
layout(location = 0) out vec4 FragColor;
layout(location = 1) out vec2 FragVelocity;

in vec3 WorldPos;
in vec3 Normal;
in vec3 ViewDir;
in vec2 vVelocity;

uniform samplerCube uEnvironment;
uniform vec3 uBaseColor;
uniform float uReflectivity;

void main()
{
    vec3 N = normalize(Normal);
    vec3 V = normalize(ViewDir);
    vec3 R = reflect(-V, N);

    float fresnel = uReflectivity + (1.0 - uReflectivity) * pow(1.0 - abs(dot(N, V)), 5.0);

    vec3 reflection = texture(uEnvironment, R).rgb;
    vec3 diffuse = uBaseColor * 0.3;

    vec3 color = mix(diffuse, reflection, fresnel);

    vec3 lightDir = normalize(vec3(0.5, 0.8, 0.3));
    vec3 H = normalize(lightDir + V);
    float spec = pow(max(dot(N, H), 0.0), 128.0);
    color += vec3(1.0, 0.95, 0.8) * spec * 0.4;

    FragColor = vec4(color, 1.0);
    FragVelocity = vec2(0.0);
}
)";

// --- Ball methods ---

bool Ball::init()
{
    if (!m_shader.load(ballVertSrc, ballFragSrc))
        return false;

    generateSphere();
    return true;
}

void Ball::update(float dt)
{
    m_position += m_velocity * dt;
}

void Ball::reset()
{
    m_position = glm::vec3(0.0f, 0.0f, 0.0f);
    float vx = (rand() % 2 == 0) ? 5.0f : -5.0f;
    float vy = (rand() % 5 - 2) * 1.5f;
    m_velocity = glm::vec3(vx, vy, 0.0f);
}

void Ball::render(const glm::mat4& view, const glm::mat4& proj, const glm::vec3& camPos, unsigned int cubemapTex)
{
    glm::mat4 model = glm::translate(glm::mat4(1.0f), m_position);
    model = glm::scale(model, glm::vec3(m_radius));

    m_shader.use();
    m_shader.setUniform("uModel", model);
    m_shader.setUniform("uView", view);
    m_shader.setUniform("uProjection", proj);
    m_shader.setUniform("uCamPos", camPos);
    m_shader.setUniform("uBaseColor", glm::vec3(0.9f, 0.3f, 0.2f));
    m_shader.setUniform("uReflectivity", 0.6f);

    glActiveTexture(GL_TEXTURE0);
    glBindTexture(GL_TEXTURE_CUBE_MAP, cubemapTex);
    m_shader.setUniform("uEnvironment", 0);

    m_mesh.draw();
}

void Ball::generateSphere()
{
    const int stacks = 24;
    const int slices = 24;

    std::vector<Vertex> verts;
    std::vector<GLuint> indices;

    for (int i = 0; i <= stacks; ++i)
    {
        float phi = glm::pi<float>() * float(i) / float(stacks);  // 0 to PI
        float y = std::cos(phi);
        float r = std::sin(phi);

        for (int j = 0; j <= slices; ++j)
        {
            float theta = 2.0f * glm::pi<float>() * float(j) / float(slices);
            float x = r * std::cos(theta);
            float z = r * std::sin(theta);

            Vertex v;
            v.position = glm::vec3(x, y, z);
            v.normal = glm::vec3(x, y, z);  // unit sphere, normal = position
            v.texCoord = glm::vec2(float(j) / slices, float(i) / stacks);
            verts.push_back(v);
        }
    }

    for (int i = 0; i < stacks; ++i)
    {
        for (int j = 0; j < slices; ++j)
        {
            GLuint a = i * (slices + 1) + j;
            GLuint b = a + slices + 1;
            indices.push_back(a);
            indices.push_back(b);
            indices.push_back(a + 1);
            indices.push_back(b);
            indices.push_back(b + 1);
            indices.push_back(a + 1);
        }
    }

    m_mesh.create(verts, indices);
}
