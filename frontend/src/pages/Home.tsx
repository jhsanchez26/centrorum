import logo from "../assets/img/CentroRUMnoBG.png";

export default function Home() {
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
          maxWidth: 980,
          width: "100%",
          backgroundColor: "#fcfcf9",
          borderRadius: 28,
          boxShadow: "0 18px 40px rgba(0,0,0,0.10)",
          border: "1px solid rgba(0,0,0,0.03)",
          padding: "40px 44px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {/* WELCOME TO */}
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
          Welcome to
        </p>

        {/* Logo + CentroRUM title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              backgroundColor: "#ffffff",
              border: "1.5px solid rgba(0,0,0,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 3px 7px rgba(0,0,0,0.12)",
            }}
          >
            <img
              src={logo}
              alt="CentroRUM logo"
              style={{
                width: 44,
                height: 44,
                objectFit: "contain",
              }}
            />
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 40,
              fontWeight: 900,
              color: "var(--text-dark)",
            }}
          >
            CentroRUM
          </h1>
        </div>

        {/* Description */}
        <p
          style={{
            margin: "4px 0 0 0",
            fontSize: 15,
            lineHeight: 1.6,
            color: "#4b5563",
            maxWidth: 680,
          }}
        >
          Central hub for university life at UPRM where you can explore listings,
          discover tutoring opportunities, stay updated on campus events, and
          connect with your community.
        </p>

        {/* ONE CHIP centered — CIIC4151 UPR MAYAGÜEZ */}
        <div
          style={{
            marginTop: 14,
            display: "flex",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 20px",
              borderRadius: 999,
              backgroundColor: "rgba(47, 125, 50, 0.08)",
              color: "var(--primary-green)",
              fontSize: 12,
              fontWeight: 600,
              minWidth: 260,
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>🐾</span>

            <span>CIIC4151</span>
            <span style={{ opacity: 0.7 }}>UPR · MAYAGÜEZ</span>

            <span style={{ fontSize: 18, lineHeight: 1 }}>🐾</span>
          </div>
        </div>

        {/* Feature Cards */}
        <div
          style={{
            marginTop: 18,
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          {[
            {
              icon: "📋",
              title: "Listings",
              text: "Browse academic, housing, and campus listings in one place.",
            },
            {
              icon: "🎓",
              title: "Tutors",
              text: "Find or offer tutoring support across different courses.",
            },
            {
              icon: "💼",
              title: "Opportunities",
              text: "Discover jobs, internships, and research openings.",
            },
            {
              icon: "📅",
              title: "Events",
              text: "Stay updated on student activities and campus events.",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                flex: "1 1 200px",
                backgroundColor: "#ffffff",
                borderRadius: 16,
                padding: "12px 14px",
                border: "1px solid rgba(148,163,184,0.18)",
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  marginBottom: 4,
                }}
              >
                {item.icon}
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: "var(--text-dark)",
                  marginBottom: 4,
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "#4b5563",
                }}
              >
                {item.text}
              </div>
            </div>
          ))}
        </div>

        {/* About section */}
        <div
          style={{
            marginTop: 26,
            padding: 22,
            borderRadius: 22,
            backgroundColor: "var(--card-bg)",
            boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
          }}
        >
          <h2
            style={{
              margin: 0,
              marginBottom: 8,
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text-dark)",
            }}
          >
            About CentroRUM
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.6,
              color: "#4b5563",
            }}
          >
            CentroRUM gathers academic listings, tutoring opportunities,
            announcements, organizations, and events transforming scattered
            campus information into one unified student hub built for UPRM.
          </p>
        </div>
      </div>
    </main>
  );
}
