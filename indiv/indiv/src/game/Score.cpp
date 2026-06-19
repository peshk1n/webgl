#include "Score.h"
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>

static const char* scoreVert = R"(
#version 330 core
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
out vec3 FragPos;
out vec3 Normal;
out vec2 vVelocity;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
void main() {
    FragPos = vec3(uModel * vec4(aPos, 1.0));
    Normal = mat3(transpose(inverse(uModel))) * aNormal;
    gl_Position = uProjection * uView * vec4(FragPos, 1.0);
    vVelocity = vec2(0.0);
}
)";

static const char* scoreFrag = R"(
#version 330 core
layout(location = 0) out vec4 FragColor;
layout(location = 1) out vec2 FragVelocity;
in vec3 FragPos;
in vec3 Normal;
in vec2 vVelocity;
uniform vec3 uColor;
uniform vec3 uViewPos;
void main() {
    vec3 N = normalize(Normal);
    vec3 V = normalize(uViewPos - FragPos);
    vec3 L = normalize(vec3(0.3, 0.8, 0.5));
    float NdotL = max(dot(N, L), 0.0);
    vec3 ambient = uColor * 0.80;
    vec3 diffuse = uColor * NdotL * 0.65;
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 32.0) * 0.3;
    FragColor = vec4(ambient + diffuse + spec, 1.0);
    FragVelocity = vec2(0.0);
}
)";

bool Score::init()
{
    if (!m_shader.load(scoreVert, scoreFrag)) return false;
    generateSegmentMesh();
    return true;
}

void Score::generateSegmentMesh()
{
    {
        float hw = 0.40f, hh = 0.06f, hd = 0.04f;
        std::vector<Vertex> v = {
            {{-hw,-hh, hd},{0,0,1},{0,0}}, {{ hw,-hh, hd},{0,0,1},{0,0}}, {{ hw, hh, hd},{0,0,1},{0,0}},
            {{-hw,-hh, hd},{0,0,1},{0,0}}, {{ hw, hh, hd},{0,0,1},{0,0}}, {{-hw, hh, hd},{0,0,1},{0,0}},
            {{ hw,-hh,-hd},{0,0,-1},{0,0}}, {{-hw,-hh,-hd},{0,0,-1},{0,0}}, {{-hw, hh,-hd},{0,0,-1},{0,0}},
            {{ hw,-hh,-hd},{0,0,-1},{0,0}}, {{-hw, hh,-hd},{0,0,-1},{0,0}}, {{ hw, hh,-hd},{0,0,-1},{0,0}},
            {{-hw, hh,-hd},{0,1,0},{0,0}}, {{ hw, hh,-hd},{0,1,0},{0,0}}, {{ hw, hh, hd},{0,1,0},{0,0}},
            {{-hw, hh,-hd},{0,1,0},{0,0}}, {{ hw, hh, hd},{0,1,0},{0,0}}, {{-hw, hh, hd},{0,1,0},{0,0}},
            {{-hw,-hh, hd},{0,-1,0},{0,0}}, {{ hw,-hh, hd},{0,-1,0},{0,0}}, {{ hw,-hh,-hd},{0,-1,0},{0,0}},
            {{-hw,-hh, hd},{0,-1,0},{0,0}}, {{ hw,-hh,-hd},{0,-1,0},{0,0}}, {{-hw,-hh,-hd},{0,-1,0},{0,0}},
            {{ hw,-hh, hd},{1,0,0},{0,0}}, {{ hw,-hh,-hd},{1,0,0},{0,0}}, {{ hw, hh,-hd},{1,0,0},{0,0}},
            {{ hw,-hh, hd},{1,0,0},{0,0}}, {{ hw, hh,-hd},{1,0,0},{0,0}}, {{ hw, hh, hd},{1,0,0},{0,0}},
            {{-hw,-hh,-hd},{-1,0,0},{0,0}}, {{-hw,-hh, hd},{-1,0,0},{0,0}}, {{-hw, hh, hd},{-1,0,0},{0,0}},
            {{-hw,-hh,-hd},{-1,0,0},{0,0}}, {{-hw, hh, hd},{-1,0,0},{0,0}}, {{-hw, hh,-hd},{-1,0,0},{0,0}},
        };
        std::vector<GLuint> idx(36); for(size_t i=0;i<36;i++) idx[i]=(GLuint)i;
        m_segmentH.create(v, idx);
    }
    {
        float hw = 0.06f, hh = 0.40f, hd = 0.04f;
        std::vector<Vertex> v = {
            {{-hw,-hh, hd},{0,0,1},{0,0}}, {{ hw,-hh, hd},{0,0,1},{0,0}}, {{ hw, hh, hd},{0,0,1},{0,0}},
            {{-hw,-hh, hd},{0,0,1},{0,0}}, {{ hw, hh, hd},{0,0,1},{0,0}}, {{-hw, hh, hd},{0,0,1},{0,0}},
            {{ hw,-hh,-hd},{0,0,-1},{0,0}}, {{-hw,-hh,-hd},{0,0,-1},{0,0}}, {{-hw, hh,-hd},{0,0,-1},{0,0}},
            {{ hw,-hh,-hd},{0,0,-1},{0,0}}, {{-hw, hh,-hd},{0,0,-1},{0,0}}, {{ hw, hh,-hd},{0,0,-1},{0,0}},
            {{-hw, hh,-hd},{0,1,0},{0,0}}, {{ hw, hh,-hd},{0,1,0},{0,0}}, {{ hw, hh, hd},{0,1,0},{0,0}},
            {{-hw, hh,-hd},{0,1,0},{0,0}}, {{ hw, hh, hd},{0,1,0},{0,0}}, {{-hw, hh, hd},{0,1,0},{0,0}},
            {{-hw,-hh, hd},{0,-1,0},{0,0}}, {{ hw,-hh, hd},{0,-1,0},{0,0}}, {{ hw,-hh,-hd},{0,-1,0},{0,0}},
            {{-hw,-hh, hd},{0,-1,0},{0,0}}, {{ hw,-hh,-hd},{0,-1,0},{0,0}}, {{-hw,-hh,-hd},{0,-1,0},{0,0}},
            {{ hw,-hh, hd},{1,0,0},{0,0}}, {{ hw,-hh,-hd},{1,0,0},{0,0}}, {{ hw, hh,-hd},{1,0,0},{0,0}},
            {{ hw,-hh, hd},{1,0,0},{0,0}}, {{ hw, hh,-hd},{1,0,0},{0,0}}, {{ hw, hh, hd},{1,0,0},{0,0}},
            {{-hw,-hh,-hd},{-1,0,0},{0,0}}, {{-hw,-hh, hd},{-1,0,0},{0,0}}, {{-hw, hh, hd},{-1,0,0},{0,0}},
            {{-hw,-hh,-hd},{-1,0,0},{0,0}}, {{-hw, hh, hd},{-1,0,0},{0,0}}, {{-hw, hh,-hd},{-1,0,0},{0,0}},
        };
        std::vector<GLuint> idx(36); for(size_t i=0;i<36;i++) idx[i]=(GLuint)i;
        m_segmentV.create(v, idx);
    }
}

void Score::render(const glm::mat4& view, const glm::mat4& proj, const glm::vec3& camPos)
{
    renderScores(m_scoreLeft, m_scoreRight, view, proj, camPos);
}

void Score::renderScores(int left, int right, const glm::mat4& view, const glm::mat4& proj, const glm::vec3& camPos)
{
    renderNumber(left,  -3.0f, 4.0f, view, proj, camPos);
    renderNumber(right,  3.0f, 4.0f, view, proj, camPos);
}

void Score::renderNumber(int number, float cx, float cy,
                         const glm::mat4& view, const glm::mat4& proj, const glm::vec3& camPos)
{
    if (number < 0 || number > 99) return;

    int tens = number / 10;
    int ones = number % 10;

    if (number >= 10)
    {
        renderDigit(tens, cx - 0.55f, cy, view, proj, camPos);
        renderDigit(ones, cx + 0.55f, cy, view, proj, camPos);
    }
    else
    {
        renderDigit(ones, cx, cy, view, proj, camPos);
    }
}

void Score::renderDigit(int digit, float cx, float cy,
                        const glm::mat4& view, const glm::mat4& proj, const glm::vec3& camPos)
{
    if (digit < 0 || digit > 9) return;

    m_shader.use();
    m_shader.setUniform("uView", view);
    m_shader.setUniform("uProjection", proj);
    m_shader.setUniform("uViewPos", camPos);
    m_shader.setUniform("uColor", glm::vec3(1.0f, 0.85f, 0.55f)); // warm beige

    // 7-segment positions relative to digit center (cx, cy, z=0)
    // A: top horizontal
    // B: upper right vertical
    // C: lower right vertical
    // D: bottom horizontal
    // E: lower left vertical
    // F: upper left vertical
    // G: middle horizontal

    auto drawH = [&](float x, float y) {
        glm::mat4 m = glm::translate(glm::mat4(1.0f), glm::vec3(cx + x, cy + y, 0.0f));
        m_shader.setUniform("uModel", m);
        m_segmentH.draw();
    };
    auto drawV = [&](float x, float y) {
        glm::mat4 m = glm::translate(glm::mat4(1.0f), glm::vec3(cx + x, cy + y, 0.0f));
        m_shader.setUniform("uModel", m);
        m_segmentV.draw();
    };

    const bool* seg = SEGMENTS[digit];
    if (seg[0]) drawH(0.0f, 0.80f);  // A top
    if (seg[1]) drawV(0.40f, 0.40f); // B upper-right
    if (seg[2]) drawV(0.40f,-0.40f); // C lower-right
    if (seg[3]) drawH(0.0f,-0.80f);  // D bottom
    if (seg[4]) drawV(-0.40f,-0.40f);// E lower-left
    if (seg[5]) drawV(-0.40f, 0.40f);// F upper-left
    if (seg[6]) drawH(0.0f, 0.0f);   // G middle
}

bool Score::isGameOver(int maxPoints) const
{
    return m_scoreLeft >= maxPoints || m_scoreRight >= maxPoints;
}

void Score::renderGameOver(const glm::mat4& view, const glm::mat4& proj, const glm::vec3& camPos,
                           int leftScore, int rightScore)
{
    // Both final scores centered on screen
    renderNumber(leftScore,  -1.5f, 0.0f, view, proj, camPos);
    renderNumber(rightScore,  1.5f, 0.0f, view, proj, camPos);
}
