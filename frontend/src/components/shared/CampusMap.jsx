import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./CampusMap.css";

const categories = [
  {
    id: "blocks",
    name: "Blocks",
    icon: "🏢",
    color: "#e11d48",
    locations: [
      { name: "A Block", subtitle: "Silicon Bhavan", mapLink: "https://maps.app.goo.gl/GH2okuZqNSTfnHcf9" },
      { name: "B Block", subtitle: "Patrons Bhavan", mapLink: "https://maps.app.goo.gl/94K7wjgJ61gZRFfFA" },
      { name: "C Block", mapLink: "https://maps.app.goo.gl/7NCMyUxvmEaTP6VX6" },
      { name: "D Block", subtitle: "Admission Block", mapLink: "https://maps.app.goo.gl/peFyz6soJHEyQptH6" },
      { name: "E Block", mapLink: "https://maps.app.goo.gl/aNRZXU9Jhr2rJztz8" },
      { name: "PG Block", mapLink: "https://maps.app.goo.gl/sh7hdCHMUFh8aTQ46" },
      { name: "PEB Block", mapLink: "https://maps.app.goo.gl/65nyxgXTs9g4h3LP9" },
    ],
  },
  {
    id: "canteen",
    name: "Canteen",
    icon: "🍽️",
    color: "#f97316",
    locations: [
      { name: "Coca Cola Canteen", mapLink: "https://maps.app.goo.gl/EpTbNFAjQuNEvxuW6?g_st=aw" },
      { name: "PEB Canteen", mapLink: "https://maps.app.goo.gl/zGQzdZ7QnzubfBFj6?g_st=aw" },
      { name: "BoxTea", mapLink: "https://maps.app.goo.gl/YrbdcqNDBf5tqm3T6" },
    ],
  },
  {
    id: "library",
    name: "Library",
    icon: "📚",
    color: "#7c3aed",
    locations: [
      { name: "Library", mapLink: "https://maps.app.goo.gl/JY36ePKPkh9PgwjE8" },
    ],
  },
  
  {
    id: "auditorium",
    name: "Auditorium",
    icon: "🎭",
    color: "#be185d",
    locations: [
      { name: "K.S.Auditorium", mapLink: "https://www.google.com/maps?q=17.5379649,78.3844679&z=17&hl=en" },
      { name: "Seminar Hall", mapLink: "https://www.google.com/maps?q=17.5381113,78.3847437&z=17&hl=en" },
    ],
  },
  
  {
    id: "sports",
    name: "Sports",
    icon: "🏀",
    color: "#059669",
    locations: [
      { name: "Sports Block", mapLink: "https://maps.app.goo.gl/jEDKmtyE39xbdeir7?g_st=aw" },
      { name: "Volleyball Court", mapLink: "https://maps.app.goo.gl/68St5qxa5Lg7LQqz7?g_st=aw" },
      { name: "Basketball Court", mapLink: "https://maps.app.goo.gl/DSCAGRo9Eoet9Prn9?g_st=ac" },
    ],
  },
  {
    id: "parking",
    name: "Parking",
    icon: "🅿️",
    color: "#475569",
    locations: [
      { name: "Student Parking", mapLink: "https://maps.app.goo.gl/aeVFegHYBGfSspFf9?g_st=aw" },
      { name: "Teacher Parking", mapLink: "https://maps.app.goo.gl/uBptpBpmpQLbDTkn7?g_st=aw" },
    ],
  },
  {
    id: "clubs",
    name: "Clubs",
    icon: "🎵",
    color: "#b45309",
    locations: [
      { name: "CRESCENDO Music Club", mapLink: "https://maps.app.goo.gl/Yk6d4d66CNDRirCo8" },
      { name: "SARC Stage", mapLink: "https://maps.app.goo.gl/hi9y1Br3AqB4gvje8?g_st=aw" },
    ],
  },
  {
    id: "landmarks",
    name: "Landmarks",
    icon: "⭐",
    color: "#0f766e",
    locations: [
      { name: "JSK Greens", mapLink: "https://maps.app.goo.gl/RvWmhzkpCkSw86kV8?g_st=aw" },
      { name: "I LOVE VNR", mapLink: "https://maps.app.goo.gl/WpJwsCd1Xk2ukUuG7?g_st=aw" },
      { name: "VJIM", mapLink: "https://maps.app.goo.gl/QWGod8BjuYHGCedWA?g_st=aw" },
    ],
  },
];

// ── Helper: safe navigation ──────────────────────────────────────────────────
// ── Helper: safe navigation ──────────────────────────────────────────────────
function openMap(mapLink) {
  if (!mapLink || mapLink === "#") {
    alert("📍 Map link coming soon!");
    return;
  }
  const a = document.createElement("a");
  a.href = mapLink;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.click();
}

export default function CampusMap() {
  const [activeId, setActiveId] = useState("blocks");
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);

  const activeCategory = categories.find((c) => c.id === activeId);

  const filtered = activeCategory.locations.filter((l) =>
    `${l.name} ${l.subtitle || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClick(e) {
      if (sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setSidebarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [sidebarOpen]);

  function selectCategory(id) {
    setActiveId(id);
    setSearch("");
    setSidebarOpen(false);
  }

  return (
    <div className="cm-root">
      {/* Mobile overlay */}
      <div
        className={`cm-overlay ${sidebarOpen ? "cm-overlay--visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside ref={sidebarRef} className={`cm-sidebar ${sidebarOpen ? "cm-sidebar--open" : ""}`}>
        <div className="cm-sidebar__header">
          <div className="cm-sidebar__logo">🧭</div>
          <p className="cm-sidebar__title">Campus Categories</p>
        </div>

        <nav className="cm-sidebar__nav">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`cm-nav-item ${activeId === cat.id ? "cm-nav-item--active" : ""}`}
              style={activeId === cat.id ? { "--active-color": cat.color } : {}}
              onClick={() => selectCategory(cat.id)}
            >
              <span className="cm-nav-item__icon">{cat.icon}</span>
              <span className="cm-nav-item__name">{cat.name}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main ── */}
      <main className="cm-main">
        {/* Hero */}
        <div className="cm-hero">
          <button
            className="cm-hamburger"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Open categories"
          >
            <span className="cm-hamburger__line" />
            <span className="cm-hamburger__line" />
            <span className="cm-hamburger__line" />
          </button>

          <div className="cm-hero__text">
            <h1 className="cm-hero__title">VNR Campus Navigator</h1>
            <p className="cm-hero__sub"><i>Find. Navigate. Arrive</i></p>
          </div>

          <div className="cm-hero__search-wrap">
            <span className="cm-search-icon">🔍</span>
            <input
              className="cm-hero__search"
              type="text"
              placeholder={`Search ${activeCategory.name.toLowerCase()}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="cm-search-clear" onClick={() => setSearch("")}>✕</button>
            )}
          </div>
        </div>

        {/* Active pill + grid */}
        <div className="cm-content">
          <div
            className="cm-active-pill"
            style={{ background: activeCategory.color }}
          >
            <span>📍</span>
            <span>{activeCategory.name.toUpperCase()}</span>
          </div>

          {filtered.length === 0 ? (
            <div className="cm-empty">
              <p className="cm-empty__icon">🔍</p>
              <p className="cm-empty__text">No results for "{search}"</p>
              <button className="cm-empty__reset" onClick={() => setSearch("")}>
                Clear search
              </button>
            </div>
          ) : (
            <div className="cm-grid">
              {filtered.map((loc) => (
                <div
                  key={loc.name}
                  className="cm-card"
                  style={{ "--cat-color": activeCategory.color }}
                >
                  <div
                    className="cm-card__icon-wrap"
                    style={{ background: activeCategory.color }}
                  >
                    <span className="cm-card__icon">{activeCategory.icon}</span>
                  </div>

                  <p className="cm-card__name">{loc.name}</p>

                  {loc.subtitle && (
                    <p className="cm-card__subtitle">{loc.subtitle}</p>
                  )}

                  <div
                    className="cm-card__bar"
                    style={{ background: activeCategory.color }}
                  />

                  {/* Blocks get two buttons; everything else gets one */}
                  {activeCategory.id === "blocks" ? (
                    <div className="cm-buttons">
                      <button
                        className="outdoor-btn"
                        onClick={() => openMap(loc.mapLink)}
                      >
                        📍 Outdoor Navigation
                      </button>

                      <button
                        className="indoor-btn"
                        onClick={() =>
                          navigate(`/student?block=${encodeURIComponent(loc.name)}`)
                        }
                      >
                        🏢 Indoor Navigation
                      </button>
                    </div>
                  ) : (
                    <button
                      className="outdoor-btn"
                      onClick={() => openMap(loc.mapLink)}
                    >
                      📍 Navigate
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}