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
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    await fetchProfileForUser(userId);
  }, [userId, fetchProfileForUser]);

  useEffect(() => {
    // Wait for auth to finish loading before processing
    if (authLoading) {
      return;
    }

    if (userId === "me") {
      if (currentUser) {
        // Fetch profile using current user's encrypted ID instead of redirecting
        const targetId = currentUser.encrypted_id || currentUser.id.toString();
        fetchProfileForUser(targetId);
      } else {
        // User is not logged in
        setError("You must be logged in to view your profile");
        setLoading(false);
      }
      return;
    }
    
    if (userId) {
      fetchProfile();
    }
  }, [userId, currentUser, navigate, authLoading, fetchProfileForUser, fetchProfile]);

  const handleSaveProfile = async () => {
    try {
      setSubmitting(true);
      const response = await api.patch("/auth/profile/", {
        display_name: editDisplayName,
        bio: editBio
      });
      
      // Update local state
      if (profileData) {
        setProfileData({
          ...profileData,
          user: { ...profileData.user, ...response.data }
        });
      }
      
      // Update current user in auth context if viewing own profile
      if (currentUser && profileData && currentUser.id === profileData.user.id) {
        await refreshUser();
      }
      
      setIsEditingProfile(false);
      setError("");
    } catch (err: any) {
      setError("Failed to update profile");
      console.error(err);
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
        org: editingPost.org
      });
      
      // Update the post in the list
      if (profileData) {
        setProfileData({
          ...profileData,
          posts: profileData.posts.map(p => p.id === editingPost.id ? response.data : p)
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
      console.error(err);
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
          posts: profileData.posts.filter(p => p.id !== postId)
        });
      }
    } catch (err: any) {
      setError("Failed to delete post");
      console.error(err);
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

  const isOwnProfile = currentUser && profileData && currentUser.id === profileData.user.id;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (authLoading || loading) {
    return (
      <main style={{ 
        padding: 16, 
        width: "100%",
        backgroundColor: "#f7fafc",
        minHeight: "100vh"
      }}>
        <div style={{ 
          maxWidth: "800px", 
          margin: "0 auto", 
          padding: "40px 20px",
          textAlign: "center"
        }}>
          <p>Loading profile...</p>
        </div>
      </main>
    );
  }

  if (error || !profileData) {
    return (
      <main style={{ 
        padding: 16, 
        width: "100%",
        backgroundColor: "#f7fafc",
        minHeight: "100vh"
      }}>
        <div style={{ 
          maxWidth: "800px", 
          margin: "0 auto", 
          padding: "40px 20px",
          textAlign: "center"
        }}>
          <p style={{ color: "#e53e3e" }}>{error || "Profile not found"}</p>
        </div>
      </main>
    );
  }

  const { user, posts } = profileData;

  return (
    <main style={{ 
      padding: 16, 
      width: "100%",
      backgroundColor: "#f7fafc",
      minHeight: "100vh"
    }}>
      <div style={{ 
        maxWidth: "800px", 
        margin: "0 auto"
      }}>
      {error && (
        <div style={{
          padding: 12,
          backgroundColor: "#fee",
          border: "1px solid #fcc",
          borderRadius: 8,
          color: "#c33",
          marginBottom: 16
        }}>
          {error}
        </div>
      )}

      {/* Profile Header */}
      <div style={{
        backgroundColor: "white",
        padding: "32px",
        borderRadius: "12px",
        marginBottom: "24px",
        border: "1px solid #dee2e6",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        {isEditingProfile ? (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                fontWeight: "600",
                color: "#2d3748"
              }}>
                Display Name
              </label>
              <input
                type="text"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 16,
                  boxSizing: "border-box"
                }}
              />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                fontWeight: "600",
                color: "#2d3748"
              }}>
                Bio
              </label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={4}
                maxLength={500}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 16,
                  resize: "vertical",
                  boxSizing: "border-box"
                }}
              />
              <div style={{ 
                fontSize: "12px", 
                color: "#666", 
                marginTop: "4px",
                textAlign: "right"
              }}>
                {editBio.length}/500
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={handleSaveProfile}
                disabled={submitting || !editDisplayName.trim()}
                style={{
                  padding: "10px 20px",
                  backgroundColor: submitting ? "#a0aec0" : "#006729",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontWeight: "600"
                }}
              >
                {submitting ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={submitting}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#718096",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: "600"
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <h1 style={{ 
                  margin: "0 0 8px 0", 
                  color: "#1a202c", 
                  fontSize: "32px",
                  fontWeight: "700"
                }}>
                  {user.display_name}
                </h1>
                <p style={{ 
                  color: "#666", 
                  fontSize: "14px",
                  margin: "0 0 16px 0"
                }}>
                  Joined {formatDate(user.date_joined)}
                </p>
              </div>
              {isOwnProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#006729",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "14px"
                  }}
                >
                  Edit Profile
                </button>
              )}
            </div>
            {user.bio ? (
              <p style={{ 
                color: "#2d3748", 
                fontSize: "16px",
                lineHeight: "1.6",
                margin: "0",
                whiteSpace: "pre-wrap"
              }}>
                {user.bio}
              </p>
            ) : (
              <p style={{ 
                color: "#999", 
                fontSize: "16px",
                fontStyle: "italic",
                margin: "0"
              }}>
                {isOwnProfile ? "No bio yet. Click 'Edit Profile' to add one." : "No bio yet."}
              </p>
            )}
          </>
        )}
      </div>

      {/* Posts Section */}
      <div>
        <h2 style={{ 
          margin: "0 0 20px 0", 
          color: "#1a202c", 
          fontSize: "24px",
          fontWeight: "600"
        }}>
          Posts ({posts.length})
        </h2>

        {posts.length === 0 ? (
          <div style={{
            backgroundColor: "white",
            padding: "40px",
            borderRadius: "8px",
            textAlign: "center",
            border: "1px solid #dee2e6",
            color: "#666"
          }}>
            <p>{isOwnProfile ? "You haven't posted anything yet." : "This user hasn't posted anything yet."}</p>
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "8px",
                marginBottom: "16px",
                border: "1px solid #dee2e6",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}
            >
              {editingPost && editingPost.id === post.id ? (
                <div>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ 
                      display: "block", 
                      marginBottom: "8px", 
                      fontWeight: "600",
                      color: "#2d3748"
                    }}>
                      Title
                    </label>
                    <input
                      type="text"
                      value={editPostTitle}
                      onChange={(e) => setEditPostTitle(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: "2px solid #e2e8f0",
                        borderRadius: 8,
                        fontSize: 16,
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ 
                        display: "block", 
                        marginBottom: "8px", 
                        fontWeight: "600",
                        color: "#2d3748"
                      }}>
                        Type
                      </label>
                      <select
                        value={editPostType}
                        onChange={(e) => setEditPostType(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          border: "2px solid #e2e8f0",
                          borderRadius: 8,
                          fontSize: 16,
                          boxSizing: "border-box"
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
                      <label style={{ 
                        display: "block", 
                        marginBottom: "8px", 
                        fontWeight: "600",
                        color: "#2d3748"
                      }}>
                        Modality
                      </label>
                      <select
                        value={editPostModality}
                        onChange={(e) => setEditPostModality(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          border: "2px solid #e2e8f0",
                          borderRadius: 8,
                          fontSize: 16,
                          boxSizing: "border-box"
                        }}
                      >
                        <option value="in-person">In-Person</option>
                        <option value="online">Online</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ 
                      display: "block", 
                      marginBottom: "8px", 
                      fontWeight: "600",
                      color: "#2d3748"
                    }}>
                      Description
                    </label>
                    <textarea
                      value={editPostDescription}
                      onChange={(e) => setEditPostDescription(e.target.value)}
                      rows={6}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: "2px solid #e2e8f0",
                        borderRadius: 8,
                        fontSize: 16,
                        resize: "vertical",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      onClick={handleSavePost}
                      disabled={submitting || !editPostTitle.trim() || !editPostDescription.trim()}
                      style={{
                        padding: "10px 20px",
                        backgroundColor: submitting ? "#a0aec0" : "#006729",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        cursor: submitting ? "not-allowed" : "pointer",
                        fontWeight: "600"
                      }}
                    >
                      {submitting ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={handleCancelPostEdit}
                      disabled={submitting}
                      style={{
                        padding: "10px 20px",
                        backgroundColor: "#718096",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontWeight: "600"
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "12px"
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ 
                        margin: "0 0 8px 0", 
                        color: "#1a202c", 
                        fontSize: "18px",
                        fontWeight: "600"
                      }}>
                        {post.title}
                      </h3>
                      <div style={{ 
                        color: "#666", 
                        fontSize: "14px",
                        display: "flex",
                        gap: "12px",
                        alignItems: "center"
                      }}>
                        <span>{formatDate(post.created_at)}</span>
                        {post.type && (
                          <span style={{
                            backgroundColor: "#e2e8f0",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            textTransform: "capitalize"
                          }}>
                            {post.type}
                          </span>
                        )}
                      </div>
                    </div>
                    {isOwnProfile && (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => handleEditPost(post)}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "600"
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "600"
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <p style={{ 
                    color: "#2d3748", 
                    fontSize: "15px",
                    lineHeight: "1.6",
                    margin: "0 0 12px 0",
                    whiteSpace: "pre-wrap"
                  }}>
                    {post.description}
                  </p>
                  {post.org_name && (
                    <div style={{ 
                      color: "#666", 
                      fontSize: "14px",
                      marginTop: "8px"
                    }}>
                      Organization: {post.org_name}
                    </div>
                  )}
                  {post.modality && (
                    <div style={{ 
                      color: "#666", 
                      fontSize: "14px"
                    }}>
                      Modality: {post.modality}
                    </div>
                  )}
                  {post.rsvp_count > 0 && (
                    <div style={{ 
                      color: "#666", 
                      fontSize: "14px",
                      marginTop: "8px"
                    }}>
                      {post.rsvp_count} RSVP{post.rsvp_count !== 1 ? 's' : ''}
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
      </div>
    </main>
  );
}



