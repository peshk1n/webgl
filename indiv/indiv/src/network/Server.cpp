#include "Server.h"
#include <iostream>

Server::~Server() { stop(); }

bool Server::start(int port)
{
    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2,2), &wsa) != 0) return false;

    m_socket = socket(AF_INET, SOCK_DGRAM, 0);
    if (m_socket == INVALID_SOCKET) return false;

    u_long mode = 1;
    ioctlsocket(m_socket, FIONBIO, &mode);

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_port = htons((u_short)port);
    addr.sin_addr.s_addr = INADDR_ANY;
    if (bind(m_socket, (sockaddr*)&addr, sizeof(addr)) != 0) return false;

    m_running = true;
    std::cout << "[Server] Listening on port " << port << "...\n";
    return true;
}

void Server::stop()
{
    if (m_socket != INVALID_SOCKET) { closesocket(m_socket); m_socket = INVALID_SOCKET; }
    WSACleanup();
    m_running = false;
}

Protocol::InputPacket Server::receiveInput()
{
    Protocol::InputPacket pkt = { 0, false, false };
    if (!m_running) return pkt;

    char buf[256];
    int len = recvfrom(m_socket, buf, sizeof(buf), 0, (sockaddr*)&m_clientAddr, &m_clientAddrLen);

    while (len >= (int)sizeof(Protocol::PacketHeader))
    {
        auto* hdr = (Protocol::PacketHeader*)buf;
        if (hdr->type == Protocol::JOIN && !m_clientConnected)
        {
            m_clientConnected = true;
            std::cout << "[Server] Client connected!\n";
        }
        else if (hdr->type == Protocol::INPUT && m_clientConnected &&
                 len >= (int)(sizeof(Protocol::PacketHeader) + sizeof(Protocol::InputPacket)))
        {
            auto* inp = (Protocol::InputPacket*)(buf + sizeof(Protocol::PacketHeader));
            if (inp->seq > m_lastInputSeq)
            {
                m_lastInputSeq = inp->seq;
                pkt = *inp;
            }
        }
        len = recvfrom(m_socket, buf, sizeof(buf), 0, (sockaddr*)&m_clientAddr, &m_clientAddrLen);
    }
    return pkt;
}

void Server::sendState(const Protocol::GameStatePacket& state)
{
    if (!m_running || !m_clientConnected) return;

    char buf[512];
    Protocol::PacketHeader hdr = { state.seq, Protocol::STATE };
    int off = 0;
    memcpy(buf + off, &hdr, sizeof(hdr)); off += sizeof(hdr);
    memcpy(buf + off, &state, sizeof(state)); off += sizeof(state);
    sendto(m_socket, buf, off, 0, (sockaddr*)&m_clientAddr, m_clientAddrLen);
}
