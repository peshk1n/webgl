#pragma once

#define GLM_FORCE_PURE
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>

// ═══════════════════════════════════════════════════════════════════════════════
// First-person 3D camera — yaw/pitch FPS-style.
// Ported from lab6/lab7 WebGL camera pattern.
// ═══════════════════════════════════════════════════════════════════════════════

class Camera
{
public:
    Camera();

    // Returns world→view matrix.
    glm::mat4 getViewMatrix() const;

    // Direction vectors in world space.
    glm::vec3 getForward() const;
    glm::vec3 getRight() const;
    glm::vec3 getUp() const;

    // Movement: WASD (forward/back/left/right), Q/E (down/up).
    // dt = delta-time in seconds.
    void processKeyboard(bool w, bool s, bool a, bool d, bool q, bool e, float dt);

    // Mouse look: dx/dy are pixel deltas since last frame.
    void processMouse(float dx, float dy);

    const glm::vec3& position() const { return m_position; }
    float yaw()   const { return m_yaw; }
    float pitch() const { return m_pitch; }

private:
    glm::vec3 m_position = glm::vec3(0.0f, 8.0f, 20.0f);
    float m_yaw   = -90.0f;   
    float m_pitch = -20.0f;

    float m_moveSpeed    = 12.0f;   // units/sec
    float m_mouseSens    = 0.15f;   // degrees/pixel
    float m_maxPitch     = 89.0f;
};
