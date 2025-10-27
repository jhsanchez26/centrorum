import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

type Listing = { 
  id: number; 
  title: string; 
  description: string; 
  org_name: string; 
  org: number; // Organization ID
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

export default function Listings() {
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newPost, setNewPost] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [postType, setPostType] = useState("post");
  const [postModality, setPostModality] = useState("in-person");
  const [submitting, setSubmitting] = useState(false);
  const [editingPost, setEditingPost] = useState<Listing | null>(null);
  const { user } = useAuth();

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [modalityFilter, setModalityFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => { 
    fetchListings();
  }, []);

  // Refetch listings when filters change
  useEffect(() => {
    if (!loading) {
      fetchListings();
    }
  }, [searchQuery, typeFilter, modalityFilter, sortBy, sortOrder]);

  const fetchListings = async () => {
    try {
      const params = new URLSearchParams();
      
      if (searchQuery) params.append('search', searchQuery);
      if (typeFilter) params.append('type', typeFilter);
      if (modalityFilter) params.append('modality', modalityFilter);
      if (sortBy) params.append('ordering', sortOrder === 'desc' ? `-${sortBy}` : sortBy);
      
      const response = await api.get(`/listings/?${params.toString()}`);
      setAllListings(response.data);
    } catch (err: any) {
      setError("Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !postTitle.trim()) return;

    setSubmitting(true);
    try {
      if (editingPost) {
        // Update existing post
        const response = await api.put(`/listings/${editingPost.id}/`, {
          title: postTitle,
          description: newPost,
          type: postType,
          modality: postModality,
          org: editingPost.org
        });
        setAllListings(allListings.map(listing => 
          listing.id === editingPost.id ? response.data : listing
        ));
        setEditingPost(null);
      } else {
        // Create new post
        const response = await api.post("/posts/", { 
          title: postTitle,
          content: newPost,
          type: postType,
          modality: postModality
        });
        setAllListings([response.data, ...allListings]);
      }
      
      setNewPost("");
      setPostTitle("");
      setPostType("post");
      setPostModality("in-person");
    } catch (err: any) {
      setError(editingPost ? "Failed to update post" : "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPost = (post: Listing) => {
    setEditingPost(post);
    setPostTitle(post.title);
    setPostType(post.type);
    setPostModality(post.modality);
    setNewPost(post.description);
  };

  const handleDeletePost = async (postId: number) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    
    try {
      await api.delete(`/listings/${postId}/`);
      setAllListings(allListings.filter(listing => listing.id !== postId));
    } catch (err: any) {
      setError("Failed to delete post");
    }
  };

  const handleCancelEdit = () => {
    setEditingPost(null);
    setNewPost("");
    setPostTitle("");
    setPostType("post");
    setPostModality("in-person");
  };

  const handleRSVP = async (listingId: number, status: string) => {
    try {
      const response = await api.post("/rsvp/", {
        listing: listingId,
        status: status
      });
      
      // Update the specific listing in our state instead of refetching all
      setAllListings(allListings.map(listing => 
        listing.id === listingId ? response.data : listing
      ));
    } catch (err: any) {
      console.error("RSVP Error:", err);
      setError("Failed to update RSVP");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <main style={{ 
      padding: 16, 
      width: "100%",
      backgroundColor: "#f7fafc",
      minHeight: "100vh"
    }}>
      <div style={{
        maxWidth: 1000,
        margin: "0 auto"
      }}>
        <h1 style={{ 
          color: "#1a202c",
          fontSize: "32px",
          fontWeight: "700",
          marginBottom: "8px"
        }}>
          Listings
        </h1>
      
      {/* Search and Filter Controls */}
      <div style={{
        backgroundColor: "#ffffff",
        padding: 24,
        borderRadius: 12,
        marginBottom: 24,
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)"
      }}>
        <div style={{ 
          display: "flex", 
          flexWrap: "wrap", 
          gap: 16, 
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          {/* Search Input */}
          <div style={{ flex: "0 1 300px", minWidth: "200px" }}>
            <input
              type="text"
              placeholder="Search listings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "2px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 16,
                backgroundColor: "#ffffff",
                color: "#2d3748",
                transition: "all 0.2s ease",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#3182ce";
                e.target.style.boxShadow = "0 0 0 3px rgba(49, 130, 206, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
              }}
            />
          </div>
          
          {/* Filters Container */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {/* Type Filter */}
            <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                padding: "10px 16px",
                border: "2px solid #e1e5e9",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: "500",
                backgroundColor: "#ffffff",
                color: "#2d3748",
                cursor: "pointer",
                minWidth: 140,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                transition: "all 0.2s ease"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#3182ce";
                e.target.style.boxShadow = "0 0 0 3px rgba(49, 130, 206, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e1e5e9";
                e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
              }}
            >
              <option value="" style={{ color: "#718096" }}>All Types</option>
              <option value="event" style={{ color: "#2d3748" }}>Event</option>
              <option value="tutor" style={{ color: "#2d3748" }}>Tutoring</option>
              <option value="job" style={{ color: "#2d3748" }}>Job</option>
              <option value="resource" style={{ color: "#2d3748" }}>Resource</option>
              <option value="post" style={{ color: "#2d3748" }}>Post</option>
            </select>
          </div>
          
          {/* Modality Filter */}
          <div>
            <select
              value={modalityFilter}
              onChange={(e) => setModalityFilter(e.target.value)}
              style={{
                padding: "10px 16px",
                border: "2px solid #e1e5e9",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: "500",
                backgroundColor: "#ffffff",
                color: "#2d3748",
                cursor: "pointer",
                minWidth: 140,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                transition: "all 0.2s ease"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#3182ce";
                e.target.style.boxShadow = "0 0 0 3px rgba(49, 130, 206, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e1e5e9";
                e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
              }}
            >
              <option value="" style={{ color: "#718096" }}>All Modalities</option>
              <option value="in-person" style={{ color: "#2d3748" }}>In-Person</option>
              <option value="online" style={{ color: "#2d3748" }}>Online</option>
              <option value="hybrid" style={{ color: "#2d3748" }}>Hybrid</option>
            </select>
          </div>
          
          {/* Sort Options */}
          <div>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              style={{
                padding: "10px 16px",
                border: "2px solid #e1e5e9",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: "500",
                backgroundColor: "#ffffff",
                color: "#2d3748",
                cursor: "pointer",
                minWidth: 140,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                transition: "all 0.2s ease"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#3182ce";
                e.target.style.boxShadow = "0 0 0 3px rgba(49, 130, 206, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e1e5e9";
                e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
              }}
            >
              <option value="created_at-desc" style={{ color: "#2d3748" }}>Newest First</option>
              <option value="created_at-asc" style={{ color: "#2d3748" }}>Oldest First</option>
              <option value="rsvp_count-desc" style={{ color: "#2d3748" }}>Most RSVPs</option>
              <option value="rsvp_count-asc" style={{ color: "#2d3748" }}>Least RSVPs</option>
              <option value="title-asc" style={{ color: "#2d3748" }}>Title A-Z</option>
              <option value="title-desc" style={{ color: "#2d3748" }}>Title Z-A</option>
            </select>
          </div>
          
          {/* Clear Filters Button */}
          <button
            onClick={() => {
              setSearchQuery("");
              setTypeFilter("");
              setModalityFilter("");
              setSortBy("created_at");
              setSortOrder("desc");
              setPostTitle("");
              setPostType("post");
              setPostModality("in-person");
              setNewPost("");
              setEditingPost(null);
            }}
            style={{
              padding: "10px 20px",
              backgroundColor: "#718096",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: "600",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = "#4a5568";
              (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
              (e.target as HTMLButtonElement).style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = "#718096";
              (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              (e.target as HTMLButtonElement).style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
            }}
          >
            Clear Filters
          </button>
          </div>
        </div>
      </div>
      
      {error && (
        <div style={{
          padding: 12,
          backgroundColor: "#fee",
          border: "1px solid #fcc",
          borderRadius: 4,
          color: "#c33",
          marginBottom: 16
        }}>
          {error}
        </div>
      )}

      {/* Create new post form */}
      <div style={{
        backgroundColor: "#ffffff",
        padding: 24,
        borderRadius: 12,
        marginBottom: 24,
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)"
      }}>
        <h3 style={{ 
          marginTop: 0, 
          marginBottom: 20,
          color: "#1a202c",
          fontSize: "22px",
          fontWeight: "700"
        }}>
          {editingPost ? `Edit "${editingPost.title}"` : "Create a new post"}
        </h3>
        <form onSubmit={handlePostSubmit}>
          {/* Title Input */}
          <div style={{ marginBottom: 20 }}>
            <input
              type="text"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              placeholder="Post title..."
              required
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "2px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 16,
                fontFamily: "inherit",
                backgroundColor: "#ffffff",
                color: "#2d3748",
                transition: "all 0.2s ease",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                boxSizing: "border-box"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#3182ce";
                e.target.style.boxShadow = "0 0 0 3px rgba(49, 130, 206, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
              }}
            />
          </div>
          
          {/* Type and Modality Dropdowns */}
          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <select
                value={postType}
                onChange={(e) => setPostType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: "500",
                  backgroundColor: "#ffffff",
                  color: "#2d3748",
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#3182ce";
                  e.target.style.boxShadow = "0 0 0 3px rgba(49, 130, 206, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                }}
              >
                <option value="post" style={{ color: "#2d3748" }}>Post</option>
                <option value="event" style={{ color: "#2d3748" }}>Event</option>
                <option value="tutor" style={{ color: "#2d3748" }}>Tutoring</option>
                <option value="job" style={{ color: "#2d3748" }}>Job</option>
                <option value="resource" style={{ color: "#2d3748" }}>Resource</option>
              </select>
            </div>
            
            <div style={{ flex: 1 }}>
              <select
                value={postModality}
                onChange={(e) => setPostModality(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: "500",
                  backgroundColor: "#ffffff",
                  color: "#2d3748",
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#3182ce";
                  e.target.style.boxShadow = "0 0 0 3px rgba(49, 130, 206, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                }}
              >
                <option value="in-person" style={{ color: "#2d3748" }}>In-Person</option>
                <option value="online" style={{ color: "#2d3748" }}>Online</option>
                <option value="hybrid" style={{ color: "#2d3748" }}>Hybrid</option>
              </select>
            </div>
          </div>
          
          {/* Content Textarea */}
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Post content..."
            required
            style={{
              width: "100%",
              minHeight: 120,
              padding: "12px 16px",
              border: "2px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 16,
              fontFamily: "inherit",
              resize: "vertical",
              backgroundColor: "#ffffff",
              color: "#2d3748",
              transition: "all 0.2s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              boxSizing: "border-box"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#3182ce";
              e.target.style.boxShadow = "0 0 0 3px rgba(49, 130, 206, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e2e8f0";
              e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
            }}
          />
          <div style={{ marginTop: 20, textAlign: "right", display: "flex", gap: 12, justifyContent: "flex-end" }}>
            {editingPost && (
              <button
                type="button"
                onClick={handleCancelEdit}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#718096",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: "600",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = "#4a5568";
                  (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
                  (e.target as HTMLButtonElement).style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = "#718096";
                  (e.target as HTMLButtonElement).style.transform = "translateY(0)";
                  (e.target as HTMLButtonElement).style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || !newPost.trim() || !postTitle.trim()}
              style={{
                padding: "12px 24px",
                backgroundColor: submitting ? "#a0aec0" : "#3182ce",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: submitting ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: "600",
                boxShadow: submitting ? "0 1px 2px rgba(0,0,0,0.1)" : "0 2px 4px rgba(0,0,0,0.1)",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                if (!submitting && newPost.trim() && postTitle.trim()) {
                  (e.target as HTMLButtonElement).style.backgroundColor = "#2c5282";
                  (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
                  (e.target as HTMLButtonElement).style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                }
              }}
              onMouseLeave={(e) => {
                if (!submitting && newPost.trim() && postTitle.trim()) {
                  (e.target as HTMLButtonElement).style.backgroundColor = "#3182ce";
                  (e.target as HTMLButtonElement).style.transform = "translateY(0)";
                  (e.target as HTMLButtonElement).style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                }
              }}
            >
              {submitting ? (editingPost ? "Updating..." : "Posting...") : (editingPost ? "Update" : "Post")}
            </button>
          </div>
        </form>
      </div>

      {/* All listings (including posts) */}
      <div>
        {loading ? (
          <p>Loading listings...</p>
        ) : allListings.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#666" }}>
            <p>No listings yet. Be the first to share something!</p>
          </div>
        ) : (
          allListings.map((listing) => (
            <div
              key={listing.id}
              style={{
                backgroundColor: "white",
                padding: 20,
                borderRadius: 8,
                marginBottom: 16,
                border: "1px solid #dee2e6",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                width: "100%",
                boxSizing: "border-box"
              }}
            >
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 12
              }}>
                <div>
                  <strong style={{ color: "#1a202c", fontSize: "16px", fontWeight: "600" }}>{listing.created_by.display_name}</strong>
                  <div style={{ color: "#666", fontSize: "14px" }}>
                    {formatDate(listing.created_at)}
                  </div>
                </div>
                {user?.id === listing.created_by.id && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      backgroundColor: "#e3f2fd",
                      color: "#1976d2",
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: "12px"
                    }}>
                      Your {listing.type === 'post' ? 'post' : 'listing'}
                    </span>
                    <button
                      onClick={() => handleEditPost(listing)}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePost(listing.id)}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              
              {listing.type === 'post' ? (
                <div style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                  color: "#333",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                  maxWidth: "100%"
                }}>
                  {listing.description}
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <strong style={{ 
                      fontSize: "18px", 
                      color: "#1a202c", 
                      fontWeight: "600",
                      wordWrap: "break-word",
                      overflowWrap: "break-word",
                      maxWidth: "100%",
                      display: "block"
                    }}>
                      {listing.title}
                    </strong>
                    <div style={{ color: "#666", fontSize: "14px", marginTop: 4 }}>
                      {listing.org_name} • {listing.type} • {listing.modality} • RSVPs: {listing.rsvp_count}
                    </div>
                  </div>
                  <div style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.5,
                    color: "#333",
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                    maxWidth: "100%"
                  }}>
                    {listing.description}
                  </div>
                </div>
              )}
              
              {/* RSVP Section */}
              <div style={{ 
                marginTop: 16, 
                paddingTop: 16, 
                borderTop: "1px solid #eee",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                {/* RSVP Counts */}
                <div style={{ display: "flex", gap: 16, fontSize: "14px", color: "#666" }}>
                  <span>Going: {listing.going_count}</span>
                  <span>Interested: {listing.interested_count}</span>
                  <span>Not Going: {listing.not_going_count}</span>
                </div>
                
                {/* RSVP Buttons */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleRSVP(listing.id, "going")}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: listing.user_rsvp_status === "going" ? "#28a745" : "#f8f9fa",
                      color: listing.user_rsvp_status === "going" ? "white" : "#28a745",
                      border: "1px solid #28a745",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: listing.user_rsvp_status === "going" ? "bold" : "normal"
                    }}
                  >
                    Going
                  </button>
                  <button
                    onClick={() => handleRSVP(listing.id, "interested")}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: listing.user_rsvp_status === "interested" ? "#ffc107" : "#f8f9fa",
                      color: listing.user_rsvp_status === "interested" ? "white" : "#ffc107",
                      border: "1px solid #ffc107",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: listing.user_rsvp_status === "interested" ? "bold" : "normal"
                    }}
                  >
                    Interested
                  </button>
                  <button
                    onClick={() => handleRSVP(listing.id, "not_going")}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: listing.user_rsvp_status === "not_going" ? "#dc3545" : "#f8f9fa",
                      color: listing.user_rsvp_status === "not_going" ? "white" : "#dc3545",
                      border: "1px solid #dc3545",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: listing.user_rsvp_status === "not_going" ? "bold" : "normal"
                    }}
                  >
                    Not Going
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </main>
  );
}
