#version 400 core

// ═══════════════════════════════════════════════════════════════════════════════
// Normals Tessellation Control Shader — same per-edge crack-free LOD as terrain.
// ═══════════════════════════════════════════════════════════════════════════════

layout(vertices = 4) out;

in vec3 vWorldPos[];
in vec2 vTexCoord[];

out vec3 tcWorldPos[];
out vec2 tcTexCoord[];

uniform float uMaxTessLevel;
uniform float uLODFactor;
uniform vec3  uCameraPosition;

float tessForPoint(vec3 point)
{
    float dist = length(point - uCameraPosition);
    float level = uMaxTessLevel / (1.0 + dist * uLODFactor);
    return clamp(level, 1.0, uMaxTessLevel);
}

void main()
{
    tcWorldPos[gl_InvocationID] = vWorldPos[gl_InvocationID];
    tcTexCoord[gl_InvocationID] = vTexCoord[gl_InvocationID];

    if (gl_InvocationID == 0)
    {
        vec3 edgeMidL = (vWorldPos[3] + vWorldPos[0]) * 0.5;  // left edge
        vec3 edgeMidB = (vWorldPos[0] + vWorldPos[1]) * 0.5;  // bottom edge
        vec3 edgeMidR = (vWorldPos[1] + vWorldPos[2]) * 0.5;  // right edge
        vec3 edgeMidT = (vWorldPos[2] + vWorldPos[3]) * 0.5;  // top edge

        gl_TessLevelOuter[0] = tessForPoint(edgeMidL);
        gl_TessLevelOuter[1] = tessForPoint(edgeMidB);
        gl_TessLevelOuter[2] = tessForPoint(edgeMidR);
        gl_TessLevelOuter[3] = tessForPoint(edgeMidT);

        float innerLevel = (gl_TessLevelOuter[0] + gl_TessLevelOuter[1] +
                            gl_TessLevelOuter[2] + gl_TessLevelOuter[3]) * 0.25;
        gl_TessLevelInner[0] = innerLevel;
        gl_TessLevelInner[1] = innerLevel;
    }
}
