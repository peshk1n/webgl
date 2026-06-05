#version 400 core

// ═══════════════════════════════════════════════════════════════════════════════
// Normals Tessellation Evaluation Shader — same as terrain.tese but passes
// world-space position and normal to geometry shader instead of fragment shader.
// ═══════════════════════════════════════════════════════════════════════════════

layout(quads, fractional_even_spacing, ccw) in;

in vec3 tcWorldPos[];
in vec2 tcTexCoord[];

// Output to geometry shader
out vec3 gsWorldPos;
out vec3 gsWorldNormal;

uniform sampler2D uHeightmap;
uniform float    uHeightScale;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

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
    vec3 flatPos = interpolate3D(tcWorldPos[0], tcWorldPos[1], tcWorldPos[2], tcWorldPos[3]);
    vec2 uv      = interpolate2D(tcTexCoord[0], tcTexCoord[1], tcTexCoord[2], tcTexCoord[3]);

    float height = texture(uHeightmap, uv).r;
    vec3 worldPos = flatPos;
    worldPos.y = height * uHeightScale;

    // Normal from heightmap gradient (same corrected logic as terrain.tese)
    float texelSize = 1.0 / 256.0;
    float worldStep = 60.0 / 256.0;

    float hL = texture(uHeightmap, uv + vec2(-texelSize, 0.0)).r * uHeightScale;
    float hR = texture(uHeightmap, uv + vec2( texelSize, 0.0)).r * uHeightScale;
    float hD = texture(uHeightmap, uv + vec2(0.0, -texelSize)).r * uHeightScale;
    float hU = texture(uHeightmap, uv + vec2(0.0,  texelSize)).r * uHeightScale;

    vec3 tangentX = normalize(vec3(2.0 * worldStep, hR - hL, 0.0));
    vec3 tangentZ = normalize(vec3(0.0, hU - hD, 2.0 * worldStep));
    vec3 normal = normalize(cross(tangentZ, tangentX));
    vec3 worldNormal = normalize(mat3(uModel) * normal);

    gsWorldPos   = worldPos;
    gsWorldNormal = worldNormal;

    vec4 worldPos4 = uModel * vec4(worldPos, 1.0);
    vec4 viewPos   = uView  * worldPos4;
    gl_Position    = uProjection * viewPos;
}
