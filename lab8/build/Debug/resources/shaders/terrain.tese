#version 400 core

// ═══════════════════════════════════════════════════════════════════════════════
// Terrain Tessellation Evaluation Shader — heightmap displacement + normal calc.
//
// Uses quads with equal_spacing for smooth tessellation.
// Samples heightmap texture to displace Y, computes normals from heightmap
// gradients via finite differences, then transforms to clip space.
// ═══════════════════════════════════════════════════════════════════════════════

layout(quads, fractional_even_spacing, ccw) in;

in vec3 tcWorldPos[];
in vec2 tcTexCoord[];

out vec3 teWorldPos;      // world-space position (after displacement)
out vec3 teWorldNormal;   // world-space normal
out vec2 teTexCoord;
out float teHeight;       // for color mapping in fragment shader

uniform sampler2D uHeightmap;
uniform float uHeightScale;    // vertical exaggeration, e.g., 10.0

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

// Bilinear interpolation on a quad using gl_TessCoord
vec2 interpolate2D(vec2 v0, vec2 v1, vec2 v2, vec2 v3)
{
    return mix(mix(v0, v1, gl_TessCoord.x),
               mix(v3, v2, gl_TessCoord.x),
               gl_TessCoord.y);
}

vec3 interpolate3D(vec3 v0, vec3 v1, vec3 v2, vec3 v3)
{
    return mix(mix(v0, v1, gl_TessCoord.x),
               mix(v3, v2, gl_TessCoord.x),
               gl_TessCoord.y);
}

void main()
{
    // Interpolate position (XZ plane) and UV
    vec3 flatPos = interpolate3D(tcWorldPos[0], tcWorldPos[1], tcWorldPos[2], tcWorldPos[3]);
    vec2 uv      = interpolate2D(tcTexCoord[0], tcTexCoord[1], tcTexCoord[2], tcTexCoord[3]);

    // Sample heightmap at explicit LOD 0 — avoids mip-level discontinuities
    // between adjacent patches, which would cause visible seams.
    float height = texture(uHeightmap, uv).r;

    // Displace Y
    vec3 worldPos = flatPos;
    worldPos.y = height * uHeightScale;

    // ── Compute normal from heightmap gradient (finite differences) ────────
    // Heightmap 256×256 covers the entire 60×60 terrain.
    // One texel in UV space = WORLD_SIZE / HEIGHTMAP_SIZE in world space.
    float texelSize = 1.0 / 256.0;                       // UV step
    float worldStep = 60.0 / 256.0;                       // world-space step per texel

    float hL = texture(uHeightmap, uv + vec2(-texelSize, 0.0)).r * uHeightScale;
    float hR = texture(uHeightmap, uv + vec2( texelSize, 0.0)).r * uHeightScale;
    float hD = texture(uHeightmap, uv + vec2(0.0, -texelSize)).r * uHeightScale;
    float hU = texture(uHeightmap, uv + vec2(0.0,  texelSize)).r * uHeightScale;

    // Tangent vectors in world space
    // tangentX ≈ (2*worldStep, hR-hL, 0)
    // tangentZ ≈ (0, hU-hD, 2*worldStep)
    vec3 tangentX = normalize(vec3(2.0 * worldStep, hR - hL, 0.0));
    vec3 tangentZ = normalize(vec3(0.0, hU - hD, 2.0 * worldStep));
    vec3 normal = normalize(cross(tangentZ, tangentX));

    // Transform normal to world space (model matrix may include rotation)
    vec3 worldNormal = normalize(mat3(uModel) * normal);

    // ── Output ─────────────────────────────────────────────────────────────
    teWorldPos   = worldPos;
    teWorldNormal = worldNormal;
    teTexCoord   = uv;
    teHeight     = height;

    vec4 worldPos4 = uModel * vec4(worldPos, 1.0);
    vec4 viewPos   = uView  * worldPos4;

    gl_Position = uProjection * viewPos;
}
