#version 400 core

// ═══════════════════════════════════════════════════════════════════════════════
// Terrain Vertex Shader — minimal pass-through to TCS.
// All transformation happens in TES after heightmap displacement.
// ═══════════════════════════════════════════════════════════════════════════════

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec2 aTexCoord;

out vec3 vWorldPos;     // world-space XZ position (Y = 0, displaced in TES)
out vec2 vTexCoord;

void main()
{
    vWorldPos  = aPosition;
    vTexCoord  = aTexCoord;
    gl_Position = vec4(aPosition, 1.0);
}
