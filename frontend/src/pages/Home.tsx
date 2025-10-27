export default function Home() {
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
          marginBottom: "16px"
        }}>
          Welcome to CentroRUM
        </h1>
        <p style={{
          color: "#4a5568",
          fontSize: "18px",
          lineHeight: "1.6",
          marginBottom: "24px"
        }}>
          This is the home page of your app. Use the nav bar to browse listings or log in.
        </p>
        
        <div style={{
          backgroundColor: "#ffffff",
          padding: 24,
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)"
        }}>
          <h2 style={{
            color: "#1a202c",
            fontSize: "24px",
            fontWeight: "600",
            marginBottom: "16px"
          }}>
            Get Started
          </h2>
          <p style={{
            color: "#4a5568",
            fontSize: "16px",
            lineHeight: "1.6"
          }}>
            CentroRUM is your central hub for university life. Browse events, find tutoring opportunities, 
            discover job postings, and connect with your community.
          </p>
        </div>
      </div>
    </main>
  );
}
