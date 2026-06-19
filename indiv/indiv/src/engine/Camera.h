#pragma once
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>

class Camera
{
public:
    Camera() = default;

    void setPerspective(float fovY, float aspect, float nearPlane, float farPlane);
    void lookAt(const glm::vec3& position, const glm::vec3& target, const glm::vec3& up = glm::vec3(0.0f, 1.0f, 0.0f));

    void setOrbitTarget(const glm::vec3& target);
    void orbit(float deltaAzimuth, float deltaElevation);   // radians
    void zoom(float deltaDistance);

    glm::mat4 getViewMatrix() const;
    glm::mat4 getProjectionMatrix() const;
    glm::vec3 getPosition() const { return m_position; }
    glm::vec3 getTarget() const { return m_target; }

private:
    void updatePositionFromOrbit();

    glm::vec3 m_position{ 0.0f, 5.0f, 10.0f };
    glm::vec3 m_front{ 0.0f, 0.0f, -1.0f };
    glm::vec3 m_up{ 0.0f, 1.0f, 0.0f };
    glm::vec3 m_target{ 0.0f, 0.0f, 0.0f };

    float m_azimuth = 0.0f;    
    float m_elevation = 0.3f;   
    float m_distance = 15.0f;
    bool  m_useOrbit = false;   

    float m_fov = 45.0f;
    float m_aspect = 16.0f / 9.0f;
    float m_near = 0.1f;
    float m_far = 100.0f;
};
