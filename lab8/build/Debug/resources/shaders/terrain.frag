#version 400 core

// ═══════════════════════════════════════════════════════════════════════════════
// Terrain Fragment Shader — Blinn-Phong lighting with height-based coloring.
//
// Directional light (sun) + ambient. Height maps to color gradient:
//   low (water/sand) → mid (grass) → high (rock/snow).
// ═══════════════════════════════════════════════════════════════════════════════

in vec3 teWorldPos;
in vec3 teWorldNormal;
in vec2 teTexCoord;
in float teHeight;

out vec4 fragColor;

uniform vec3  uLightDirection;  // direction TO light (world space, normalized)
uniform vec3  uLightColor;      // e.g., (1.0, 0.95, 0.85)
uniform float uAmbientStrength; // e.g., 0.3
uniform vec3  uCameraPosition;

// Height-based terrain color
vec3 getTerrainColor(float h)
{
    // h in [0, 1]
    vec3 waterColor  = vec3(0.1, 0.3, 0.6);
    vec3 sandColor   = vec3(0.76, 0.70, 0.50);
    vec3 grassColor  = vec3(0.28, 0.55, 0.20);
    vec3 rockColor   = vec3(0.45, 0.42, 0.38);
    vec3 snowColor   = vec3(0.95, 0.95, 0.97);

    // Define transition bands
    float sandStart  = 0.0;
    float grassStart = 0.08;
    float rockStart  = 0.45;
    float snowStart  = 0.78;

    vec3 color;
    if (h < grassStart) {
        color = mix(waterColor, sandColor, smoothstep(sandStart, grassStart, h));
    } else if (h < rockStart) {
        color = mix(sandColor, grassColor, smoothstep(grassStart, rockStart, h));
    } else if (h < snowStart) {
        color = mix(grassColor, rockColor, smoothstep(rockStart, snowStart, h));
    } else {
        color = mix(rockColor, snowColor, smoothstep(snowStart, 1.0, h));
    }
    return color;
}

void main()
{
    vec3 N = normalize(teWorldNormal);
    vec3 L = normalize(uLightDirection);

    // Blinn-Phong components
    float diff = max(dot(N, L), 0.0);

    // Specular (Blinn half-vector)
    vec3 V = normalize(uCameraPosition - teWorldPos);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 32.0);

    // Ambient
    vec3 ambient = uAmbientStrength * uLightColor;

    // Combine
    vec3 terrainColor = getTerrainColor(teHeight);
    vec3 diffuse  = diff  * uLightColor * terrainColor;
    vec3 specular = spec  * uLightColor * 0.4;

    fragColor = vec4(ambient * terrainColor + diffuse + specular, 1.0);
}
