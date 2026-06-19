#pragma once
#include <glm/glm.hpp>
#include <vector>
#include "../engine/Mesh.h"
#include "../engine/Shader.h"

class Paddle
{
public:
    Paddle() = default;
    Paddle(bool leftSide);

    bool init();
    void update(float dt, float targetY);
    void setPositionDirect(const glm::vec3& pos) { m_position = pos; }
    void render(const glm::mat4& view, const glm::mat4& proj, const glm::vec3& camPos);

    glm::vec3 getPosition() const { return m_position; }
    bool isLeftSide() const { return m_leftSide; }

    static constexpr float WIDTH = 0.4f;
    static constexpr float HEIGHT = 2.0f;
    static constexpr float DEPTH = 0.25f;

private:
    void generateBox();

    glm::vec3 m_position{ 0.0f, 0.0f, 0.0f };
    glm::mat4 m_prevMVP{ 1.0f };
    bool m_firstRender = true;
    bool m_leftSide = true;
    std::vector<glm::vec3> m_trail;
    static constexpr int MAX_TRAIL = 25;

    Mesh m_mesh;
    Shader m_shader;
};
