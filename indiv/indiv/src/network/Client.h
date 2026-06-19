#pragma once
#include "Protocol.h"
#include <winsock2.h>
#include <deque>
#include <glm/glm.hpp>
#pragma comment(lib, "ws2_32.lib")

class Client
{
public:
    Client() = default;
    ~Client();

    bool connect(const char* serverIP, int port);
    void disconnect();
    bool isConnected() const { return m_connected; }

    void sendInput(const Protocol::InputPacket& input);
    void receiveState();
    bool getRenderState(glm::vec3& ballPos, float& pad1Y, float& pad2Y, int& s1, int& s2);

private:
    SOCKET m_socket = INVALID_SOCKET;
    sockaddr_in m_serverAddr{};
    bool m_connected = false;
    uint32_t m_inputSeq = 0;
    uint32_t m_lastStateSeq = 0;

    struct TimedState { Protocol::GameStatePacket state; float recvTime; };
    std::deque<TimedState> m_stateBuffer;
};
