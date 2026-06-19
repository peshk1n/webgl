#pragma once
#include "Protocol.h"
#include <winsock2.h>
#pragma comment(lib, "ws2_32.lib")

class Server
{
public:
    Server() = default;
    ~Server();

    bool start(int port);
    void stop();
    bool isRunning() const { return m_running; }
    bool hasClient() const { return m_clientConnected; }

    Protocol::InputPacket receiveInput();
    void sendState(const Protocol::GameStatePacket& state);

private:
    bool m_running = false;
    SOCKET m_socket = INVALID_SOCKET;
    sockaddr_in m_clientAddr{};
    int m_clientAddrLen = sizeof(m_clientAddr);
    bool m_clientConnected = false;
    uint32_t m_lastInputSeq = 0;
    uint32_t m_stateSeq = 0;
};
