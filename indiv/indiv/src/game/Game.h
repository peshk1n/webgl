#pragma once
#include "Ball.h"
#include "Paddle.h"
#include "Score.h"
#include "Court.h"
#include "../engine/Camera.h"
#include "../network/Server.h"
#include "../network/Client.h"

struct GLFWwindow;

enum class GameState { MENU, PLAYING, PAUSED, GAME_OVER };
enum class GameMode { LOCAL, HOST, CLIENT };

class Game
{
public:
    Game() = default;

    bool init();
    void update(float frameDt);
    void render();
    void renderMenu();
    void handleInput(GLFWwindow* window);
    void restart();

    GameState getState() const { return m_state; }
    GameMode getMode() const { return m_mode; }

    void startLocal();
    void startHost();
    void startClient(const char* ip);

    static constexpr float FIXED_DT = 1.0f / 60.0f;

private:
    void fixedUpdate();
    void fixedUpdateHost();
    void fixedUpdateClient();

    GameState m_state = GameState::MENU;
    GameMode m_mode = GameMode::LOCAL;
    Camera m_camera;
    Court m_court;
    Ball m_ball;
    Paddle m_paddleLeft{ true };
    Paddle m_paddleRight{ false };
    Score m_score;
    float m_resetTimer = 0.0f;
    float m_accumulator = 0.0f;

    bool m_wDown = false, m_sDown = false;
    bool m_upDown = false, m_downDown = false;
    static constexpr float PADDLE_SPEED = 10.0f;

    Server m_server;
    Client m_client;
    Protocol::InputPacket m_lastInput{0,false,false};
    float m_stateTimer = 0.0f;
    float m_inputTimer = 0.0f;

    glm::vec3 m_clientBallPos{0,0,0};
    float m_clientPad1Y = 0, m_clientPad2Y = 0;
    int m_clientScore1 = 0, m_clientScore2 = 0;
};
