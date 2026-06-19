#include "Camera.h"
#include <glm/gtc/matrix_transform.hpp>
#include <algorithm>

void Camera::setPerspective(float fovY, float aspect, float nearPlane, float farPlane)
{
    m_fov = fovY;
    m_aspect = aspect;
    m_near = nearPlane;
    m_far = farPlane;
}

void Camera::lookAt(const glm::vec3& position, const glm::vec3& target, const glm::vec3& up)
{
    m_position = position;
    m_target = target;
    m_front = glm::normalize(target - position);
    m_up = up;
}

void Camera::setOrbitTarget(const glm::vec3& target)
{
    m_target = target;
    m_useOrbit = true;

    glm::vec3 dir = glm::normalize(m_position - m_target);
    m_distance = glm::distance(m_position, m_target);
    m_elevation = std::asin(dir.y);
    m_azimuth = std::atan2(dir.z, dir.x);

    updatePositionFromOrbit();
}

void Camera::orbit(float deltaAzimuth, float deltaElevation)
{
    if (!m_useOrbit) return;
    m_azimuth += deltaAzimuth;
    m_elevation += deltaElevation;

    const float maxEl = glm::radians(89.0f);
    m_elevation = std::clamp(m_elevation, -maxEl, maxEl);

    updatePositionFromOrbit();
}

void Camera::zoom(float deltaDistance)
{
    if (!m_useOrbit) return;
    m_distance += deltaDistance;
    m_distance = std::max(m_distance, 2.0f);
    m_distance = std::min(m_distance, m_far * 0.9f);
    updatePositionFromOrbit();
}

void Camera::updatePositionFromOrbit()
{
    m_position.x = m_target.x + m_distance * std::cos(m_elevation) * std::cos(m_azimuth);
    m_position.y = m_target.y + m_distance * std::sin(m_elevation);
    m_position.z = m_target.z + m_distance * std::cos(m_elevation) * std::sin(m_azimuth);
    m_front = glm::normalize(m_target - m_position);

    glm::vec3 worldUp(0.0f, 1.0f, 0.0f);
    glm::vec3 right = glm::normalize(glm::cross(m_front, worldUp));
    m_up = glm::normalize(glm::cross(right, m_front));
}

glm::mat4 Camera::getViewMatrix() const
{
    return glm::lookAt(m_position, m_position + m_front, m_up);
}

glm::mat4 Camera::getProjectionMatrix() const
{
    return glm::perspective(glm::radians(m_fov), m_aspect, m_near, m_far);
}
