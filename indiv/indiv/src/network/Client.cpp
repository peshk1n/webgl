#define _WINSOCK_DEPRECATED_NO_WARNINGS
#include "Client.h"
#include <iostream>
#include <chrono>

Client::~Client() { disconnect(); }

bool Client::connect(const char* serverIP, int port)
{
    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2,2), &wsa) != 0) return false;

    m_socket = socket(AF_INET, SOCK_DGRAM, 0);
    if (m_socket == INVALID_SOCKET) return false;

    u_long mode = 1;
    ioctlsocket(m_socket, FIONBIO, &mode);

    m_serverAddr.sin_family = AF_INET;
    m_serverAddr.sin_port = htons((u_short)port);
    m_serverAddr.sin_addr.s_addr = inet_addr(serverIP);

    Protocol::PacketHeader join = { 0, Protocol::JOIN };
    sendto(m_socket, (char*)&join, sizeof(join), 0, (sockaddr*)&m_serverAddr, sizeof(m_serverAddr));

    m_connected = true;
    std::cout << "[Client] Connecting to " << serverIP << ":" << port << "\n";
    return true;
}

void Client::disconnect()
{
    if (m_socket != INVALID_SOCKET) { closesocket(m_socket); m_socket = INVALID_SOCKET; }
    WSACleanup();
    m_connected = false;
}

void Client::sendInput(const Protocol::InputPacket& input)
{
    if (!m_connected) return;
    char buf[256];
    Protocol::PacketHeader hdr = { input.seq, Protocol::INPUT };
    memcpy(buf, &hdr, sizeof(hdr));
    memcpy(buf + sizeof(hdr), &input, sizeof(input));
    sendto(m_socket, buf, sizeof(hdr) + sizeof(input), 0, (sockaddr*)&m_serverAddr, sizeof(m_serverAddr));
}

void Client::receiveState()
{
    if (!m_connected) return;

    char buf[512];
    sockaddr_in from{};
    int fromLen = sizeof(from);
    int len = recvfrom(m_socket, buf, sizeof(buf), 0, (sockaddr*)&from, &fromLen);
    auto now = std::chrono::steady_clock::now();
    float t = std::chrono::duration<float>(now.time_since_epoch()).count();

    while (len >= (int)sizeof(Protocol::PacketHeader))
    {
        auto* hdr = (Protocol::PacketHeader*)buf;
        if (hdr->type == Protocol::STATE &&
            len >= (int)(sizeof(Protocol::PacketHeader) + sizeof(Protocol::GameStatePacket)))
        {
            auto* st = (Protocol::GameStatePacket*)(buf + sizeof(Protocol::PacketHeader));
            if (st->seq > m_lastStateSeq)
            {
                m_lastStateSeq = st->seq;
                m_stateBuffer.push_back({ *st, t });
                while ((int)m_stateBuffer.size() > Protocol::STATE_BUFFER_SIZE)
                    m_stateBuffer.pop_front();
            }
        }
        len = recvfrom(m_socket, buf, sizeof(buf), 0, (sockaddr*)&from, &fromLen);
    }
}

bool Client::getRenderState(glm::vec3& ballPos, float& pad1Y, float& pad2Y, int& s1, int& s2)
{
    if (m_stateBuffer.empty()) return false;

    auto now = std::chrono::steady_clock::now();
    float nowTime = std::chrono::duration<float>(now.time_since_epoch()).count();
    float renderTime = nowTime - Protocol::JITTER_DELAY;

    auto& back = m_stateBuffer.back();
    if (m_stateBuffer.size() < 2 || renderTime >= back.recvTime)
    {
        ballPos = glm::vec3(back.state.ballX, back.state.ballY, 0.0f);
        pad1Y = back.state.pad1Y; pad2Y = back.state.pad2Y;
        s1 = back.state.score1; s2 = back.state.score2;
        return true;
    }

    for (size_t i = 1; i < m_stateBuffer.size(); ++i)
    {
        if (m_stateBuffer[i].recvTime >= renderTime)
        {
            auto& a = m_stateBuffer[i-1];
            auto& b = m_stateBuffer[i];
            float range = b.recvTime - a.recvTime;
            float t = (range > 0.0001f) ? (renderTime - a.recvTime) / range : 0.0f;
            t = glm::clamp(t, 0.0f, 1.0f);
            ballPos.x = glm::mix(a.state.ballX, b.state.ballX, t);
            ballPos.y = glm::mix(a.state.ballY, b.state.ballY, t);
            ballPos.z = 0.0f;
            pad1Y = glm::mix(a.state.pad1Y, b.state.pad1Y, t);
            pad2Y = glm::mix(a.state.pad2Y, b.state.pad2Y, t);
            s1 = a.state.score1; s2 = a.state.score2;
            return true;
        }
    }

    ballPos = glm::vec3(back.state.ballX, back.state.ballY, 0.0f);
    pad1Y = back.state.pad1Y; pad2Y = back.state.pad2Y;
    s1 = back.state.score1; s2 = back.state.score2;
    return true;
}
