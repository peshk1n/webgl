#pragma once
#include <glad/glad.h>

static const float kQuadVerts[] = {
    -1.f, -1.f,   1.f, -1.f,   1.f,  1.f,
    -1.f, -1.f,   1.f,  1.f,  -1.f,  1.f
};

static const char* kBlurVertSrc = R"(
#version 330 core
layout(location = 0) in vec2 aPos;
out vec2 vUV;
void main() {
    vUV = aPos * 0.5 + 0.5;            // NDC  UV
    gl_Position = vec4(aPos, 0.0, 1.0);
}
)";

static const char* kBlurFragSrc = R"(
#version 330 core
out vec4 FragColor;
in vec2 vUV;
uniform sampler2D uColorTex;
uniform sampler2D uVelocityTex;
uniform vec2  uScreenSize;   
uniform int   uSamples;      
uniform float uStrength;     

void main()
{
    vec2 vel_ndc = texture(uVelocityTex, vUV).rg;          
    vec2 vel_px  = vel_ndc * uScreenSize * 0.5;            
    vel_px      *= uStrength;                               
    float mag    = length(vel_px);
    if (mag > 80.0) vel_px *= 80.0 / mag;                    
    vec2 vel_uv  = vel_px / uScreenSize;                    

    int N = max(uSamples, 1);
    float totalWeight = 1.0;
    vec4 result = texture(uColorTex, vUV);                  

    for (int i = 1; i <= N; ++i)
    {
        float t = float(i) / float(N);
        float w = exp(-t * t * 0.5);                       
        vec2 off = vel_uv * t;
        result += texture(uColorTex, vUV - off) * w;
        result += texture(uColorTex, vUV + off) * w;
        totalWeight += w * 2.0;
    }
    FragColor = result / totalWeight;
}
)";
