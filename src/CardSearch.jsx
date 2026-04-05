import { useState, useRef, useEffect } from "react";

const SCRYFALL_API = "https://api.scryfall.com";
const API = "http://localhost:3001/api";

function CardSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [collection, setCollection] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const debounceTimer = useRef(null);

  // Load collection from backend on mount
  useEffect(() => {
    fetch(`${API}/collection`)
      .then((r) => r.json())
      .then((cards) => {
        const map = {};
        cards.forEach((c) => (map[c.id] = c));
        setCollection(map);
      })
      .catch(() => console.error("Could not connect to server"));
  }, []);

  const search = async (name) => {
    if (!name.trim()) { setResults([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${SCRYFALL_API}/cards/search?q=name:${encodeURIComponent(name)}&order=name&unique=cards`
      );
      if (res.status === 404) { setResults([]); setError("No cards found."); return; }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults(data.data || []);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => search(val), 400);
  };

  const handleSelect = (card) => {
    setSelected(card);
    setResults([]);
    setQuery(card.name);
  };

  const handleClear = () => {
    setQuery(""); setResults([]); setSelected(null); setError(null);
  };

  const getImageUrl = (card) =>
    card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || null;

  const getManaCost = (card) =>
    card.mana_cost || card.card_faces?.[0]?.mana_cost || "";

  // Collection actions
  const addToCollection = async (card) => {
    const res = await fetch(`${API}/collection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: card.id,
        name: card.name,
        set_name: card.set_name,
        rarity: card.rarity,
        image: getImageUrl(card),
      }),
    });
    const updated = await res.json();
    setCollection((prev) => ({ ...prev, [updated.id]: updated }));
  };

  const updateQty = async (id, delta) => {
    const current = collection[id];
    if (!current) return;
    const newQty = current.qty + delta;
    const res = await fetch(`${API}/collection/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qty: newQty }),
    });
    const data = await res.json();
    if (data.deleted) {
      setCollection((prev) => { const next = { ...prev }; delete next[id]; return next; });
    } else {
      setCollection((prev) => ({ ...prev, [id]: data }));
    }
  };

  const removeFromCollection = async (id) => {
    await fetch(`${API}/collection/${id}`, { method: "DELETE" });
    setCollection((prev) => { const next = { ...prev }; delete next[id]; return next; });
  };

  const collectionCards = Object.values(collection);
  const totalCards = collectionCards.reduce((sum, c) => sum + c.qty, 0);
  const inCollection = selected ? collection[selected.id]?.qty || 0 : 0;

  return (
    <div style={styles.root}>
      {/* Main */}
      <div style={{ ...styles.main, marginRight: sidebarOpen ? 320 : 0 }}>
        <div style={styles.topBar}>
          <h1 style={styles.title}>MTG Card Search</h1>
          <button style={styles.toggleBtn} onClick={() => setSidebarOpen((v) => !v)}>
            {sidebarOpen ? "Hide Collection ▶" : "◀ Show Collection"}
          </button>
        </div>

        <div style={styles.searchWrapper}>
          <input
            style={styles.input}
            type="text"
            placeholder="Enter card name..."
            value={query}
            onChange={handleInput}
            autoComplete="off"
          />
          {query && <button style={styles.clearBtn} onClick={handleClear}>✕</button>}
        </div>

        {loading && <p style={styles.status}>Searching...</p>}
        {error && <p style={styles.error}>{error}</p>}

        {results.length > 0 && !selected && (
          <ul style={styles.dropdown}>
            {results.slice(0, 10).map((card) => (
              <li
                key={card.id}
                style={styles.dropdownItem}
                onClick={() => handleSelect(card)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a2a")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={styles.dropdownName}>{card.name}</span>
                <span style={styles.dropdownSet}>{card.set_name}</span>
              </li>
            ))}
          </ul>
        )}

        {selected && (
          <div style={styles.cardDetail}>
            <div style={styles.cardImageWrapper}>
              {getImageUrl(selected) ? (
                <img src={getImageUrl(selected)} alt={selected.name} style={styles.cardImage} />
              ) : (
                <div style={styles.noImage}>No image available</div>
              )}
            </div>
            <div style={styles.cardInfo}>
              <h2 style={styles.cardName}>{selected.name}</h2>
              <p style={styles.cardMeta}>{getManaCost(selected)}</p>
              <p style={styles.cardMeta}><strong>Type:</strong> {selected.type_line}</p>
              {selected.oracle_text && <p style={styles.cardText}>{selected.oracle_text}</p>}
              {selected.power && (
                <p style={styles.cardMeta}><strong>P/T:</strong> {selected.power}/{selected.toughness}</p>
              )}
              {selected.loyalty && (
                <p style={styles.cardMeta}><strong>Loyalty:</strong> {selected.loyalty}</p>
              )}
              <p style={styles.cardMeta}><strong>Set:</strong> {selected.set_name}</p>
              <p style={styles.cardMeta}>
                <strong>Rarity:</strong> {selected.rarity.charAt(0).toUpperCase() + selected.rarity.slice(1)}
              </p>
              {selected.prices?.usd && (
                <p style={styles.cardMeta}><strong>Price (USD):</strong> ${selected.prices.usd}</p>
              )}
              <div style={styles.addRow}>
                <button style={styles.addBtn} onClick={() => addToCollection(selected)}>
                  + Add to Collection
                </button>
                {inCollection > 0 && (
                  <span style={styles.inCollectionBadge}>{inCollection} in collection</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      {sidebarOpen && (
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <span style={styles.sidebarTitle}>My Collection</span>
            <span style={styles.sidebarCount}>{totalCards} cards</span>
          </div>
          {collectionCards.length === 0 ? (
            <p style={styles.emptyMsg}>No cards yet. Search and add some!</p>
          ) : (
            <ul style={styles.collectionList}>
              {collectionCards.map((card) => (
                <li key={card.id} style={styles.collectionItem}>
                  {card.image && (
                    <img src={card.image} alt={card.name} style={styles.collectionThumb} />
                  )}
                  <div style={styles.collectionInfo}>
                    <span style={styles.collectionName}>{card.name}</span>
                    <span style={styles.collectionSet}>{card.set_name}</span>
                  </div>
                  <div style={styles.qtyControls}>
                    <button style={styles.qtyBtn} onClick={() => updateQty(card.id, -1)}>−</button>
                    <span style={styles.qtyNum}>{card.qty}</span>
                    <button style={styles.qtyBtn} onClick={() => updateQty(card.id, 1)}>+</button>
                    <button style={styles.removeBtn} onClick={() => removeFromCollection(card.id)}>✕</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  root: { display: "flex", background: "#111", minHeight: "100vh", color: "#e8e8e8", fontFamily: "Georgia, serif", position: "relative" },
  main: { flex: 1, padding: "2rem", transition: "margin-right 0.3s", maxWidth: "100%" },
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" },
  title: { fontSize: "2rem", color: "#c9a84c", letterSpacing: "0.05em", margin: 0 },
  toggleBtn: { background: "none", border: "1px solid #444", color: "#aaa", padding: "0.4rem 0.9rem", borderRadius: 6, cursor: "pointer", fontSize: "0.85rem" },
  searchWrapper: { position: "relative", display: "flex", alignItems: "center" },
  input: { width: "100%", padding: "0.75rem 2.5rem 0.75rem 1rem", fontSize: "1rem", background: "#1e1e1e", border: "1px solid #444", borderRadius: 6, color: "#e8e8e8", outline: "none", boxSizing: "border-box" },
  clearBtn: { position: "absolute", right: 10, background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "1rem" },
  status: { color: "#888", marginTop: "0.5rem" },
  error: { color: "#e05555", marginTop: "0.5rem" },
  dropdown: { listStyle: "none", margin: "0.25rem 0 0", padding: 0, background: "#1e1e1e", border: "1px solid #444", borderRadius: 6, overflow: "hidden", zIndex: 10 },
  dropdownItem: { display: "flex", justifyContent: "space-between", padding: "0.6rem 1rem", cursor: "pointer", transition: "background 0.15s" },
  dropdownName: { fontWeight: "bold", color: "#e8e8e8" },
  dropdownSet: { color: "#888", fontSize: "0.85rem" },
  cardDetail: { display: "flex", gap: "2rem", marginTop: "2rem", flexWrap: "wrap" },
  cardImageWrapper: { flexShrink: 0 },
  cardImage: { width: 240, borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.6)" },
  noImage: { width: 240, height: 340, background: "#1e1e1e", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#555" },
  cardInfo: { flex: 1, minWidth: 220 },
  cardName: { fontSize: "1.5rem", color: "#c9a84c", marginBottom: "0.5rem" },
  cardMeta: { margin: "0.3rem 0", fontSize: "0.95rem", color: "#ccc" },
  cardText: { margin: "0.75rem 0", fontSize: "0.95rem", color: "#bbb", lineHeight: 1.6, whiteSpace: "pre-wrap", borderLeft: "2px solid #c9a84c", paddingLeft: "0.75rem" },
  addRow: { display: "flex", alignItems: "center", gap: "1rem", marginTop: "1.25rem" },
  addBtn: { background: "#c9a84c", color: "#111", border: "none", padding: "0.6rem 1.2rem", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: "0.95rem" },
  inCollectionBadge: { color: "#c9a84c", fontSize: "0.9rem" },
  sidebar: { position: "fixed", right: 0, top: 0, width: 320, height: "100vh", background: "#181818", borderLeft: "1px solid #333", display: "flex", flexDirection: "column", zIndex: 100, overflowY: "auto" },
  sidebarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1rem", borderBottom: "1px solid #333", position: "sticky", top: 0, background: "#181818" },
  sidebarTitle: { fontSize: "1.1rem", color: "#c9a84c", fontWeight: "bold" },
  sidebarCount: { color: "#888", fontSize: "0.85rem" },
  emptyMsg: { color: "#555", padding: "1rem", fontSize: "0.9rem" },
  collectionList: { listStyle: "none", margin: 0, padding: "0.5rem 0" },
  collectionItem: { display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 1rem", borderBottom: "1px solid #222" },
  collectionThumb: { width: 36, height: 50, borderRadius: 4, objectFit: "cover", flexShrink: 0 },
  collectionInfo: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  collectionName: { fontSize: "0.85rem", color: "#e8e8e8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  collectionSet: { fontSize: "0.75rem", color: "#666" },
  qtyControls: { display: "flex", alignItems: "center", gap: "0.25rem", flexShrink: 0 },
  qtyBtn: { background: "#2a2a2a", border: "1px solid #444", color: "#ccc", width: 24, height: 24, borderRadius: 4, cursor: "pointer", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center" },
  qtyNum: { color: "#c9a84c", fontSize: "0.9rem", minWidth: 20, textAlign: "center" },
  removeBtn: { background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "0.8rem", marginLeft: 2 },
};

export default CardSearch;