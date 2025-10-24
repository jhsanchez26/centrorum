import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

type Listing = { 
  id: number; 
  title: string; 
  description: string; 
  org_name: string; 
  type: string; 
  modality: string; 
  rsvp_count: number;
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
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => { 
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const response = await api.get("/listings/");
      setAllListings(response.data);
    } catch (err: any) {
      setError("Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    setSubmitting(true);
    try {
      const response = await api.post("/posts/", { 
        title: "Post",
        content: newPost 
      });
      setAllListings([response.data, ...allListings]);
      setNewPost("");
    } catch (err: any) {
      setError("Failed to create post");
    } finally {
      setSubmitting(false);
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
    <main style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <h1>Listings</h1>
      
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
        backgroundColor: "#f8f9fa",
        padding: 20,
        borderRadius: 8,
        marginBottom: 24,
        border: "1px solid #dee2e6"
      }}>
        <h3 style={{ marginTop: 0 }}>Create a new post</h3>
        <form onSubmit={handlePostSubmit}>
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Any news?"
            required
            style={{
              width: "100%",
              minHeight: 100,
              padding: 12,
              border: "1px solid #ccc",
              borderRadius: 4,
              fontSize: 16,
              fontFamily: "inherit",
              resize: "vertical"
            }}
          />
          <div style={{ marginTop: 12, textAlign: "right" }}>
            <button
              type="submit"
              disabled={submitting || !newPost.trim()}
              style={{
                padding: "8px 16px",
                backgroundColor: submitting ? "#ccc" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: submitting ? "not-allowed" : "pointer"
              }}
            >
              {submitting ? "Posting..." : "Post"}
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
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}
            >
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 12
              }}>
                <div>
                  <strong style={{ color: "#333" }}>{listing.created_by.display_name}</strong>
                  <div style={{ color: "#666", fontSize: "14px" }}>
                    {formatDate(listing.created_at)}
                  </div>
                </div>
                {user?.id === listing.created_by.id && (
                  <span style={{
                    backgroundColor: "#e3f2fd",
                    color: "#1976d2",
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: "12px"
                  }}>
                    Your {listing.type === 'post' ? 'post' : 'listing'}
                  </span>
                )}
              </div>
              
              {listing.type === 'post' ? (
                <div style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                  color: "#333"
                }}>
                  {listing.description}
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <strong style={{ fontSize: "18px", color: "#333" }}>{listing.title}</strong>
                    <div style={{ color: "#666", fontSize: "14px", marginTop: 4 }}>
                      {listing.org_name} • {listing.type} • {listing.modality} • RSVPs: {listing.rsvp_count}
                    </div>
                  </div>
                  <div style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.5,
                    color: "#333"
                  }}>
                    {listing.description}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  );
}
