#version 400 core

// ═══════════════════════════════════════════════════════════════════════════════
// Normals Vertex Shader — same as terrain.vert, pass-through to TCS.
// ═══════════════════════════════════════════════════════════════════════════════

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec2 aTexCoord;

out vec3 vWorldPos;
out vec2 vTexCoord;

void main()
{
    vWorldPos  = aPosition;
    vTexCoord  = aTexCoord;
    gl_Position = vec4(aPosition, 1.0);
}
