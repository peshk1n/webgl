#version 400 core

// ═══════════════════════════════════════════════════════════════════════════════
// Normals Geometry Shader — emits a line for each triangle's face normal.
//
// Input:  triangles from TES
// Output: line_strip (2 vertices per line: triangle center → center + normal)
// ═══════════════════════════════════════════════════════════════════════════════

layout(triangles) in;
layout(line_strip, max_vertices = 6) out;

in vec3 gsWorldPos[];
in vec3 gsWorldNormal[];

out vec3 gsColor;

uniform mat4  uView;
uniform mat4  uProjection;
uniform float uNormalLength;   // scale for normal visualization, e.g., 1.5

void main()
{
    // Compute triangle center (average of 3 vertices)
    vec3 center = (gsWorldPos[0] + gsWorldPos[1] + gsWorldPos[2]) / 3.0;

    // Compute face normal (average of vertex normals, re-normalized)
    vec3 avgNormal = normalize(gsWorldNormal[0] + gsWorldNormal[1] + gsWorldNormal[2]);

    // Start point: triangle center
    vec4 p0 = uProjection * uView * vec4(center, 1.0);

    // End point: center + normal * length
    vec4 p1 = uProjection * uView * vec4(center + avgNormal * uNormalLength, 1.0);

    // Emit line segment
    gl_Position = p0;
    gsColor = vec3(1.0, 0.3, 0.3);   // reddish
    EmitVertex();

    gl_Position = p1;
    gsColor = vec3(1.0, 0.9, 0.2);   // yellowish tip
    EmitVertex();

    EndPrimitive();
}
