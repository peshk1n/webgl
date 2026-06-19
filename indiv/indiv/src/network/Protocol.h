#pragma once
#include <cstdint>

namespace Protocol
{
    enum PacketType : uint8_t { JOIN = 0, STATE = 1, INPUT = 2, DISCONNECT = 3 };

    struct PacketHeader { uint32_t seq; uint8_t type; };

    struct GameStatePacket
    {
        uint32_t seq;
        uint32_t timestamp;
        float ballX, ballY, ballVx, ballVy;
        float pad1Y, pad2Y;
        int score1, score2;
    };

    struct InputPacket
    {
        uint32_t seq;
        bool up, down;
    };

    constexpr int SERVER_PORT = 27015;
    constexpr float STATE_SEND_RATE = 1.0f / 30.0f;
    constexpr float INPUT_RESEND_RATE = 1.0f / 15.0f;
    constexpr float JITTER_DELAY = 0.033f;
    constexpr int STATE_BUFFER_SIZE = 4;
}
