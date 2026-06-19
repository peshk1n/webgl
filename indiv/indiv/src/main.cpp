#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <iostream>
#include <chrono>
#include "game/Game.h"
#include "engine/MotionBlur.h"
#include "engine/BlurShader.h"

constexpr int WINDOW_WIDTH  = 1280;
constexpr int WINDOW_HEIGHT = 720;
constexpr const char* WINDOW_TITLE = "3D Pong";

// Motion blur resources
static MotionBlurFBO g_mbFBO;
static GLuint g_blurVAO = 0, g_blurVBO = 0;
static GLuint g_blurProgram = 0;
static bool g_mbReady = false;

void framebuffer_size_callback(GLFWwindow* window, int width, int height);

int main()
{
    if (!glfwInit())
    {
        std::cerr << "Failed to initialize GLFW\n";
        return -1;
    }

    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

    GLFWwindow* window = glfwCreateWindow(WINDOW_WIDTH, WINDOW_HEIGHT, WINDOW_TITLE, nullptr, nullptr);
    if (!window)
    {
        std::cerr << "Failed to create GLFW window\n";
        glfwTerminate();
        return -1;
    }

    glfwMakeContextCurrent(window);
    glfwSetFramebufferSizeCallback(window, framebuffer_size_callback);

    if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress))
    {
        std::cerr << "Failed to initialize GLAD\n";
        return -1;
    }

    glEnable(GL_DEPTH_TEST);
    glEnable(GL_CULL_FACE);
    glCullFace(GL_BACK);
    glFrontFace(GL_CCW);

    glViewport(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);
    glClearColor(0.08f, 0.08f, 0.08f, 1.0f);

    // --- Init motion blur ---
    g_mbReady = g_mbFBO.init(WINDOW_WIDTH, WINDOW_HEIGHT);
    if (!g_mbReady)
        std::cerr << "[MotionBlur] FBO init failed — blur disabled\n";

    GLuint bv = glCreateShader(GL_VERTEX_SHADER);
    GLuint bf = glCreateShader(GL_FRAGMENT_SHADER);
    glShaderSource(bv, 1, &kBlurVertSrc, nullptr); glCompileShader(bv);
    glShaderSource(bf, 1, &kBlurFragSrc, nullptr); glCompileShader(bf);
    g_blurProgram = glCreateProgram();
    glAttachShader(g_blurProgram, bv); glAttachShader(g_blurProgram, bf);
    glLinkProgram(g_blurProgram);
    glDeleteShader(bv); glDeleteShader(bf);

    glGenVertexArrays(1, &g_blurVAO);
    glGenBuffers(1, &g_blurVBO);
    glBindVertexArray(g_blurVAO);
    glBindBuffer(GL_ARRAY_BUFFER, g_blurVBO);
    glBufferData(GL_ARRAY_BUFFER, sizeof(kQuadVerts), kQuadVerts, GL_STATIC_DRAW);
    glEnableVertexAttribArray(0);
    glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 0, nullptr);

    std::cout << "OpenGL: " << glGetString(GL_VERSION) << " | " << glGetString(GL_RENDERER) << "\n";
    std::cout << "Select mode:\n  1 = LOCAL (2 players, 1 keyboard)\n  2 = HOST (server)\n  3 = CLIENT (connect)\n";

    Game game;
    if (!game.init())
    {
        std::cerr << "Failed to initialize game\n";
        glfwTerminate();
        return -1;
    }

    // Wait for mode selection — render frozen scene
    std::cout << "Press 1, 2, or 3 (in game window)...\n";
    while (!glfwWindowShouldClose(window) && game.getMode() == GameMode::LOCAL && game.getState() == GameState::MENU)
    {
        glfwPollEvents();
        if (glfwGetKey(window, GLFW_KEY_1) == GLFW_PRESS) game.startLocal();
        if (glfwGetKey(window, GLFW_KEY_2) == GLFW_PRESS) game.startHost();
        if (glfwGetKey(window, GLFW_KEY_3) == GLFW_PRESS) game.startClient("127.0.0.1");
        if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS) glfwSetWindowShouldClose(window, true);

        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
        game.renderMenu();
        glfwSwapBuffers(window);
    }

    if (glfwWindowShouldClose(window)) { glfwTerminate(); return 0; }

    std::cout << "Controls: W/S & Up/Down = paddles, ESC = quit\n";

    auto lastFrame = std::chrono::high_resolution_clock::now();

    while (!glfwWindowShouldClose(window))
    {
        auto currentFrame = std::chrono::high_resolution_clock::now();
        float dt = std::chrono::duration<float>(currentFrame - lastFrame).count();
        lastFrame = currentFrame;
        if (dt > 0.1f) dt = 0.1f;

        game.handleInput(window);
        game.update(dt);

        if (g_mbReady)
        {
            // === Pass 1: render scene → FBO (color + velocity) ===
            g_mbFBO.bind();
            glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
            GLfloat zero[4] = {0,0,0,0};
            glClearBufferfv(GL_COLOR, 1, zero);
            game.render();
            g_mbFBO.unbind();

            // === Pass 2: fullscreen blur using velocity buffer ===
            glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
            glDisable(GL_DEPTH_TEST);
            glUseProgram(g_blurProgram);
            glActiveTexture(GL_TEXTURE0);
            glBindTexture(GL_TEXTURE_2D, g_mbFBO.colorTex);
            glUniform1i(glGetUniformLocation(g_blurProgram, "uColorTex"), 0);
            glActiveTexture(GL_TEXTURE1);
            glBindTexture(GL_TEXTURE_2D, g_mbFBO.velocityTex);
            glUniform1i(glGetUniformLocation(g_blurProgram, "uVelocityTex"), 1);
            glUniform2f(glGetUniformLocation(g_blurProgram, "uScreenSize"), (float)WINDOW_WIDTH, (float)WINDOW_HEIGHT);
            glUniform1i(glGetUniformLocation(g_blurProgram, "uSamples"), 8);
            glUniform1f(glGetUniformLocation(g_blurProgram, "uStrength"), 20.0f);
            glBindVertexArray(g_blurVAO);
            glDrawArrays(GL_TRIANGLES, 0, 6);
            glEnable(GL_DEPTH_TEST);
        }
        else
        {
            // Fallback: no blur
            glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
            game.render();
        }

        glfwSwapBuffers(window);
        glfwPollEvents();
    }

    glfwDestroyWindow(window);
    glfwTerminate();
    return 0;
}

void framebuffer_size_callback(GLFWwindow* window, int width, int height)
{
    glViewport(0, 0, width, height);
}
