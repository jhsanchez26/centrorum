import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

type User = {
  id: number;
  encrypted_id?: string;
  display_name: string;
};

type Message = {
  id: number;
  sender: User;
  content: string;
  created_at: string;
  read_at: string | null;
};

type Conversation = {
  id: number;
  user1: User;
  user2: User;
  other_user: User;
  last_message: Message | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
};

type ConversationRequest = {
  id: number;
  requester: User;
  recipient: User;
  status: string;
  message: string;
  created_at: string;
};

export default function Messaging() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationRequests, setConversationRequests] = useState<ConversationRequest[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"conversations" | "requests">("conversations");

  const fetchConversations = useCallback(async () => {
    try {
      const response = await api.get("/auth/conversations/");
      setConversations(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError("Failed to load conversations");
      setConversations([]);
    }
  }, []);

  const fetchConversationRequests = useCallback(async () => {
    try {
      const response = await api.get("/auth/conversation-requests/");
      setConversationRequests(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setConversationRequests([]);
    }
  }, []);

  const fetchMessages = useCallback(
    async (conversationId: number, isRefresh: boolean = false) => {
      try {
        // Only show loading state on initial load, not on refresh
        if (!isRefresh) {
          setLoadingMessages(true);
        }
        const response = await api.get(`/auth/conversations/${conversationId}/messages/`);
        setMessages(response.data);
        await api.post(`/auth/conversations/${conversationId}/mark-read/`);
        await fetchConversations();
        setIsInitialLoad(false);
      } catch (err: any) {
        setError("Failed to load messages");
      } finally {
        setLoadingMessages(false);
      }
    },
    [fetchConversations]
  );

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchConversations(), fetchConversationRequests()]);
      setLoading(false);
    };
    loadData();
  }, [fetchConversations, fetchConversationRequests]);

  // Auto-refresh every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
      if (activeTab === "requests") {
        fetchConversationRequests();
      }
      if (selectedConversation) {
        // Pass true to indicate this is a refresh, not initial load
        fetchMessages(selectedConversation.id, true);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchConversations, fetchConversationRequests, selectedConversation, fetchMessages, activeTab]);

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setActiveTab("conversations");
    setIsInitialLoad(true);
    await fetchMessages(conversation.id, false);
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    try {
      setSendingMessage(true);
      const response = await api.post(`/auth/conversations/${selectedConversation.id}/send/`, {
        content: newMessage.trim(),
      });

      setMessages([...messages, response.data]);
      setNewMessage("");
      await fetchConversations();
    } catch (err: any) {
      setError("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAcceptRequest = async (request: ConversationRequest) => {
    try {
      const response = await api.post(`/auth/conversation-requests/${request.id}/respond/`, {
        action: "accept",
      });

      await fetchConversationRequests();
      await fetchConversations();

      if (response.data.conversation) {
        setSelectedConversation(response.data.conversation);
        setIsInitialLoad(true);
        await fetchMessages(response.data.conversation.id, false);
      }

      setActiveTab("conversations");
    } catch (err: any) {
      setError("Failed to accept request");
    }
  };

  const handleDenyRequest = async (request: ConversationRequest) => {
    try {
      await api.post(`/auth/conversation-requests/${request.id}/respond/`, {
        action: "deny",
      });

      await fetchConversationRequests();
    } catch (err: any) {
      setError("Failed to deny request");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "48px 24px",
          backgroundColor: "var(--light-bg)",
        }}
      >
        <div
          style={{
            maxWidth: 960,
            width: "100%",
            backgroundColor: "#fcfcf9",
            borderRadius: 28,
            boxShadow: "0 18px 40px rgba(0,0,0,0.10)",
            border: "1px solid rgba(0,0,0,0.03)",
            padding: "32px 40px",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, color: "#4b5563" }}>Loading messages...</p>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "48px 24px",
        backgroundColor: "var(--light-bg)",
      }}
    >
      {/* Big CentroRUM-style card */}
      <div
        style={{
          maxWidth: 1100,
          width: "100%",
          backgroundColor: "#fcfcf9",
          borderRadius: 28,
          boxShadow: "0 18px 40px rgba(0,0,0,0.10)",
          border: "1px solid rgba(0,0,0,0.03)",
          padding: "28px 32px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          minHeight: 520,
          maxHeight: "70vh",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--accent-green)",
              fontWeight: 600,
            }}
          >
            Messages
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 900,
              color: "var(--text-dark)",
            }}
          >
            Inbox & Conversations
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.6,
              color: "#4b5563",
              maxWidth: 640,
            }}
          >
            Chat privately with other CentroRUM users. Use the sidebar to switch
            between conversations and conversation requests.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: 10,
              backgroundColor: "#ffe6e6",
              border: "1px solid #f5b5b5",
              borderRadius: 12,
              color: "#b91c1c",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {/* Content area: sidebar + chat */}
        <div
          style={{
            flex: 1,
            display: "flex",
            gap: 16,
            minHeight: 0,
          }}
        >
          {/* Sidebar */}
          <div
            style={{
              width: 320,
              backgroundColor: "var(--card-bg)",
              borderRadius: 18,
              border: "1px solid rgba(148,163,184,0.45)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
            }}
          >
            {/* Tabs */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <button
                onClick={() => {
                  setActiveTab("conversations");
                  setSelectedConversation(null);
                }}
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  border: "none",
                  backgroundColor:
                    activeTab === "conversations" ? "#f3f4f6" : "transparent",
                  cursor: "pointer",
                  fontWeight: activeTab === "conversations" ? 600 : 400,
                  color:
                    activeTab === "conversations" ? "#006729" : "#4a5568",
                  borderBottom:
                    activeTab === "conversations"
                      ? "2px solid #006729"
                      : "2px solid transparent",
                  fontSize: 13,
                }}
              >
                Conversations
                {conversations.length > 0 && (
                  <span
                    style={{
                      marginLeft: 6,
                      color: "#6b7280",
                      fontSize: 11,
                    }}
                  >
                    ({conversations.length})
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("requests")}
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  border: "none",
                  backgroundColor:
                    activeTab === "requests" ? "#f3f4f6" : "transparent",
                  cursor: "pointer",
                  fontWeight: activeTab === "requests" ? 600 : 400,
                  color: activeTab === "requests" ? "#006729" : "#4a5568",
                  borderBottom:
                    activeTab === "requests"
                      ? "2px solid #006729"
                      : "2px solid transparent",
                  position: "relative",
                  fontSize: 13,
                }}
              >
                Requests
                {(() => {
                  if (!currentUser) return null;
                  const pendingReceivedCount = Array.isArray(
                    conversationRequests
                  )
                    ? conversationRequests.filter(
                        (req) =>
                          req.recipient.id === currentUser.id &&
                          req.status === "pending"
                      ).length
                    : 0;
                  return pendingReceivedCount > 0 ? (
                    <span
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 10,
                        backgroundColor: "#e53e3e",
                        color: "white",
                        borderRadius: "999px",
                        padding: "1px 7px",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {pendingReceivedCount}
                    </span>
                  ) : null;
                })()}
              </button>
            </div>

            {/* Sidebar content */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 8,
              }}
            >
              {activeTab === "conversations" ? (
                !Array.isArray(conversations) || conversations.length === 0 ? (
                  <div
                    style={{
                      padding: 32,
                      textAlign: "center",
                      color: "#6b7280",
                      fontSize: 13,
                    }}
                  >
                    <p style={{ marginBottom: 6 }}>No conversations yet.</p>
                    <p style={{ margin: 0 }}>
                      Start a conversation from someone&apos;s profile.
                    </p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        cursor: "pointer",
                        backgroundColor:
                          selectedConversation?.id === conv.id
                            ? "#e6ffed"
                            : "transparent",
                        border:
                          selectedConversation?.id === conv.id
                            ? "1px solid #006729"
                            : "1px solid transparent",
                        marginBottom: 8,
                        transition: "all 0.18s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (selectedConversation?.id !== conv.id) {
                          (e.currentTarget as HTMLElement).style.backgroundColor =
                            "#f3f4f6";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedConversation?.id !== conv.id) {
                          (e.currentTarget as HTMLElement).style.backgroundColor =
                            "transparent";
                        }
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 4,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 600,
                            color: "#111827",
                            fontSize: 14,
                          }}
                        >
                          {conv.other_user.display_name}
                        </div>
                        {conv.unread_count > 0 && (
                          <span
                            style={{
                              backgroundColor: "#e53e3e",
                              color: "white",
                              borderRadius: "999px",
                              padding: "1px 7px",
                              fontSize: 10,
                              fontWeight: 600,
                            }}
                          >
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      {conv.last_message && (
                        <>
                          <div
                            style={{
                              fontSize: 13,
                              color: "#4b5563",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              marginBottom: 2,
                            }}
                          >
                            {conv.last_message.content}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#9ca3af",
                            }}
                          >
                            {formatDate(conv.last_message.created_at)}
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )
              ) : (
                (() => {
                  if (!currentUser) {
                    return (
                      <div
                        style={{
                          padding: 32,
                          textAlign: "center",
                          color: "#6b7280",
                          fontSize: 13,
                        }}
                      >
                        <p>No conversation requests.</p>
                      </div>
                    );
                  }

                  const receivedRequests = Array.isArray(conversationRequests)
                    ? conversationRequests.filter(
                        (req) =>
                          req.recipient.id === currentUser.id &&
                          req.status === "pending"
                      )
                    : [];
                  const sentRequests = Array.isArray(conversationRequests)
                    ? conversationRequests.filter(
                        (req) =>
                          req.requester.id === currentUser.id &&
                          req.status !== "accepted"
                      )
                    : [];

                  if (
                    receivedRequests.length === 0 &&
                    sentRequests.length === 0
                  ) {
                    return (
                      <div
                        style={{
                          padding: 32,
                          textAlign: "center",
                          color: "#6b7280",
                          fontSize: 13,
                        }}
                      >
                        <p>No conversation requests.</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      {/* Received */}
                      {receivedRequests.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#4b5568",
                              textTransform: "uppercase",
                              marginBottom: 6,
                              padding: "0 4px",
                            }}
                          >
                            Received Requests
                          </div>
                          {receivedRequests.map((req) => (
                            <div
                              key={req.id}
                              style={{
                                padding: 12,
                                borderRadius: 10,
                                border: "1px solid #e5e7eb",
                                marginBottom: 10,
                                backgroundColor: "#ffffff",
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 600,
                                  color: "#111827",
                                  marginBottom: 6,
                                  fontSize: 14,
                                }}
                              >
                                {req.requester.display_name}
                              </div>
                              {req.message && (
                                <div
                                  style={{
                                    fontSize: 13,
                                    color: "#1f2933",
                                    marginBottom: 10,
                                    padding: 8,
                                    backgroundColor: "#f3f4f6",
                                    borderRadius: 6,
                                    whiteSpace: "pre-wrap",
                                  }}
                                >
                                  {req.message}
                                </div>
                              )}
                              <div
                                style={{
                                  fontSize: 13,
                                  color: "#6b7280",
                                  marginBottom: 10,
                                }}
                              >
                                Wants to start a conversation with you.
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 8,
                                }}
                              >
                                <button
                                  onClick={() => handleAcceptRequest(req)}
                                  style={{
                                    flex: 1,
                                    padding: "8px 10px",
                                    backgroundColor: "#006729",
                                    color: "white",
                                    border: "none",
                                    borderRadius: 8,
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    fontSize: 13,
                                  }}
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleDenyRequest(req)}
                                  style={{
                                    flex: 1,
                                    padding: "8px 10px",
                                    backgroundColor: "#e53e3e",
                                    color: "white",
                                    border: "none",
                                    borderRadius: 8,
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    fontSize: 13,
                                  }}
                                >
                                  Deny
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Sent */}
                      {sentRequests.length > 0 && (
                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#4b5568",
                              textTransform: "uppercase",
                              marginBottom: 6,
                              padding: "0 4px",
                            }}
                          >
                            Your Requests
                          </div>
                          {sentRequests.map((req) => (
                            <div
                              key={req.id}
                              style={{
                                padding: 12,
                                borderRadius: 10,
                                border: "1px solid #e5e7eb",
                                marginBottom: 10,
                                backgroundColor: "#ffffff",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: 6,
                                }}
                              >
                                <div
                                  style={{
                                    fontWeight: 600,
                                    color: "#111827",
                                    fontSize: 14,
                                  }}
                                >
                                  {req.recipient.display_name}
                                </div>
                                <span
                                  style={{
                                    padding: "3px 10px",
                                    borderRadius: 999,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    backgroundColor:
                                      req.status === "pending"
                                        ? "#fef3c7"
                                        : "#fee2e2",
                                    color:
                                      req.status === "pending"
                                        ? "#92400e"
                                        : "#991b1b",
                                  }}
                                >
                                  {req.status === "pending"
                                    ? "Pending"
                                    : "Denied"}
                                </span>
                              </div>
                              {req.message && (
                                <div
                                  style={{
                                    fontSize: 13,
                                    color: "#1f2933",
                                    marginBottom: 6,
                                    padding: 8,
                                    backgroundColor: "#f3f4f6",
                                    borderRadius: 6,
                                    whiteSpace: "pre-wrap",
                                  }}
                                >
                                  {req.message}
                                </div>
                              )}
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#9ca3af",
                                }}
                              >
                                {formatDate(req.created_at)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()
              )}
            </div>
          </div>

          {/* Chat area */}
          <div
            style={{
              flex: 1,
              backgroundColor: "#ffffff",
              borderRadius: 18,
              border: "1px solid rgba(148,163,184,0.45)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
            }}
          >
            {selectedConversation ? (
              <>
                {/* Chat header */}
                <div
                  style={{
                    padding: 14,
                    borderBottom: "1px solid #e5e7eb",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#111827",
                        fontSize: 17,
                      }}
                    >
                      {selectedConversation.other_user.display_name}
                    </div>
                    <button
                      onClick={() =>
                        navigate(
                          `/profile/${
                            selectedConversation.other_user.encrypted_id ||
                            selectedConversation.other_user.id
                          }`
                        )
                      }
                      style={{
                        marginTop: 2,
                        padding: 0,
                        border: "none",
                        backgroundColor: "transparent",
                        color: "#006729",
                        cursor: "pointer",
                        fontSize: 13,
                        textDecoration: "underline",
                      }}
                    >
                      View Profile
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    background:
                      "linear-gradient(to bottom, #f9fafb 0%, #ffffff 40%)",
                  }}
                >
                  {loadingMessages && isInitialLoad ? (
                    <div
                      style={{
                        textAlign: "center",
                        color: "#6b7280",
                        padding: 40,
                        fontSize: 14,
                      }}
                    >
                      Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        color: "#6b7280",
                        padding: 40,
                        fontSize: 14,
                      }}
                    >
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.sender.id === currentUser?.id;
                      return (
                        <div
                          key={msg.id}
                          style={{
                            display: "flex",
                            justifyContent: isOwn ? "flex-end" : "flex-start",
                          }}
                        >
                          <div
                            style={{
                              maxWidth: "70%",
                              padding: "10px 14px",
                              borderRadius: 14,
                              backgroundColor: isOwn ? "#006729" : "#e5e7eb",
                              color: isOwn ? "white" : "#111827",
                              fontSize: 14,
                            }}
                          >
                            {!isOwn && (
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  marginBottom: 3,
                                  color: isOwn
                                    ? "rgba(255,255,255,0.8)"
                                    : "#4b5563",
                                }}
                              >
                                {msg.sender.display_name}
                              </div>
                            )}
                            <div
                              style={{
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {msg.content}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                marginTop: 4,
                                color: isOwn
                                  ? "rgba(255,255,255,0.7)"
                                  : "#9ca3af",
                                textAlign: "right",
                              }}
                            >
                              {formatDate(msg.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input */}
                <div
                  style={{
                    padding: 14,
                    borderTop: "1px solid #e5e7eb",
                    display: "flex",
                    gap: 10,
                    backgroundColor: "#f9fafb",
                  }}
                >
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      border: "2px solid #e2e8f0",
                      borderRadius: 10,
                      fontSize: 14,
                      resize: "none",
                      minHeight: 48,
                      maxHeight: 140,
                      fontFamily: "inherit",
                      backgroundColor: "#ffffff",
                    }}
                    rows={2}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sendingMessage || !newMessage.trim()}
                    style={{
                      padding: "10px 20px",
                      backgroundColor:
                        sendingMessage || !newMessage.trim()
                          ? "#a0aec0"
                          : "#006729",
                      color: "white",
                      border: "none",
                      borderRadius: 999,
                      cursor:
                        sendingMessage || !newMessage.trim()
                          ? "not-allowed"
                          : "pointer",
                      fontWeight: 600,
                      fontSize: 14,
                      alignSelf: "flex-end",
                    }}
                  >
                    {sendingMessage ? "Sending..." : "Send"}
                  </button>
                </div>
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7280",
                  textAlign: "center",
                  padding: 40,
                  fontSize: 14,
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 18,
                      marginBottom: 6,
                      color: "#111827",
                      fontWeight: 600,
                    }}
                  >
                    Select a conversation to start messaging
                  </p>
                  <p style={{ margin: 0 }}>
                    Or check the Requests tab for new conversation requests.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
