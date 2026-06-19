#pragma once
#include <glm/glm.hpp>
#include "../engine/Mesh.h"
#include "../engine/Shader.h"

class Ball
{
public:
    Ball() = default;

    bool init();
    void update(float dt);
    void reset();
    void render(const glm::mat4& view, const glm::mat4& proj, const glm::vec3& camPos, unsigned int cubemapTex);

    glm::vec3 getPosition() const { return m_position; }
    glm::vec3 getVelocity() const { return m_velocity; }
    void setPosition(const glm::vec3& p) { m_position = p; }
    void setVelocity(const glm::vec3& v) { m_velocity = v; }
    float getRadius() const { return m_radius; }

private:
    void generateSphere();

    glm::vec3 m_position{ 0.0f, 0.0f, 0.0f };
    glm::vec3 m_velocity{ 3.0f, 1.0f, 4.0f };
    float m_radius = 0.35f;
    float m_speed = 6.0f;

    Mesh m_mesh;
    Shader m_shader;
};
