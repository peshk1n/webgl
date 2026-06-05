#include "camera.h"

#include <glm/gtc/constants.hpp>
#include <algorithm>

Camera::Camera() = default;

glm::mat4 Camera::getViewMatrix() const
{
    return glm::lookAt(m_position, m_position + getForward(), glm::vec3(0.0f, 1.0f, 0.0f));
}

glm::vec3 Camera::getForward() const
{
    float yawRad   = glm::radians(m_yaw);
    float pitchRad = glm::radians(m_pitch);
    return glm::vec3(
        std::cos(yawRad) * std::cos(pitchRad),
        std::sin(pitchRad),
        std::sin(yawRad) * std::cos(pitchRad)
    );
}

glm::vec3 Camera::getRight() const
{
    return glm::normalize(glm::cross(getForward(), glm::vec3(0.0f, 1.0f, 0.0f)));
}

glm::vec3 Camera::getUp() const
{
    return glm::cross(getRight(), getForward());
}

void Camera::processKeyboard(bool w, bool s, bool a, bool d, bool q, bool e, float dt)
{
    float velocity = m_moveSpeed * dt;
    glm::vec3 forward = getForward();
    glm::vec3 right   = getRight();

    if (w) m_position += forward * velocity;
    if (s) m_position -= forward * velocity;
    if (a) m_position -= right   * velocity;
    if (d) m_position += right   * velocity;
    if (q) m_position.y -= velocity;
    if (e) m_position.y += velocity;
}

void Camera::processMouse(float dx, float dy)
{
    m_yaw   += dx * m_mouseSens;
    m_pitch -= dy * m_mouseSens;    // inverted Y

    m_pitch = std::clamp(m_pitch, -m_maxPitch, m_maxPitch);

    // Normalize yaw to [0, 360)
    if (m_yaw >= 360.0f)  m_yaw -= 360.0f;
    if (m_yaw < 0.0f)     m_yaw += 360.0f;
}
