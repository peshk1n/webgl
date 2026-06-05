#version 400 core

// ═══════════════════════════════════════════════════════════════════════════════
// Terrain Tessellation Control Shader — adaptive LOD with crack-free edges.
//
// Computes tessellation levels per EDGE (based on edge midpoint distance to
// camera), ensuring adjacent patches sharing an edge get the SAME outer level.
//
// Formula per edge:
//   tessLevel = clamp(uMaxTessLevel / (1.0 + dist * uLODFactor), 1.0, uMaxTessLevel)
//
// Inner levels are the average of outer levels for smooth transitions.
// ═══════════════════════════════════════════════════════════════════════════════

layout(vertices = 4) out;

in vec3 vWorldPos[];    // from VS
in vec2 vTexCoord[];

out vec3 tcWorldPos[];  // to TES
out vec2 tcTexCoord[];

uniform float uMaxTessLevel;   // e.g., 64.0
uniform float uLODFactor;      // e.g., 0.08 — higher = tess drops faster
uniform vec3  uCameraPosition; // world-space camera pos

// Compute tess level for a world-space point
float tessForPoint(vec3 point)
{
    float dist = length(point - uCameraPosition);
    float level = uMaxTessLevel / (1.0 + dist * uLODFactor);
    return clamp(level, 1.0, uMaxTessLevel);
}

void main()
{
    // Pass through control points
    tcWorldPos[gl_InvocationID] = vWorldPos[gl_InvocationID];
    tcTexCoord[gl_InvocationID] = vTexCoord[gl_InvocationID];

    if (gl_InvocationID == 0)
    {
        // ── Per-EDGE tessellation levels (prevents seams) ──────────────────
        // Matching reference: Outer[0]=left, Outer[1]=bottom, Outer[2]=right, Outer[3]=top
        vec3 edgeMidL = (vWorldPos[3] + vWorldPos[0]) * 0.5;  // left edge
        vec3 edgeMidB = (vWorldPos[0] + vWorldPos[1]) * 0.5;  // bottom edge
        vec3 edgeMidR = (vWorldPos[1] + vWorldPos[2]) * 0.5;  // right edge
        vec3 edgeMidT = (vWorldPos[2] + vWorldPos[3]) * 0.5;  // top edge

        gl_TessLevelOuter[0] = tessForPoint(edgeMidL);
        gl_TessLevelOuter[1] = tessForPoint(edgeMidB);
        gl_TessLevelOuter[2] = tessForPoint(edgeMidR);
        gl_TessLevelOuter[3] = tessForPoint(edgeMidT);

        // Inner levels — average of outer for smooth interior
        float innerLevel = (gl_TessLevelOuter[0] + gl_TessLevelOuter[1] +
                            gl_TessLevelOuter[2] + gl_TessLevelOuter[3]) * 0.25;
        gl_TessLevelInner[0] = innerLevel;
        gl_TessLevelInner[1] = innerLevel;
    }
}

