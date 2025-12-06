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
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"conversations" | "requests">("conversations");

  const fetchConversations = useCallback(async () => {
    try {
      const response = await api.get("/auth/conversations/");
      setConversations(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError("Failed to load conversations");
      setConversations([]); // Reset to empty array on error
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

  const fetchMessages = useCallback(async (conversationId: number) => {
    try {
      setLoadingMessages(true);
      const response = await api.get(`/auth/conversations/${conversationId}/messages/`);
      setMessages(response.data);
      await api.post(`/auth/conversations/${conversationId}/mark-read/`);
      await fetchConversations();
    } catch (err: any) {
      setError("Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, [fetchConversations]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchConversations(), fetchConversationRequests()]);
      setLoading(false);
    };
    loadData();
  }, [fetchConversations, fetchConversationRequests]);

  // Auto-refresh conversations every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
      if (activeTab === "requests") {
        fetchConversationRequests();
      }
      if (selectedConversation) {
        fetchMessages(selectedConversation.id);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchConversations, fetchConversationRequests, selectedConversation, fetchMessages, activeTab]);

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setActiveTab("conversations");
    await fetchMessages(conversation.id);
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
        await fetchMessages(response.data.conversation.id);
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
      <main style={{ 
        padding: 16, 
        width: "100%",
        backgroundColor: "#f7fafc",
        minHeight: "100vh"
      }}>
        <div style={{ 
          maxWidth: "1200px", 
          margin: "0 auto", 
          padding: "40px 20px",
          textAlign: "center"
        }}>
          <p>Loading messages...</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ 
      padding: 16, 
      width: "100%",
      backgroundColor: "#f7fafc",
      minHeight: "100vh"
    }}>
      <div style={{ 
        maxWidth: "1200px", 
        margin: "0 auto",
        display: "flex",
        gap: 16,
        height: "calc(100vh - 100px)"
      }}>
        {error && (
          <div style={{
            position: "fixed",
            top: 80,
            left: "50%",
            transform: "translateX(-50%)",
            padding: 12,
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: 8,
            color: "#c33",
            zIndex: 1000
          }}>
            {error}
          </div>
        )}

        {/* Sidebar */}
        <div style={{
          width: "350px",
          backgroundColor: "white",
          borderRadius: 12,
          border: "1px solid #dee2e6",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}>
          {/* Tabs */}
          <div style={{
            display: "flex",
            borderBottom: "1px solid #dee2e6"
          }}>
            <button
              onClick={() => {
                setActiveTab("conversations");
                setSelectedConversation(null);
              }}
              style={{
                flex: 1,
                padding: "16px",
                border: "none",
                backgroundColor: activeTab === "conversations" ? "#f7fafc" : "white",
                cursor: "pointer",
                fontWeight: activeTab === "conversations" ? "600" : "400",
                color: activeTab === "conversations" ? "#006729" : "#4a5568",
                borderBottom: activeTab === "conversations" ? "2px solid #006729" : "2px solid transparent"
              }}
            >
              Conversations
              {conversations.length > 0 && (
                <span style={{ marginLeft: 8, color: "#666", fontSize: "12px" }}>
                  ({conversations.length})
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              style={{
                flex: 1,
                padding: "16px",
                border: "none",
                backgroundColor: activeTab === "requests" ? "#f7fafc" : "white",
                cursor: "pointer",
                fontWeight: activeTab === "requests" ? "600" : "400",
                color: activeTab === "requests" ? "#006729" : "#4a5568",
                borderBottom: activeTab === "requests" ? "2px solid #006729" : "2px solid transparent",
                position: "relative"
              }}
            >
              Requests
              {(() => {
                if (!currentUser) return null;
                const pendingReceivedCount = Array.isArray(conversationRequests) ? conversationRequests.filter(
                  req => req.recipient.id === currentUser.id && req.status === 'pending'
                ).length : 0;
                return pendingReceivedCount > 0 ? (
                  <span style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    backgroundColor: "#e53e3e",
                    color: "white",
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    fontWeight: "600"
                  }}>
                    {pendingReceivedCount}
                  </span>
                ) : null;
              })()}
            </button>
          </div>

          {/* Content */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: 8
          }}>
            {activeTab === "conversations" ? (
              (!Array.isArray(conversations) || conversations.length === 0) ? (
                <div style={{
                  padding: 40,
                  textAlign: "center",
                  color: "#666"
                }}>
                  <p>No conversations yet.</p>
                  <p style={{ fontSize: "14px", marginTop: 8 }}>
                    Start a conversation from someone's profile!
                  </p>
                </div>
              ) : (
                (Array.isArray(conversations) ? conversations : []).map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      cursor: "pointer",
                      backgroundColor: selectedConversation?.id === conv.id ? "#e6ffed" : "transparent",
                      border: selectedConversation?.id === conv.id ? "1px solid #006729" : "1px solid transparent",
                      marginBottom: 8,
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      if (selectedConversation?.id !== conv.id) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "#f7fafc";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedConversation?.id !== conv.id) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 4
                    }}>
                      <div style={{ fontWeight: "600", color: "#1a202c" }}>
                        {conv.other_user.display_name}
                      </div>
                      {conv.unread_count > 0 && (
                        <span style={{
                          backgroundColor: "#e53e3e",
                          color: "white",
                          borderRadius: "50%",
                          width: 20,
                          height: 20,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                          fontWeight: "600"
                        }}>
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    {conv.last_message && (
                      <>
                        <div style={{
                          fontSize: "14px",
                          color: "#4a5568",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginBottom: 4
                        }}>
                          {conv.last_message.content}
                        </div>
                        <div style={{
                          fontSize: "12px",
                          color: "#999"
                        }}>
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
                    <div style={{
                      padding: 40,
                      textAlign: "center",
                      color: "#666"
                    }}>
                      <p>No conversation requests.</p>
                    </div>
                  );
                }
                
                const receivedRequests = Array.isArray(conversationRequests) ? conversationRequests.filter(
                  req => req.recipient.id === currentUser.id && req.status === 'pending'
                ) : [];
                const sentRequests = Array.isArray(conversationRequests) ? conversationRequests.filter(
                  req => req.requester.id === currentUser.id && req.status !== 'accepted'
                ) : [];

                if (receivedRequests.length === 0 && sentRequests.length === 0) {
                  return (
                    <div style={{
                      padding: 40,
                      textAlign: "center",
                      color: "#666"
                    }}>
                      <p>No conversation requests.</p>
                    </div>
                  );
                }

                return (
                  <>
                    {/* Received Requests (pending) */}
                    {receivedRequests.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#4a5568",
                          textTransform: "uppercase",
                          marginBottom: 8,
                          padding: "0 8px"
                        }}>
                          Received Requests
                        </div>
                        {receivedRequests.map((req) => (
                          <div
                            key={req.id}
                            style={{
                              padding: 16,
                              borderRadius: 8,
                              border: "1px solid #dee2e6",
                              marginBottom: 12,
                              backgroundColor: "white"
                            }}
                          >
                            <div style={{
                              fontWeight: "600",
                              color: "#1a202c",
                              marginBottom: 8
                            }}>
                              {req.requester.display_name}
                            </div>
                            {req.message && (
                              <div style={{
                                fontSize: "14px",
                                color: "#2d3748",
                                marginBottom: 12,
                                padding: 12,
                                backgroundColor: "#f7fafc",
                                borderRadius: 6,
                                whiteSpace: "pre-wrap"
                              }}>
                                {req.message}
                              </div>
                            )}
                            <div style={{
                              fontSize: "14px",
                              color: "#666",
                              marginBottom: 12
                            }}>
                              Wants to start a conversation with you
                            </div>
                            <div style={{
                              display: "flex",
                              gap: 8
                            }}>
                              <button
                                onClick={() => handleAcceptRequest(req)}
                                style={{
                                  flex: 1,
                                  padding: "8px 16px",
                                  backgroundColor: "#006729",
                                  color: "white",
                                  border: "none",
                                  borderRadius: 6,
                                  cursor: "pointer",
                                  fontWeight: "600",
                                  fontSize: "14px"
                                }}
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleDenyRequest(req)}
                                style={{
                                  flex: 1,
                                  padding: "8px 16px",
                                  backgroundColor: "#e53e3e",
                                  color: "white",
                                  border: "none",
                                  borderRadius: 6,
                                  cursor: "pointer",
                                  fontWeight: "600",
                                  fontSize: "14px"
                                }}
                              >
                                Deny
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Sent Requests (show status) */}
                    {sentRequests.length > 0 && (
                      <div>
                        <div style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#4a5568",
                          textTransform: "uppercase",
                          marginBottom: 8,
                          padding: "0 8px"
                        }}>
                          Your Requests
                        </div>
                        {sentRequests.map((req) => (
                          <div
                            key={req.id}
                            style={{
                              padding: 16,
                              borderRadius: 8,
                              border: "1px solid #dee2e6",
                              marginBottom: 12,
                              backgroundColor: "white"
                            }}
                          >
                            <div style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 8
                            }}>
                              <div style={{
                                fontWeight: "600",
                                color: "#1a202c"
                              }}>
                                {req.recipient.display_name}
                              </div>
                              <span style={{
                                padding: "4px 12px",
                                borderRadius: 12,
                                fontSize: "12px",
                                fontWeight: "600",
                                backgroundColor: req.status === 'pending' ? "#fef3c7" : "#fee2e2",
                                color: req.status === 'pending' ? "#92400e" : "#991b1b"
                              }}>
                                {req.status === 'pending' ? 'Pending' : 'Denied'}
                              </span>
                            </div>
                            {req.message && (
                              <div style={{
                                fontSize: "14px",
                                color: "#2d3748",
                                marginBottom: 8,
                                padding: 12,
                                backgroundColor: "#f7fafc",
                                borderRadius: 6,
                                whiteSpace: "pre-wrap"
                              }}>
                                {req.message}
                              </div>
                            )}
                            <div style={{
                              fontSize: "12px",
                              color: "#999"
                            }}>
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

        {/* Main chat area */}
        <div style={{
          flex: 1,
          backgroundColor: "white",
          borderRadius: 12,
          border: "1px solid #dee2e6",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}>
          {selectedConversation ? (
            <>
              {/* Chat header */}
              <div style={{
                padding: 16,
                borderBottom: "1px solid #dee2e6",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <div style={{
                    fontWeight: "600",
                    color: "#1a202c",
                    fontSize: "18px"
                  }}>
                    {selectedConversation.other_user.display_name}
                  </div>
                  <button
                    onClick={() => navigate(`/profile/${selectedConversation.other_user.encrypted_id || selectedConversation.other_user.id}`)}
                    style={{
                      marginTop: 4,
                      padding: 0,
                      border: "none",
                      backgroundColor: "transparent",
                      color: "#006729",
                      cursor: "pointer",
                      fontSize: "14px",
                      textDecoration: "underline"
                    }}
                  >
                    View Profile
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: "auto",
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12
              }}>
                {loadingMessages ? (
                  <div style={{
                    textAlign: "center",
                    color: "#666",
                    padding: 40
                  }}>
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{
                    textAlign: "center",
                    color: "#666",
                    padding: 40
                  }}>
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
                          justifyContent: isOwn ? "flex-end" : "flex-start"
                        }}
                      >
                        <div style={{
                          maxWidth: "70%",
                          padding: "12px 16px",
                          borderRadius: 12,
                          backgroundColor: isOwn ? "#006729" : "#e2e8f0",
                          color: isOwn ? "white" : "#1a202c"
                        }}>
                          {!isOwn && (
                            <div style={{
                              fontSize: "12px",
                              fontWeight: "600",
                              marginBottom: 4,
                              color: isOwn ? "rgba(255,255,255,0.8)" : "#4a5568"
                            }}>
                              {msg.sender.display_name}
                            </div>
                          )}
                          <div style={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word"
                          }}>
                            {msg.content}
                          </div>
                          <div style={{
                            fontSize: "11px",
                            marginTop: 4,
                            color: isOwn ? "rgba(255,255,255,0.7)" : "#999",
                            textAlign: "right"
                          }}>
                            {formatDate(msg.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message input */}
              <div style={{
                padding: 16,
                borderTop: "1px solid #dee2e6",
                display: "flex",
                gap: 12
              }}>
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
                    padding: "12px 16px",
                    border: "2px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: 14,
                    resize: "none",
                    minHeight: 50,
                    maxHeight: 150,
                    fontFamily: "inherit",
                    backgroundColor: "#f7fafc"
                  }}
                  rows={2}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  style={{
                    padding: "12px 24px",
                    backgroundColor: sendingMessage || !newMessage.trim() ? "#a0aec0" : "#006729",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: sendingMessage || !newMessage.trim() ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                    alignSelf: "flex-end"
                  }}
                >
                  {sendingMessage ? "Sending..." : "Send"}
                </button>
              </div>
            </>
          ) : (
            <div style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#666",
              textAlign: "center",
              padding: 40
            }}>
              <div>
                <p style={{ fontSize: "18px", marginBottom: 8 }}>
                  Select a conversation to start messaging
                </p>
                <p style={{ fontSize: "14px" }}>
                  Or check the Requests tab for new conversation requests
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

