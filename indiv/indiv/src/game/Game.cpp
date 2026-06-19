#include "Game.h"
#include <GLFW/glfw3.h>
#include <iostream>

bool Game::init()
{
    std::cout << "Initializing game...\n";

    m_camera.setPerspective(50.0f, 16.0f / 9.0f, 0.1f, 100.0f);
    m_camera.lookAt(
        glm::vec3(0.0f, 2.0f, 14.0f),
        glm::vec3(0.0f, 0.0f, 0.0f),
        glm::vec3(0.0f, 1.0f, 0.0f)
    );

    if (!m_court.init())  { std::cerr << "Court init failed\n"; return false; }
    if (!m_ball.init())   { std::cerr << "Ball init failed\n"; return false; }
    if (!m_paddleLeft.init() || !m_paddleRight.init())
        { std::cerr << "Paddle init failed\n"; return false; }
    if (!m_score.init())
        { std::cerr << "Score init failed\n"; return false; }

    m_ball.reset();
    m_score.reset();
    m_accumulator = 0.0f;
    m_resetTimer = 0.0f;
    std::cout << "Game initialized. Fixed timestep " << (1.0f / FIXED_DT) << " Hz\n";
    return true;
}

void Game::handleInput(GLFWwindow* window)
{
    if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS)
        glfwSetWindowShouldClose(window, true);

    // Restart on SPACE when game over
    if (m_state == GameState::GAME_OVER)
    {
        static bool spaceWasDown = false;
        bool spaceDown = glfwGetKey(window, GLFW_KEY_SPACE) == GLFW_PRESS;
        if (spaceDown && !spaceWasDown)
            restart();
        spaceWasDown = spaceDown;
        return;
    }

    m_wDown    = glfwGetKey(window, GLFW_KEY_W)     == GLFW_PRESS;
    m_sDown    = glfwGetKey(window, GLFW_KEY_S)     == GLFW_PRESS;
    m_upDown   = glfwGetKey(window, GLFW_KEY_UP)    == GLFW_PRESS;
    m_downDown = glfwGetKey(window, GLFW_KEY_DOWN)  == GLFW_PRESS;
}

void Game::restart()
{
    m_score.reset();
    m_ball.reset();
    m_accumulator = 0.0f;
    m_state = GameState::PLAYING;
    std::cout << "Game restarted!\n";
}

void Game::update(float frameDt)
{
    if (m_state != GameState::PLAYING) return;

    m_accumulator += frameDt;
    while (m_accumulator >= FIXED_DT)
    {
        switch (m_mode)
        {
            case GameMode::LOCAL:  fixedUpdate();       break;
            case GameMode::HOST:   fixedUpdateHost();    break;
            case GameMode::CLIENT: fixedUpdateClient();  break;
        }
        m_accumulator -= FIXED_DT;
    }
}

void Game::fixedUpdate()
{
    // --- Goal check ---
    float halfW = Court::WIDTH / 2.0f;
    if (m_ball.getPosition().x > halfW)
    {
        m_score.addPointLeft();
        m_ball.reset();
        return;
    }
    if (m_ball.getPosition().x < -halfW)
    {
        m_score.addPointRight();
        m_ball.reset();
        return;
    }

    if (m_score.isGameOver())
    {
        m_state = GameState::GAME_OVER;
        int winner = m_score.getScoreLeft() > m_score.getScoreRight() ? 1 : 2;
        std::cout << "\n=== GAME OVER ===\nPlayer " << winner << " wins!\n"
                  << "Score: " << m_score.getScoreLeft() << " - " << m_score.getScoreRight() << "\n"
                  << "Press SPACE to restart\n";
        return;
    }

    // --- Paddle movement (fixed step, independent of FPS) ---
    float halfH = Court::HEIGHT / 2.0f - Paddle::HEIGHT / 2.0f;

    auto movePaddle = [&](Paddle& p, bool up, bool down) {
        float y = p.getPosition().y;
        if (up)   y += PADDLE_SPEED * FIXED_DT;
        if (down) y -= PADDLE_SPEED * FIXED_DT;
        y = glm::clamp(y, -halfH, halfH);
        p.update(FIXED_DT, y);
    };

    movePaddle(m_paddleLeft,  m_wDown,  m_sDown);
    movePaddle(m_paddleRight, m_upDown, m_downDown);

    // --- Ball physics (fixed step) ---
    m_ball.update(FIXED_DT);

    glm::vec3 pos = m_ball.getPosition();
    glm::vec3 vel = m_ball.getVelocity();
    float r = m_ball.getRadius();

    // Top/bottom wall bounce
    if (pos.y > halfH)  { pos.y = halfH;  vel.y = -glm::abs(vel.y); }
    if (pos.y < -halfH) { pos.y = -halfH; vel.y =  glm::abs(vel.y); }

    // Side walls = goals — checked at top of fixedUpdate

    // Paddle collision
    auto checkPaddle = [&](const Paddle& paddle) {
        glm::vec3 pp = paddle.getPosition();
        float pw = Paddle::WIDTH / 2.0f;
        float ph = Paddle::HEIGHT / 2.0f;
        float pd = Paddle::DEPTH / 2.0f;

        float cx = glm::clamp(pos.x, pp.x - pw, pp.x + pw);
        float cy = glm::clamp(pos.y, pp.y - ph, pp.y + ph);
        float cz = glm::clamp(pos.z, pp.z - pd, pp.z + pd);
        glm::vec3 closest(cx, cy, cz);
        float dist = glm::distance(pos, closest);

        if (dist < r)
        {
            glm::vec3 normal = glm::normalize(pos - closest);
            if (glm::length(normal) < 0.001f) normal = glm::vec3(1, 0, 0);
            pos = closest + normal * r;
            float speed = glm::length(vel);
            vel = glm::reflect(vel, normal);
            vel.z = 0.0f;
            vel = glm::normalize(vel) * (speed * 1.05f);
            float influence = (pos.y - pp.y) / ph;
            vel.y += influence * 2.0f;
            vel = glm::normalize(vel) * glm::length(vel);
        }
    };

    checkPaddle(m_paddleLeft);
    checkPaddle(m_paddleRight);

    pos.z = 0.0f;
    vel.z = 0.0f;
    m_ball.setPosition(pos);
    m_ball.setVelocity(vel);
}

void Game::fixedUpdateHost()
{
    // Receive client input
    auto inp = m_server.receiveInput();

    // Move paddles
    float halfH = Court::HEIGHT / 2.0f - Paddle::HEIGHT / 2.0f;
    auto moveP = [&](Paddle& p, bool u, bool d) {
        float y = p.getPosition().y;
        if (u) y += PADDLE_SPEED * FIXED_DT;
        if (d) y -= PADDLE_SPEED * FIXED_DT;
        p.update(FIXED_DT, glm::clamp(y, -halfH, halfH));
    };
    moveP(m_paddleLeft,  m_wDown, m_sDown);
    moveP(m_paddleRight, inp.up, inp.down);

    m_ball.update(FIXED_DT);
    glm::vec3 pos = m_ball.getPosition();
    glm::vec3 vel = m_ball.getVelocity();
    float r = m_ball.getRadius();
    if (pos.y > halfH)  { pos.y = halfH;  vel.y = -glm::abs(vel.y); }
    if (pos.y < -halfH) { pos.y = -halfH; vel.y = glm::abs(vel.y); }

    auto checkPaddle = [&](const Paddle& paddle) {
        glm::vec3 pp = paddle.getPosition();
        float pw = Paddle::WIDTH/2.0f, ph = Paddle::HEIGHT/2.0f, pd = Paddle::DEPTH/2.0f;
        float cx = glm::clamp(pos.x, pp.x-pw, pp.x+pw);
        float cy = glm::clamp(pos.y, pp.y-ph, pp.y+ph);
        float cz = glm::clamp(pos.z, pp.z-pd, pp.z+pd);
        glm::vec3 closest(cx,cy,cz);
        if (glm::distance(pos, closest) < r)
        {
            glm::vec3 normal = glm::normalize(pos - closest);
            if (glm::length(normal) < 0.001f) normal = glm::vec3(1,0,0);
            pos = closest + normal * r;
            float speed = glm::length(vel);
            vel = glm::reflect(vel, normal);
            vel.z = 0.0f;
            vel = glm::normalize(vel) * (speed * 1.05f);
            float influence = (pos.y - pp.y) / ph;
            vel.y += influence * 2.0f;
            vel = glm::normalize(vel) * glm::length(vel);
        }
    };
    checkPaddle(m_paddleLeft);
    checkPaddle(m_paddleRight);
    pos.z = 0.0f; vel.z = 0.0f;
    m_ball.setPosition(pos); m_ball.setVelocity(vel);

    float halfW = Court::WIDTH / 2.0f;
    if (pos.x > halfW)  { m_score.addPointLeft();  m_ball.reset(); }
    if (pos.x < -halfW) { m_score.addPointRight(); m_ball.reset(); }
    if (m_score.isGameOver()) { m_state = GameState::GAME_OVER; return; }

    m_stateTimer += FIXED_DT;
    if (m_stateTimer >= Protocol::STATE_SEND_RATE)
    {
        m_stateTimer -= Protocol::STATE_SEND_RATE;
        static uint32_t seq = 0;
        Protocol::GameStatePacket pkt;
        pkt.seq = ++seq;
        pkt.timestamp = 0;
        pkt.ballX = m_ball.getPosition().x;
        pkt.ballY = m_ball.getPosition().y;
        pkt.ballVx = m_ball.getVelocity().x;
        pkt.ballVy = m_ball.getVelocity().y;
        pkt.pad1Y = m_paddleLeft.getPosition().y;
        pkt.pad2Y = m_paddleRight.getPosition().y;
        pkt.score1 = m_score.getScoreLeft();
        pkt.score2 = m_score.getScoreRight();
        m_server.sendState(pkt);
    }
}

void Game::fixedUpdateClient()
{
    Protocol::InputPacket inp;
    inp.up = m_upDown; inp.down = m_downDown;
    static uint32_t iSeq = 0;
    inp.seq = ++iSeq;
    m_client.sendInput(inp);

    m_client.receiveState();

    m_client.getRenderState(m_clientBallPos, m_clientPad1Y, m_clientPad2Y,
                            m_clientScore1, m_clientScore2);

    m_paddleLeft.update(FIXED_DT, m_clientPad1Y);
    m_paddleRight.update(FIXED_DT, m_clientPad2Y);
}

void Game::render()
{
    m_court.render(m_camera);

    glm::mat4 view   = m_camera.getViewMatrix();
    glm::mat4 proj   = m_camera.getProjectionMatrix();
    glm::vec3 camPos = m_camera.getPosition();

    if (m_state == GameState::GAME_OVER)
    {
        int left  = (m_mode == GameMode::CLIENT) ? m_clientScore1 : m_score.getScoreLeft();
        int right = (m_mode == GameMode::CLIENT) ? m_clientScore2 : m_score.getScoreRight();
        m_score.renderGameOver(view, proj, camPos, left, right);
        return;
    }

    if (m_mode == GameMode::CLIENT)
    {
        m_ball.setPosition(m_clientBallPos);
        m_ball.render(view, proj, camPos, m_court.getSkyboxTexture());
        m_paddleLeft.render(view, proj, camPos);
        m_paddleRight.render(view, proj, camPos);
        m_score.renderScores(m_clientScore1, m_clientScore2, view, proj, camPos);
        return;
    }

    m_ball.render(view, proj, camPos, m_court.getSkyboxTexture());
    m_paddleLeft.render(view, proj, camPos);
    m_paddleRight.render(view, proj, camPos);
    m_score.render(view, proj, camPos);
}

void Game::renderMenu()
{
    m_court.render(m_camera);
}

void Game::startLocal()
{
    m_mode = GameMode::LOCAL;
    m_state = GameState::PLAYING;
    std::cout << "[Mode] LOCAL — two players on one keyboard\n";
}

void Game::startHost()
{
    if (m_server.start(Protocol::SERVER_PORT))
    {
        m_mode = GameMode::HOST;
        m_state = GameState::PLAYING;
        std::cout << "[Mode] HOST — waiting for client on port " << Protocol::SERVER_PORT << "\n";
    }
    else { std::cerr << "Failed to start server!\n"; startLocal(); }
}

void Game::startClient(const char* ip)
{
    if (m_client.connect(ip, Protocol::SERVER_PORT))
    {
        m_mode = GameMode::CLIENT;
        m_state = GameState::PLAYING;
        std::cout << "[Mode] CLIENT — connected to " << ip << "\n";
    }
    else { std::cerr << "Failed to connect!\n"; startLocal(); }
}
