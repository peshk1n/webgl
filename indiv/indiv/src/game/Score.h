#pragma once
#include "../engine/Mesh.h"
#include "../engine/Shader.h"
#include <glm/glm.hpp>
#include <vector>

class Score
{
public:
    Score() = default;

    bool init();
    void render(const glm::mat4& view, const glm::mat4& proj, const glm::vec3& camPos);
    void renderScores(int left, int right, const glm::mat4& view, const glm::mat4& proj, const glm::vec3& camPos);
    void renderGameOver(const glm::mat4& view, const glm::mat4& proj, const glm::vec3& camPos,
                        int leftScore, int rightScore);

    void addPointLeft()  { m_scoreLeft++; }
    void addPointRight() { m_scoreRight++; }
    void reset() { m_scoreLeft = 0; m_scoreRight = 0; }

    int getScoreLeft()  const { return m_scoreLeft; }
    int getScoreRight() const { return m_scoreRight; }
    bool isGameOver(int maxPoints = 11) const;

private:
    void renderDigit(int digit, float xCenter, float yBase,
                     const glm::mat4& view, const glm::mat4& proj, const glm::vec3& camPos);
    void renderNumber(int number, float xCenter, float yBase,
                      const glm::mat4& view, const glm::mat4& proj, const glm::vec3& camPos);
    void generateSegmentMesh();

    int m_scoreLeft = 0;
    int m_scoreRight = 0;

    Shader m_shader;
    Mesh m_segmentH;   // horizontal segment (wide, thin)
    Mesh m_segmentV;   // vertical segment (narrow, tall)
};

// 7-segment layout for digits 0-9
constexpr bool SEGMENTS[10][7] = {
//   A, B, C, D, E, F, G
    {1, 1, 1, 1, 1, 1, 0}, // 0
    {0, 1, 1, 0, 0, 0, 0}, // 1
    {1, 1, 0, 1, 1, 0, 1}, // 2
    {1, 1, 1, 1, 0, 0, 1}, // 3
    {0, 1, 1, 0, 0, 1, 1}, // 4
    {1, 0, 1, 1, 0, 1, 1}, // 5
    {1, 0, 1, 1, 1, 1, 1}, // 6
    {1, 1, 1, 0, 0, 0, 0}, // 7
    {1, 1, 1, 1, 1, 1, 1}, // 8
    {1, 1, 1, 1, 0, 1, 1}, // 9
};
