import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
    encrypted_id?: string;
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [modalityFilter, setModalityFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchListings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, typeFilter, modalityFilter, sortBy, sortOrder]);

  const fetchListings = async () => {
    try {
      const params = new URLSearchParams();

      if (searchQuery) params.append("search", searchQuery);
      if (typeFilter) params.append("type", typeFilter);
      if (modalityFilter) params.append("modality", modalityFilter);
      if (sortBy)
        params.append(
          "ordering",
          sortOrder === "desc" ? `-${sortBy}` : sortBy
        );

      const response = await api.get(`/listings/?${params.toString()}`);
      setAllListings(response.data.results || response.data);
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
        const response = await api.put(`/listings/${editingPost.id}/`, {
          title: postTitle,
          description: newPost,
          type: postType,
          modality: postModality,
          org: editingPost.org,
        });
        setAllListings(
          allListings.map((listing) =>
            listing.id === editingPost.id ? response.data : listing
          )
        );
        setEditingPost(null);
      } else {
        const response = await api.post("/posts/", {
          title: postTitle,
          content: newPost,
          type: postType,
          modality: postModality,
        });
        setAllListings([response.data, ...allListings]);
      }

      setNewPost("");
      setPostTitle("");
      setPostType("post");
      setPostModality("in-person");
      setIsModalOpen(false);
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
    setIsModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setEditingPost(null);
    setNewPost("");
    setPostTitle("");
    setPostType("post");
    setPostModality("in-person");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPost(null);
    setNewPost("");
    setPostTitle("");
    setPostType("post");
    setPostModality("in-person");
  };

  const handleDeletePost = async (postId: number) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      await api.delete(`/listings/${postId}/`);
      setAllListings(allListings.filter((listing) => listing.id !== postId));
    } catch (err: any) {
      setError("Failed to delete post");
    }
  };

  const handleCancelEdit = () => {
    handleCloseModal();
  };

  const handleRSVP = async (listingId: number, status: string) => {
    try {
      const response = await api.post("/rsvp/", {
        listing: listingId,
        status: status,
      });

      setAllListings(
        allListings.map((listing) =>
          listing.id === listingId ? response.data : listing
        )
      );
    } catch (err: any) {
      setError("Failed to update RSVP");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <main
      style={{
        minHeight: "calc(100vh - 64px)", // space for navbar
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "48px 24px",
        backgroundColor: "var(--light-bg)",
      }}
    >
      {/* Big CentroRUM card – same shell as login/signup */}
      <div
        style={{
          maxWidth: 980,
          width: "100%",
          backgroundColor: "#fcfcf9",
          borderRadius: 28,
          boxShadow: "0 18px 40px rgba(0,0,0,0.10)",
          border: "1px solid rgba(0,0,0,0.03)",
          padding: "32px 40px 36px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        {/* Header with Create Post Button */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 6,
            gap: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              flex: 1,
            }}
          >
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
              Browse
            </p>
            <h1
              style={{
                margin: 0,
                fontSize: 32,
                fontWeight: 900,
                color: "var(--text-dark)",
              }}
            >
              Listings
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
              Explore posts, events, tutoring opportunities, jobs, and resources
              shared across the UPRM community. Use filters to quickly find what
              you&apos;re looking for or create your own post.
            </p>
          </div>
          {/* Create Post Button - Top Right */}
          <button
            onClick={handleOpenCreateModal}
            style={{
              padding: "12px 24px",
              backgroundColor: "#006729",
              color: "white",
              border: "none",
              borderRadius: 999,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              boxShadow: "0 3px 7px rgba(0,0,0,0.18)",
              transition: "all 0.18s ease",
              whiteSpace: "nowrap",
              alignSelf: "flex-start",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = "#004d20";
              (e.target as HTMLButtonElement).style.transform =
                "translateY(-1px)";
              (e.target as HTMLButtonElement).style.boxShadow =
                "0 5px 10px rgba(0,0,0,0.20)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = "#006729";
              (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              (e.target as HTMLButtonElement).style.boxShadow =
                "0 3px 7px rgba(0,0,0,0.18)";
            }}
          >
            + Create Post
          </button>
        </div>

        {/* Search + filters card */}
        <section
          style={{
            backgroundColor: "#ffffff",
            padding: 20,
            borderRadius: 18,
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 10px rgba(15,23,42,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Search Input */}
            <div style={{ flex: "0 1 300px", minWidth: "220px" }}>
              <input
                type="text"
                placeholder="Search listings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e2e8f0",
                  borderRadius: 10,
                  fontSize: 14,
                  backgroundColor: "#ffffff",
                  color: "#2d3748",
                  transition: "all 0.18s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#006729";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(0, 103, 41, 0.12)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.boxShadow =
                    "0 1px 3px rgba(0,0,0,0.06)";
                }}
              />
            </div>

            {/* Right-side filters */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {/* Type Filter */}
              <div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{
                    padding: "10px 16px",
                    border: "2px solid #e1e5e9",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 500,
                    backgroundColor: "#ffffff",
                    color: "#2d3748",
                    cursor: "pointer",
                    minWidth: 140,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    transition: "all 0.18s ease",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#006729";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(0, 103, 41, 0.12)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e1e5e9";
                    e.target.style.boxShadow =
                      "0 1px 3px rgba(0,0,0,0.06)";
                  }}
                >
                  <option value="">All Types</option>
                  <option value="event">Event</option>
                  <option value="tutor">Tutoring</option>
                  <option value="job">Job</option>
                  <option value="resource">Resource</option>
                  <option value="post">Post</option>
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
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 500,
                    backgroundColor: "#ffffff",
                    color: "#2d3748",
                    cursor: "pointer",
                    minWidth: 140,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    transition: "all 0.18s ease",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#006729";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(0, 103, 41, 0.12)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e1e5e9";
                    e.target.style.boxShadow =
                      "0 1px 3px rgba(0,0,0,0.06)";
                  }}
                >
                  <option value="">All Modalities</option>
                  <option value="in-person">In-Person</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              {/* Sort Options */}
              <div>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split("-");
                    setSortBy(field);
                    setSortOrder(order);
                  }}
                  style={{
                    padding: "10px 16px",
                    border: "2px solid #e1e5e9",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 500,
                    backgroundColor: "#ffffff",
                    color: "#2d3748",
                    cursor: "pointer",
                    minWidth: 160,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    transition: "all 0.18s ease",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#006729";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(0, 103, 41, 0.12)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e1e5e9";
                    e.target.style.boxShadow =
                      "0 1px 3px rgba(0,0,0,0.06)";
                  }}
                >
                  <option value="created_at-desc">Newest First</option>
                  <option value="created_at-asc">Oldest First</option>
                  <option value="rsvp_count-desc">Most RSVPs</option>
                  <option value="rsvp_count-asc">Least RSVPs</option>
                  <option value="title-asc">Title A-Z</option>
                  <option value="title-desc">Title Z-A</option>
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
                  padding: "10px 18px",
                  backgroundColor: "#718096",
                  color: "white",
                  border: "none",
                  borderRadius: 999,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.10)",
                  transition: "all 0.18s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor =
                    "#4a5568";
                  (e.target as HTMLButtonElement).style.transform =
                    "translateY(-1px)";
                  (e.target as HTMLButtonElement).style.boxShadow =
                    "0 4px 8px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor =
                    "#718096";
                  (e.target as HTMLButtonElement).style.transform =
                    "translateY(0)";
                  (e.target as HTMLButtonElement).style.boxShadow =
                    "0 2px 4px rgba(0,0,0,0.10)";
                }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </section>

        {/* Error banner */}
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

        {/* Modal Overlay */}
        {isModalOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
              padding: "20px",
            }}
            onClick={handleCloseModal}
          >
            <div
              style={{
                backgroundColor: "#fcfcf9",
                borderRadius: 24,
                padding: "32px 40px",
                maxWidth: 600,
                width: "100%",
                maxHeight: "90vh",
                overflow: "auto",
                boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
                border: "1px solid rgba(0,0,0,0.05)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 24,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 800,
                    color: "var(--text-dark)",
                  }}
                >
                  {editingPost ? `Edit "${editingPost.title}"` : "Create a new post"}
                </h2>
                <button
                  onClick={handleCloseModal}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 28,
                    cursor: "pointer",
                    color: "#6b7280",
                    padding: 0,
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                    transition: "all 0.18s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor =
                      "#f3f4f6";
                    (e.target as HTMLButtonElement).style.color = "#1f2937";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor =
                      "transparent";
                    (e.target as HTMLButtonElement).style.color = "#6b7280";
                  }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handlePostSubmit}>
                {/* Title Input */}
                <div style={{ marginBottom: 16 }}>
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
                      borderRadius: 10,
                      fontSize: 15,
                      backgroundColor: "#ffffff",
                      color: "#2d3748",
                      transition: "all 0.18s ease",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#006729";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(0, 103, 41, 0.12)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e2e8f0";
                      e.target.style.boxShadow =
                        "0 1px 3px rgba(0,0,0,0.06)";
                    }}
                  />
                </div>

                {/* Type and Modality Dropdowns */}
                <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <select
                      value={postType}
                      onChange={(e) => setPostType(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: "2px solid #e2e8f0",
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 500,
                        backgroundColor: "#ffffff",
                        color: "#2d3748",
                        cursor: "pointer",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                        transition: "all 0.18s ease",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#006729";
                        e.target.style.boxShadow =
                          "0 0 0 3px rgba(0, 103, 41, 0.12)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#e2e8f0";
                        e.target.style.boxShadow =
                          "0 1px 3px rgba(0,0,0,0.06)";
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
                    <select
                      value={postModality}
                      onChange={(e) => setPostModality(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: "2px solid #e2e8f0",
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 500,
                        backgroundColor: "#ffffff",
                        color: "#2d3748",
                        cursor: "pointer",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                        transition: "all 0.18s ease",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#006729";
                        e.target.style.boxShadow =
                          "0 0 0 3px rgba(0, 103, 41, 0.12)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#e2e8f0";
                        e.target.style.boxShadow =
                          "0 1px 3px rgba(0,0,0,0.06)";
                      }}
                    >
                      <option value="in-person">In-Person</option>
                      <option value="online">Online</option>
                      <option value="hybrid">Hybrid</option>
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
                    minHeight: 150,
                    padding: "12px 16px",
                    border: "2px solid #e2e8f0",
                    borderRadius: 10,
                    fontSize: 14,
                    fontFamily: "inherit",
                    resize: "vertical",
                    backgroundColor: "#ffffff",
                    color: "#2d3748",
                    transition: "all 0.18s ease",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#006729";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(0, 103, 41, 0.12)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e2e8f0";
                    e.target.style.boxShadow =
                      "0 1px 3px rgba(0,0,0,0.06)";
                  }}
                />

                <div
                  style={{
                    marginTop: 24,
                    display: "flex",
                    gap: 10,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#718096",
                      color: "white",
                      border: "none",
                      borderRadius: 999,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      boxShadow: "0 2px 4px rgba(0,0,0,0.10)",
                      transition: "all 0.18s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor =
                        "#4a5568";
                      (e.target as HTMLButtonElement).style.transform =
                        "translateY(-1px)";
                      (e.target as HTMLButtonElement).style.boxShadow =
                        "0 4px 8px rgba(0,0,0,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor =
                        "#718096";
                      (e.target as HTMLButtonElement).style.transform =
                        "translateY(0)";
                      (e.target as HTMLButtonElement).style.boxShadow =
                        "0 2px 4px rgba(0,0,0,0.10)";
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting || !newPost.trim() || !postTitle.trim()}
                    style={{
                      padding: "10px 22px",
                      backgroundColor: submitting ? "#a0aec0" : "#006729",
                      color: "white",
                      border: "none",
                      borderRadius: 999,
                      cursor: submitting ? "not-allowed" : "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      boxShadow: submitting
                        ? "0 1px 2px rgba(0,0,0,0.10)"
                        : "0 3px 7px rgba(0,0,0,0.18)",
                      transition: "all 0.18s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!submitting && newPost.trim() && postTitle.trim()) {
                        (e.target as HTMLButtonElement).style.backgroundColor =
                          "#004d20";
                        (e.target as HTMLButtonElement).style.transform =
                          "translateY(-1px)";
                        (e.target as HTMLButtonElement).style.boxShadow =
                          "0 5px 10px rgba(0,0,0,0.20)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!submitting && newPost.trim() && postTitle.trim()) {
                        (e.target as HTMLButtonElement).style.backgroundColor =
                          "#006729";
                        (e.target as HTMLButtonElement).style.transform =
                          "translateY(0)";
                        (e.target as HTMLButtonElement).style.boxShadow =
                          "0 3px 7px rgba(0,0,0,0.18)";
                      }
                    }}
                  >
                    {submitting
                      ? editingPost
                        ? "Updating..."
                        : "Posting..."
                      : editingPost
                      ? "Update"
                      : "Post"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Listings feed */}
        <section>
          {loading ? (
            <p style={{ color: "#4b5563", fontSize: 14 }}>Loading listings...</p>
          ) : !Array.isArray(allListings) || allListings.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 32,
                color: "#6b7280",
                fontSize: 14,
              }}
            >
              No listings yet. Be the first to share something!
            </div>
          ) : (
            allListings.map((listing) => (
              <div
                key={listing.id}
                style={{
                  backgroundColor: "#ffffff",
                  padding: 18,
                  borderRadius: 16,
                  marginBottom: 14,
                  border: "1px solid rgba(226,232,240,0.9)",
                  boxShadow: "0 4px 10px rgba(15,23,42,0.04)",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 10,
                    gap: 8,
                  }}
                >
                  <div>
                    {listing.created_by?.id ? (
                      <Link
                        to={`/profile/${
                          listing.created_by.encrypted_id ||
                          listing.created_by.id
                        }`}
                        style={{
                          color: "#006729",
                          fontSize: 14,
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = "underline";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = "none";
                        }}
                      >
                        {listing.created_by.display_name}
                      </Link>
                    ) : (
                      <strong
                        style={{
                          color: "#1a202c",
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        Unknown User
                      </strong>
                    )}
                    <div
                      style={{
                        color: "#6b7280",
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {formatDate(listing.created_at)}
                    </div>
                  </div>

                  {user?.id === listing.created_by?.id && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          backgroundColor: "#d1fae5",
                          color: "#047857",
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        Your {listing.type === "post" ? "post" : "listing"}
                      </span>
                      <button
                        onClick={() => handleEditPost(listing)}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "#22c55e",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePost(listing.id)}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {listing.type === "post" ? (
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.5,
                      color: "#111827",
                      wordWrap: "break-word",
                      overflowWrap: "break-word",
                      fontSize: 14,
                    }}
                  >
                    {listing.description}
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: 6 }}>
                      <strong
                        style={{
                          fontSize: 16,
                          color: "#111827",
                          fontWeight: 700,
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
                          maxWidth: "100%",
                          display: "block",
                        }}
                      >
                        {listing.title}
                      </strong>
                      <div
                        style={{
                          color: "#6b7280",
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        {listing.org_name} • {listing.type} •{" "}
                        {listing.modality} • RSVPs: {listing.rsvp_count}
                      </div>
                    </div>
                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.5,
                        color: "#111827",
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        fontSize: 14,
                      }}
                    >
                      {listing.description}
                    </div>
                  </div>
                )}

                {/* RSVP Section */}
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 10,
                    borderTop: "1px solid #e5e7eb",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {/* RSVP Counts */}
                  <div
                    style={{
                      display: "flex",
                      gap: 14,
                      fontSize: 12,
                      color: "#6b7280",
                      flexWrap: "wrap",
                    }}
                  >
                    {listing.type === "event" ? (
                      <>
                        <span>Going: {listing.going_count}</span>
                        <span>Interested: {listing.interested_count}</span>
                        <span>Not going: {listing.not_going_count}</span>
                      </>
                    ) : (
                      <span>Interested: {listing.interested_count}</span>
                    )}
                  </div>

                  {/* RSVP Buttons */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {listing.type === "event" ? (
                      <>
                        <button
                          onClick={() => handleRSVP(listing.id, "going")}
                          style={{
                            padding: "6px 12px",
                            backgroundColor:
                              listing.user_rsvp_status === "going"
                                ? "#16a34a"
                                : "#f8fafc",
                            color:
                              listing.user_rsvp_status === "going"
                                ? "white"
                                : "#16a34a",
                            border: "1px solid #16a34a",
                            borderRadius: 999,
                            cursor: "pointer",
                            fontSize: 11,
                            fontWeight:
                              listing.user_rsvp_status === "going" ? 700 : 500,
                          }}
                        >
                          Going
                        </button>
                        <button
                          onClick={() => handleRSVP(listing.id, "interested")}
                          style={{
                            padding: "6px 12px",
                            backgroundColor:
                              listing.user_rsvp_status === "interested"
                                ? "#f97316"
                                : "#f8fafc",
                            color:
                              listing.user_rsvp_status === "interested"
                                ? "white"
                                : "#f97316",
                            border: "1px solid #f97316",
                            borderRadius: 999,
                            cursor: "pointer",
                            fontSize: 11,
                            fontWeight:
                              listing.user_rsvp_status === "interested" ? 700 : 500,
                          }}
                        >
                          Interested
                        </button>
                        <button
                          onClick={() => handleRSVP(listing.id, "not_going")}
                          style={{
                            padding: "6px 12px",
                            backgroundColor:
                              listing.user_rsvp_status === "not_going"
                                ? "#ef4444"
                                : "#f8fafc",
                            color:
                              listing.user_rsvp_status === "not_going"
                                ? "white"
                                : "#ef4444",
                            border: "1px solid #ef4444",
                            borderRadius: 999,
                            cursor: "pointer",
                            fontSize: 11,
                            fontWeight:
                              listing.user_rsvp_status === "not_going" ? 700 : 500,
                          }}
                        >
                          Not Going
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleRSVP(listing.id, "interested")}
                        style={{
                          padding: "6px 12px",
                          backgroundColor:
                            listing.user_rsvp_status === "interested"
                              ? "#f97316"
                              : "#f8fafc",
                          color:
                            listing.user_rsvp_status === "interested"
                              ? "white"
                              : "#f97316",
                          border: "1px solid #f97316",
                          borderRadius: 999,
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight:
                            listing.user_rsvp_status === "interested" ? 700 : 500,
                        }}
                      >
                        Interested
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
