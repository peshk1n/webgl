// ═══════════════════════════════════════════════════════════════════════════════
// Lab 8 — Terrain Tessellation with Adaptive LOD & Normals Visualization
//
// Single OpenGL 4.0+ demo combining:
//   1. Terrain rendering via tessellation shaders
//   2. Adaptive LOD (tessellation level varies with camera distance)
//   3. Geometry-shader-based normals visualization (toggle N)
//   4. Wireframe mode (toggle R)
//
// Controls:
//   WASD  — move camera
//   Q/E   — down/up
//   Mouse — look around (hold left button)
//   N     — toggle normals visualization
//   R     — toggle wireframe mode
//   ESC   — exit
//
// Dependencies: GLFW 3.3+, GLAD (OpenGL 4.0 Core), GLM
// ═══════════════════════════════════════════════════════════════════════════════

#include "glad.h"

#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <windows.h>
#endif

#include <GLFW/glfw3.h>

#define GLM_FORCE_PURE
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>

#include "renderer.h"
#include "camera.h"

#include <iostream>
#include <iomanip>
#include <sstream>
#include <algorithm>

// ═══════════════════════════════════════════════════════════════════════════════
// Globals
// ═══════════════════════════════════════════════════════════════════════════════
static GLFWwindow* g_window = nullptr;
static Renderer    g_renderer;
static Camera      g_camera;

static int  g_screenWidth  = 1280;
static int  g_screenHeight = 720;

// Input state
static bool g_keys[GLFW_KEY_LAST] = {};
static bool g_mouseDown = false;
static float g_lastMouseX = 0.0f;
static float g_lastMouseY = 0.0f;
static bool g_firstMouse  = true;   // avoid jump on first mouse event

// Timing
static float g_lastFrameTime = 0.0f;
static float g_totalTime     = 0.0f;

// Debug UI update interval (every N frames)
static int   g_frameCounter   = 0;
static const int UI_UPDATE_FRAMES = 30;   // update console every 30 frames

// ═══════════════════════════════════════════════════════════════════════════════
// GLFW Callbacks
// ═══════════════════════════════════════════════════════════════════════════════

static void keyCallback(GLFWwindow* window, int key, int /*scancode*/, int action, int /*mods*/)
{
    if (action == GLFW_PRESS) {
        g_keys[key] = true;

        switch (key) {
            case GLFW_KEY_ESCAPE:
                glfwSetWindowShouldClose(window, GLFW_TRUE);
                break;
            case GLFW_KEY_N:
                g_renderer.toggleNormals();
                break;
            case GLFW_KEY_R:
                g_renderer.toggleWireframe();
                break;
        }
    } else if (action == GLFW_RELEASE) {
        g_keys[key] = false;
    }
}

static void mouseButtonCallback(GLFWwindow* /*window*/, int button, int action, int /*mods*/)
{
    if (button == GLFW_MOUSE_BUTTON_LEFT) {
        g_mouseDown = (action == GLFW_PRESS);
        if (g_mouseDown) {
            g_firstMouse = true;   // reset to prevent jump
        }
    }
}

static void cursorPosCallback(GLFWwindow* /*window*/, double xpos, double ypos)
{
    if (!g_mouseDown) return;

    if (g_firstMouse) {
        g_lastMouseX = static_cast<float>(xpos);
        g_lastMouseY = static_cast<float>(ypos);
        g_firstMouse = false;
        return;
    }

    float dx = static_cast<float>(xpos) - g_lastMouseX;
    float dy = static_cast<float>(ypos) - g_lastMouseY;

    g_camera.processMouse(dx, dy);

    g_lastMouseX = static_cast<float>(xpos);
    g_lastMouseY = static_cast<float>(ypos);
}

static void framebufferSizeCallback(GLFWwindow* /*window*/, int width, int height)
{
    g_screenWidth  = width;
    g_screenHeight = height;
    g_renderer.resize(width, height);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Debug UI — periodic console output
// ═══════════════════════════════════════════════════════════════════════════════

static void printDebugInfo(float dt)
{
    // Update window title with key info
    std::ostringstream title;
    title << "Lab 8 — Terrain Tessellation"
          << " | FPS: " << std::fixed << std::setprecision(0) << g_renderer.fps()
          << " | Tess: " << std::fixed << std::setprecision(1)
          << g_renderer.estimateTessLevel(g_camera)
          << " | Normals: " << (g_renderer.normalsEnabled() ? "ON" : "OFF")
          << " | Wire: " << (g_renderer.wireframeEnabled() ? "ON" : "OFF");
    glfwSetWindowTitle(g_window, title.str().c_str());

    // Periodic console output
    g_frameCounter++;
    if (g_frameCounter % UI_UPDATE_FRAMES == 0) {
        std::cout << "\r[INFO] "
                  << "FPS: "      << std::fixed << std::setprecision(0) << std::setw(4) << g_renderer.fps()
                  << " | Tess: "  << std::fixed << std::setprecision(1) << std::setw(4)
                                   << g_renderer.estimateTessLevel(g_camera)
                  << " | Cam: ("   << std::fixed << std::setprecision(1)
                                   << g_camera.position().x << ", "
                                   << g_camera.position().y << ", "
                                   << g_camera.position().z << ")"
                  << " | Normals: " << (g_renderer.normalsEnabled() ? "ON " : "OFF")
                  << " | Wire: "   << (g_renderer.wireframeEnabled() ? "ON " : "OFF")
                  << "    " << std::flush;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Update — input + timing
// ═══════════════════════════════════════════════════════════════════════════════

static void update(float dt)
{
    // Camera movement
    g_camera.processKeyboard(
        g_keys[GLFW_KEY_W],
        g_keys[GLFW_KEY_S],
        g_keys[GLFW_KEY_A],
        g_keys[GLFW_KEY_D],
        g_keys[GLFW_KEY_Q],
        g_keys[GLFW_KEY_E],
        dt
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main — entry point
// ═══════════════════════════════════════════════════════════════════════════════

int main()
{
    // ── Ensure working directory is the exe directory (shaders are there) ──
#ifdef _WIN32
    char exePath[MAX_PATH];
    GetModuleFileNameA(nullptr, exePath, MAX_PATH);
    std::string exeDir(exePath);
    exeDir = exeDir.substr(0, exeDir.find_last_of("\\/"));
    SetCurrentDirectoryA(exeDir.c_str());
#endif

    std::cout << "==============================================" << std::endl;
    std::cout << " Lab 8 — Terrain Tessellation Demo" << std::endl;
    std::cout << " OpenGL 4.0+ with Tessellation & Geometry Shaders" << std::endl;
    std::cout << "==============================================" << std::endl;
    std::cout << " Controls:" << std::endl;
    std::cout << "   WASD  — move camera" << std::endl;
    std::cout << "   Q/E   — down/up" << std::endl;
    std::cout << "   Mouse — look around (hold left button)" << std::endl;
    std::cout << "   N     — toggle normals visualization" << std::endl;
    std::cout << "   R     — toggle wireframe mode" << std::endl;
    std::cout << "   ESC   — exit" << std::endl;
    std::cout << "==============================================" << std::endl;

    // ── Init GLFW ──────────────────────────────────────────────────────────
    glfwSetErrorCallback(glfwErrorCallback);

    if (!glfwInit()) {
        std::cerr << "[FATAL] Failed to initialize GLFW" << std::endl;
        return 1;
    }

    // Request OpenGL 4.0 Core profile (minimum for tessellation shaders)
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 4);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 0);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GLFW_TRUE);
    glfwWindowHint(GLFW_RESIZABLE, GLFW_TRUE);
    glfwWindowHint(GLFW_SAMPLES, 4);   // MSAA

    g_window = glfwCreateWindow(g_screenWidth, g_screenHeight,
                                "Lab 8 — Terrain Tessellation",
                                nullptr, nullptr);
    if (!g_window) {
        std::cerr << "[FATAL] Failed to create GLFW window" << std::endl;
        glfwTerminate();
        return 1;
    }

    glfwMakeContextCurrent(g_window);

    // Enable vsync
    glfwSwapInterval(1);

    // ── Load OpenGL (GLAD) ─────────────────────────────────────────────────
    if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress)) {
        std::cerr << "[FATAL] Failed to initialize GLAD" << std::endl;
        glfwDestroyWindow(g_window);
        glfwTerminate();
        return 1;
    }

    // Print OpenGL info
    std::cout << "[OpenGL] Version:  " << glGetString(GL_VERSION) << std::endl;
    std::cout << "[OpenGL] Renderer: " << glGetString(GL_RENDERER) << std::endl;
    std::cout << "[OpenGL] Vendor:   " << glGetString(GL_VENDOR) << std::endl;
    std::cout << "[OpenGL] GLSL:     " << glGetString(GL_SHADING_LANGUAGE_VERSION) << std::endl;

    // Check tessellation support (should always be true for GL 4.0+)
    GLint maxTessLevel = 0;
    glGetIntegerv(GL_MAX_TESS_GEN_LEVEL, &maxTessLevel);
    std::cout << "[OpenGL] Max tessellation level: " << maxTessLevel << std::endl;

    // ── Set callbacks ──────────────────────────────────────────────────────
    glfwSetKeyCallback(g_window, keyCallback);
    glfwSetMouseButtonCallback(g_window, mouseButtonCallback);
    glfwSetCursorPosCallback(g_window, cursorPosCallback);
    glfwSetFramebufferSizeCallback(g_window, framebufferSizeCallback);

    // ── Init renderer ──────────────────────────────────────────────────────
    glViewport(0, 0, g_screenWidth, g_screenHeight);

    if (!g_renderer.init()) {
        std::cerr << "[FATAL] Renderer initialization failed" << std::endl;
        glfwDestroyWindow(g_window);
        glfwTerminate();
        return 1;
    }

    // ── Main loop ──────────────────────────────────────────────────────────
    g_lastFrameTime = static_cast<float>(glfwGetTime());

    std::cout << "\n[Main] Entering render loop...\n" << std::endl;

    while (!glfwWindowShouldClose(g_window))
    {
        // Delta time
        float currentTime = static_cast<float>(glfwGetTime());
        float dt = currentTime - g_lastFrameTime;
        g_lastFrameTime = currentTime;
        g_totalTime += dt;

        // Clamp dt to avoid spiral of death on frame skips
        dt = std::min(dt, 0.1f);

        // Update
        update(dt);

        // Render
        g_renderer.render(g_camera, dt);

        // Debug UI
        printDebugInfo(dt);

        // Swap buffers and poll events
        glfwSwapBuffers(g_window);
        glfwPollEvents();
    }

    // ── Cleanup ────────────────────────────────────────────────────────────
    std::cout << "\n[Main] Shutting down..." << std::endl;

    glfwDestroyWindow(g_window);
    glfwTerminate();

    std::cout << "[Main] Done." << std::endl;
    return 0;
}
