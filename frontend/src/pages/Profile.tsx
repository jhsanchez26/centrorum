import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

type Listing = { 
  id: number; 
  title: string; 
  description: string; 
  org_name: string; 
  org: number;
  type: string; 
  modality: string; 
  rsvp_count: number;
  going_count: number;
  interested_count: number;
  not_going_count: number;
  user_rsvp_status: string | null;
  created_by: {
    id: number;
    display_name: string;
  };
  created_at: string;
};

type UserProfile = {
  id: number;
  encrypted_id?: string;
  display_name: string;
  email: string;
  bio: string;
  date_joined: string;
};

type ProfileData = {
  user: UserProfile;
  posts: Listing[];
};

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser, refreshUser, loading: authLoading } = useAuth();

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editingPost, setEditingPost] = useState<Listing | null>(null);

  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editPostTitle, setEditPostTitle] = useState("");
  const [editPostDescription, setEditPostDescription] = useState("");
  const [editPostType, setEditPostType] = useState("post");
  const [editPostModality, setEditPostModality] = useState("in-person");
  const [submitting, setSubmitting] = useState(false);

  const [creatingRequest, setCreatingRequest] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");

  const fetchProfileForUser = useCallback(async (targetUserId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/auth/users/${targetUserId}/`);
      setProfileData(response.data);
      setEditDisplayName(response.data.user.display_name);
      setEditBio(response.data.user.bio || "");
      setError("");
    } catch (err: any) {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    await fetchProfileForUser(userId);
  }, [userId, fetchProfileForUser]);

  useEffect(() => {
    if (authLoading) return;

    if (userId === "me") {
      if (currentUser) {
        const targetId = currentUser.encrypted_id || currentUser.id.toString();
        fetchProfileForUser(targetId);
      } else {
        setError("You must be logged in to view your profile");
        setLoading(false);
        setProfileData(null);
      }
      return;
    }

    if (userId) {
      fetchProfile();
    }
  }, [userId, currentUser, authLoading, fetchProfileForUser, fetchProfile]);

  const handleSaveProfile = async () => {
    try {
      setSubmitting(true);
      const response = await api.patch("/auth/profile/", {
        display_name: editDisplayName,
        bio: editBio,
      });

      if (profileData) {
        setProfileData({
          ...profileData,
          user: { ...profileData.user, ...response.data },
        });
      }

      if (currentUser && profileData && currentUser.id === profileData.user.id) {
        await refreshUser();
      }

      setIsEditingProfile(false);
      setError("");
    } catch (err: any) {
      setError("Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPost = (post: Listing) => {
    setEditingPost(post);
    setEditPostTitle(post.title);
    setEditPostDescription(post.description);
    setEditPostType(post.type);
    setEditPostModality(post.modality);
  };

  const handleSavePost = async () => {
    if (!editingPost) return;

    try {
      setSubmitting(true);
      const response = await api.put(`/listings/${editingPost.id}/`, {
        title: editPostTitle,
        description: editPostDescription,
        type: editPostType,
        modality: editPostModality,
        org: editingPost.org,
      });

      if (profileData) {
        setProfileData({
          ...profileData,
          posts: profileData.posts.map((p) =>
            p.id === editingPost.id ? response.data : p
          ),
        });
      }

      setEditingPost(null);
      setEditPostTitle("");
      setEditPostDescription("");
      setEditPostType("post");
      setEditPostModality("in-person");
      setError("");
    } catch (err: any) {
      setError("Failed to update post");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      await api.delete(`/listings/${postId}/`);
      if (profileData) {
        setProfileData({
          ...profileData,
          posts: profileData.posts.filter((p) => p.id !== postId),
        });
      }
    } catch (err: any) {
      setError("Failed to delete post");
    }
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    if (profileData) {
      setEditDisplayName(profileData.user.display_name);
      setEditBio(profileData.user.bio || "");
    }
  };

  const handleCancelPostEdit = () => {
    setEditingPost(null);
    setEditPostTitle("");
    setEditPostDescription("");
    setEditPostType("post");
    setEditPostModality("in-person");
  };

  const handleStartConversation = async () => {
    if (!profileData || !currentUser) return;

    try {
      const conversationsResponse = await api.get("/auth/conversations/");
      const conversations = conversationsResponse.data;

      const targetUserId = profileData.user.id;
      const existingConversation = conversations.find((conv: any) =>
        (conv.user1.id === targetUserId && conv.user2.id === currentUser.id) ||
        (conv.user2.id === targetUserId && conv.user1.id === currentUser.id)
      );

      if (existingConversation) {
        navigate("/messaging");
        return;
      }

      const requestsResponse = await api.get("/auth/conversation-requests/");
      const requests = requestsResponse.data;
      const existingRequest = requests.find((req: any) =>
        (req.requester.id === currentUser.id &&
          req.recipient.id === targetUserId) ||
        (req.recipient.id === currentUser.id &&
          req.requester.id === targetUserId)
      );

      if (existingRequest && existingRequest.status === "pending") {
        if (existingRequest.requester.id === currentUser.id) {
          setError("You already have a pending request with this user");
        } else {
          setError("This user already sent you a request. Check your Messages.");
        }
        setTimeout(() => setError(""), 5000);
        return;
      }

      setShowMessageDialog(true);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || "Failed to check conversations";
      setError(errorMessage);
      setTimeout(() => setError(""), 5000);
    }
  };

  const handleSendConversationRequest = async () => {
    if (!profileData) return;

    try {
      setCreatingRequest(true);
      const uId =
        profileData.user.encrypted_id || profileData.user.id.toString();
      await api.post("/auth/conversation-requests/create/", {
        recipient_id: uId,
        message: requestMessage.trim(),
      });

      setShowMessageDialog(false);
      setRequestMessage("");
      alert("Conversation request sent! You can view it in your Messages.");
      navigate("/messaging");
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || "Failed to send conversation request";
      setError(errorMessage);
      setTimeout(() => setError(""), 5000);
    } finally {
      setCreatingRequest(false);
    }
  };

  const isOwnProfile =
    currentUser && profileData && currentUser.id === profileData.user.id;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ---------- LOADING / ERROR STATES WITH CARD LAYOUT ----------

  if (authLoading || loading) {
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
            maxWidth: 720,
            width: "100%",
            backgroundColor: "#fcfcf9",
            borderRadius: 28,
            boxShadow: "0 18px 40px rgba(0,0,0,0.10)",
            border: "1px solid rgba(0,0,0,0.03)",
            padding: "32px 40px",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, color: "#4b5563", fontSize: 15 }}>
            Loading profile...
          </p>
        </div>
      </main>
    );
  }

  if (error || !profileData) {
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
            maxWidth: 720,
            width: "100%",
            backgroundColor: "#fcfcf9",
            borderRadius: 28,
            boxShadow: "0 18px 40px rgba(0,0,0,0.10)",
            border: "1px solid rgba(0,0,0,0.03)",
            padding: "32px 40px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              margin: "0 0 8px 0",
              fontSize: 24,
              fontWeight: 800,
              color: "var(--text-dark)",
            }}
          >
            Profile
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: "#b91c1c",
            }}
          >
            {error || "Profile not found"}
          </p>
        </div>
      </main>
    );
  }

  const { user, posts } = profileData;

  // ---------- MAIN PROFILE UI ----------

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
      {/* Card principal tipo CentroRUM */}
      <div
        style={{
          maxWidth: 980,
          width: "100%",
          backgroundColor: "#fcfcf9",
          borderRadius: 28,
          boxShadow: "0 18px 40px rgba(0,0,0,0.10)",
          border: "1px solid rgba(0,0,0,0.03)",
          padding: "32px 36px 34px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Banner de error pequeño dentro del card */}
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

        {/* Modal para conversation request */}
        {showMessageDialog && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => {
              if (!creatingRequest) {
                setShowMessageDialog(false);
                setRequestMessage("");
              }
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: 18,
                padding: 24,
                maxWidth: 520,
                width: "90%",
                maxHeight: "80vh",
                overflowY: "auto",
                boxShadow: "0 18px 40px rgba(0,0,0,0.25)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                style={{
                  margin: "0 0 10px 0",
                  color: "#1a202c",
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                Send Conversation Request
              </h2>
              <p
                style={{
                  margin: "0 0 16px 0",
                  color: "#4b5563",
                  fontSize: 14,
                }}
              >
                Add an optional message to let {user.display_name} know why
                you&apos;d like to connect:
              </p>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Optional message..."
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e2e8f0",
                  borderRadius: 10,
                  fontSize: 14,
                  resize: "vertical",
                  minHeight: 110,
                  maxHeight: 220,
                  fontFamily: "inherit",
                  backgroundColor: "#f9fafb",
                  color: "#111827",
                  boxSizing: "border-box",
                }}
                rows={4}
              />
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 18,
                  justifyContent: "flex-end",
                }}
              >
                <button
                  onClick={() => {
                    setShowMessageDialog(false);
                    setRequestMessage("");
                  }}
                  disabled={creatingRequest}
                  style={{
                    padding: "9px 18px",
                    backgroundColor: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: 999,
                    cursor: creatingRequest ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendConversationRequest}
                  disabled={creatingRequest}
                  style={{
                    padding: "9px 18px",
                    backgroundColor: creatingRequest ? "#a0aec0" : "#006729",
                    color: "white",
                    border: "none",
                    borderRadius: 999,
                    cursor: creatingRequest ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  {creatingRequest ? "Sending..." : "Send Request"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Encabezado de perfil */}
        <section
          style={{
            backgroundColor: "var(--card-bg)",
            borderRadius: 22,
            padding: 22,
            boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
            border: "1px solid rgba(148,163,184,0.35)",
          }}
        >
          {isEditingProfile ? (
            <div>
              <div style={{ marginBottom: 16 }}>
                <label
                  htmlFor="edit-display-name"
                  style={{
                    display: "block",
                    marginBottom: 6,
                    fontWeight: 600,
                    color: "#111827",
                    fontSize: 14,
                  }}
                >
                  Display Name
                </label>
                <input
                  id="edit-display-name"
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "2px solid #e2e8f0",
                    borderRadius: 10,
                    fontSize: 15,
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label
                  htmlFor="edit-bio"
                  style={{
                    display: "block",
                    marginBottom: 6,
                    fontWeight: 600,
                    color: "#111827",
                    fontSize: 14,
                  }}
                >
                  Bio
                </label>
                <textarea
                  id="edit-bio"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={4}
                  maxLength={500}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "2px solid #e2e8f0",
                    borderRadius: 10,
                    fontSize: 15,
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
                <div
                  style={{
                    fontSize: 11,
                    color: "#6b7280",
                    marginTop: 2,
                    textAlign: "right",
                  }}
                >
                  {editBio.length}/500
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleSaveProfile}
                  disabled={submitting || !editDisplayName.trim()}
                  style={{
                    padding: "9px 20px",
                    backgroundColor: submitting ? "#a0aec0" : "#006729",
                    color: "white",
                    border: "none",
                    borderRadius: 999,
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  {submitting ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={submitting}
                  style={{
                    padding: "9px 20px",
                    backgroundColor: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: 999,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                }}
              >
                <div style={{ flex: 1 }}>
                  <h1
                    style={{
                      margin: "0 0 6px 0",
                      color: "var(--text-dark)",
                      fontSize: 28,
                      fontWeight: 900,
                    }}
                  >
                    {user.display_name}
                  </h1>
                  <p
                    style={{
                      color: "#6b7280",
                      fontSize: 13,
                      margin: 0,
                    }}
                  >
                    Joined {formatDate(user.date_joined)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {!isOwnProfile && (
                    <button
                      onClick={handleStartConversation}
                      disabled={creatingRequest}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: creatingRequest ? "#a0aec0" : "#006729",
                        color: "white",
                        border: "none",
                        borderRadius: 999,
                        cursor: creatingRequest ? "not-allowed" : "pointer",
                        fontWeight: 600,
                        fontSize: 14,
                      }}
                    >
                      {creatingRequest ? "Sending..." : "Message"}
                    </button>
                  )}
                  {isOwnProfile && (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#006729",
                        color: "white",
                        border: "none",
                        borderRadius: 999,
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: 14,
                      }}
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>
              {user.bio ? (
                <p
                  style={{
                    color: "#1f2937",
                    fontSize: 15,
                    lineHeight: 1.6,
                    margin: "14px 0 0 0",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {user.bio}
                </p>
              ) : (
                <p
                  style={{
                    color: "#9ca3af",
                    fontSize: 15,
                    fontStyle: "italic",
                    margin: "14px 0 0 0",
                  }}
                >
                  {isOwnProfile
                    ? "No bio yet. Click “Edit Profile” to add one."
                    : "No bio yet."}
                </p>
              )}
            </>
          )}
        </section>

        {/* Posts / Listings del usuario */}
        <section>
          <h2
            style={{
              margin: "0 0 14px 0",
              color: "var(--text-dark)",
              fontSize: 20,
              fontWeight: 800,
            }}
          >
            Posts ({posts.length})
          </h2>

          {posts.length === 0 ? (
            <div
              style={{
                backgroundColor: "var(--card-bg)",
                padding: 28,
                borderRadius: 20,
                textAlign: "center",
                border: "1px solid rgba(148,163,184,0.35)",
                color: "#6b7280",
                fontSize: 14,
                boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
              }}
            >
              {isOwnProfile
                ? "You haven't posted anything yet."
                : "This user hasn't posted anything yet."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {posts.map((post) => (
                <div
                  key={post.id}
                  style={{
                    backgroundColor: "#ffffff",
                    padding: 18,
                    borderRadius: 16,
                    border: "1px solid rgba(226,232,240,1)",
                    boxShadow: "0 4px 10px rgba(15,23,42,0.06)",
                  }}
                >
                  {editingPost && editingPost.id === post.id ? (
                    <div>
                      <div style={{ marginBottom: 12 }}>
                        <label
                          htmlFor={`edit-post-title-${post.id}`}
                          style={{
                            display: "block",
                            marginBottom: 6,
                            fontWeight: 600,
                            color: "#111827",
                            fontSize: 14,
                          }}
                        >
                          Title
                        </label>
                        <input
                          id={`edit-post-title-${post.id}`}
                          type="text"
                          value={editPostTitle}
                          onChange={(e) => setEditPostTitle(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "10px 14px",
                            border: "2px solid #e2e8f0",
                            borderRadius: 10,
                            fontSize: 15,
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          marginBottom: 12,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <label
                            htmlFor={`edit-post-type-${post.id}`}
                            style={{
                              display: "block",
                              marginBottom: 6,
                              fontWeight: 600,
                              color: "#111827",
                              fontSize: 14,
                            }}
                          >
                            Type
                          </label>
                          <select
                            id={`edit-post-type-${post.id}`}
                            value={editPostType}
                            onChange={(e) => setEditPostType(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              border: "2px solid #e2e8f0",
                              borderRadius: 10,
                              fontSize: 15,
                              boxSizing: "border-box",
                            }}
                          >
                            <option value="post">Post</option>
                            <option value="event">Event</option>
                            <option value="tutor">Tutoring</option>
                            <option value="job">Job</option>
                            <option value="resource">Resource</option>
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label
                            htmlFor={`edit-post-modality-${post.id}`}
                            style={{
                              display: "block",
                              marginBottom: 6,
                              fontWeight: 600,
                              color: "#111827",
                              fontSize: 14,
                            }}
                          >
                            Modality
                          </label>
                          <select
                            id={`edit-post-modality-${post.id}`}
                            value={editPostModality}
                            onChange={(e) =>
                              setEditPostModality(e.target.value)
                            }
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              border: "2px solid #e2e8f0",
                              borderRadius: 10,
                              fontSize: 15,
                              boxSizing: "border-box",
                            }}
                          >
                            <option value="in-person">In-Person</option>
                            <option value="online">Online</option>
                            <option value="hybrid">Hybrid</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <label
                          htmlFor={`edit-post-description-${post.id}`}
                          style={{
                            display: "block",
                            marginBottom: 6,
                            fontWeight: 600,
                            color: "#111827",
                            fontSize: 14,
                          }}
                        >
                          Description
                        </label>
                        <textarea
                          id={`edit-post-description-${post.id}`}
                          value={editPostDescription}
                          onChange={(e) =>
                            setEditPostDescription(e.target.value)
                          }
                          rows={5}
                          style={{
                            width: "100%",
                            padding: "10px 14px",
                            border: "2px solid #e2e8f0",
                            borderRadius: 10,
                            fontSize: 15,
                            resize: "vertical",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          onClick={handleSavePost}
                          disabled={
                            submitting ||
                            !editPostTitle.trim() ||
                            !editPostDescription.trim()
                          }
                          style={{
                            padding: "9px 20px",
                            backgroundColor: submitting
                              ? "#a0aec0"
                              : "#006729",
                            color: "white",
                            border: "none",
                            borderRadius: 999,
                            cursor: submitting ? "not-allowed" : "pointer",
                            fontWeight: 600,
                            fontSize: 14,
                          }}
                        >
                          {submitting ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={handleCancelPostEdit}
                          disabled={submitting}
                          style={{
                            padding: "9px 20px",
                            backgroundColor: "#6b7280",
                            color: "white",
                            border: "none",
                            borderRadius: 999,
                            cursor: "pointer",
                            fontWeight: 600,
                            fontSize: 14,
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 8,
                          gap: 12,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <h3
                            style={{
                              margin: "0 0 4px 0",
                              color: "#111827",
                              fontSize: 17,
                              fontWeight: 700,
                            }}
                          >
                            {post.title}
                          </h3>
                          <div
                            style={{
                              color: "#6b7280",
                              fontSize: 13,
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            <span>{formatDate(post.created_at)}</span>
                            {post.type && (
                              <span
                                style={{
                                  backgroundColor: "#e5e7eb",
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  fontSize: 11,
                                  textTransform: "capitalize",
                                }}
                              >
                                {post.type}
                              </span>
                            )}
                          </div>
                        </div>
                        {isOwnProfile && (
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              flexShrink: 0,
                            }}
                          >
                            <button
                              onClick={() => handleEditPost(post)}
                              style={{
                                padding: "6px 10px",
                                backgroundColor: "#22c55e",
                                color: "white",
                                border: "none",
                                borderRadius: 999,
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              style={{
                                padding: "6px 10px",
                                backgroundColor: "#ef4444",
                                color: "white",
                                border: "none",
                                borderRadius: 999,
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                      <p
                        style={{
                          color: "#1f2937",
                          fontSize: 14,
                          lineHeight: 1.6,
                          margin: "0 0 8px 0",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {post.description}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 10,
                          marginTop: 4,
                          fontSize: 13,
                          color: "#6b7280",
                        }}
                      >
                        {post.org_name && (
                          <span>Organization: {post.org_name}</span>
                        )}
                        {post.modality && (
                          <span>Modality: {post.modality}</span>
                        )}
                        {post.rsvp_count > 0 && (
                          <span>
                            {post.rsvp_count} RSVP
                            {post.rsvp_count !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
