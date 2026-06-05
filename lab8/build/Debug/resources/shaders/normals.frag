#version 400 core

// ═══════════════════════════════════════════════════════════════════════════════
// Normals Fragment Shader — simple solid color for normal lines.
// ═══════════════════════════════════════════════════════════════════════════════

in vec3 gsColor;
out vec4 fragColor;

void main()
{
    fragColor = vec4(gsColor, 1.0);
}
