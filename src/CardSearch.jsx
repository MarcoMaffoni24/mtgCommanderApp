import { useState, useRef } from "react";

const SCRYFALL_API = "https://api.scryfall.com";

function CardSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceTimer = useRef(null);

  const search = async (name) => {
    if (!name.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${SCRYFALL_API}/cards/search?q=name:${encodeURIComponent(name)}&order=name&unique=cards`
      );
      if (res.status === 404) {
        setResults([]);
        setError("No cards found.");
        return;
      }
      if (!res.ok) throw new Error("Scryfall API error");
      const data = await res.json();
      setResults(data.data || []);
    } catch (err) {
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
    setQuery("");
    setResults([]);
    setSelected(null);
    setError(null);
  };

  const getImageUrl = (card) => {
    if (card.image_uris?.normal) return card.image_uris.normal;
    if (card.card_faces?.[0]?.image_uris?.normal)
      return card.card_faces[0].image_uris.normal;
    return null;
  };

  const getManaCost = (card) => {
    return card.mana_cost || card.card_faces?.[0]?.mana_cost || "";
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>MTG Card Search</h1>

      {/* Search input */}
      <div style={styles.searchWrapper}>
        <input
          style={styles.input}
          type="text"
          placeholder="Enter card name..."
          value={query}
          onChange={handleInput}
          autoComplete="off"
        />
        {query && (
          <button style={styles.clearBtn} onClick={handleClear}>
            ✕
          </button>
        )}
      </div>

      {/* Status */}
      {loading && <p style={styles.status}>Searching...</p>}
      {error && <p style={styles.error}>{error}</p>}

      {/* Autocomplete dropdown */}
      {results.length > 0 && !selected && (
        <ul style={styles.dropdown}>
          {results.slice(0, 10).map((card) => (
            <li
              key={card.id}
              style={styles.dropdownItem}
              onClick={() => handleSelect(card)}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#2a2a2a")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span style={styles.dropdownName}>{card.name}</span>
              <span style={styles.dropdownSet}>{card.set_name}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Card detail */}
      {selected && (
        <div style={styles.cardDetail}>
          <div style={styles.cardImageWrapper}>
            {getImageUrl(selected) ? (
              <img
                src={getImageUrl(selected)}
                alt={selected.name}
                style={styles.cardImage}
              />
            ) : (
              <div style={styles.noImage}>No image available</div>
            )}
          </div>
          <div style={styles.cardInfo}>
            <h2 style={styles.cardName}>{selected.name}</h2>
            <p style={styles.cardMeta}>{getManaCost(selected)}</p>
            <p style={styles.cardMeta}>
              <strong>Type:</strong> {selected.type_line}
            </p>
            {selected.oracle_text && (
              <p style={styles.cardText}>{selected.oracle_text}</p>
            )}
            {selected.power && (
              <p style={styles.cardMeta}>
                <strong>P/T:</strong> {selected.power}/{selected.toughness}
              </p>
            )}
            {selected.loyalty && (
              <p style={styles.cardMeta}>
                <strong>Loyalty:</strong> {selected.loyalty}
              </p>
            )}
            <p style={styles.cardMeta}>
              <strong>Set:</strong> {selected.set_name}
            </p>
            <p style={styles.cardMeta}>
              <strong>Rarity:</strong>{" "}
              {selected.rarity.charAt(0).toUpperCase() +
                selected.rarity.slice(1)}
            </p>
            {selected.prices?.usd && (
              <p style={styles.cardMeta}>
                <strong>Price (USD):</strong> ${selected.prices.usd}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 800,
    margin: "0 auto",
    padding: "2rem",
    fontFamily: "Georgia, serif",
    color: "#e8e8e8",
    background: "#111",
    minHeight: "100vh",
  },
  title: {
    fontSize: "2rem",
    marginBottom: "1.5rem",
    color: "#c9a84c",
    letterSpacing: "0.05em",
  },
  searchWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  input: {
    width: "100%",
    padding: "0.75rem 2.5rem 0.75rem 1rem",
    fontSize: "1rem",
    background: "#1e1e1e",
    border: "1px solid #444",
    borderRadius: 6,
    color: "#e8e8e8",
    outline: "none",
    boxSizing: "border-box",
  },
  clearBtn: {
    position: "absolute",
    right: 10,
    background: "none",
    border: "none",
    color: "#888",
    cursor: "pointer",
    fontSize: "1rem",
  },
  status: { color: "#888", marginTop: "0.5rem" },
  error: { color: "#e05555", marginTop: "0.5rem" },
  dropdown: {
    listStyle: "none",
    margin: "0.25rem 0 0",
    padding: 0,
    background: "#1e1e1e",
    border: "1px solid #444",
    borderRadius: 6,
    overflow: "hidden",
    zIndex: 10,
  },
  dropdownItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "0.6rem 1rem",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  dropdownName: { fontWeight: "bold", color: "#e8e8e8" },
  dropdownSet: { color: "#888", fontSize: "0.85rem" },
  cardDetail: {
    display: "flex",
    gap: "2rem",
    marginTop: "2rem",
    flexWrap: "wrap",
  },
  cardImageWrapper: { flexShrink: 0 },
  cardImage: {
    width: 240,
    borderRadius: 12,
    boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
  },
  noImage: {
    width: 240,
    height: 340,
    background: "#1e1e1e",
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#555",
  },
  cardInfo: { flex: 1, minWidth: 220 },
  cardName: { fontSize: "1.5rem", color: "#c9a84c", marginBottom: "0.5rem" },
  cardMeta: { margin: "0.3rem 0", fontSize: "0.95rem", color: "#ccc" },
  cardText: {
    margin: "0.75rem 0",
    fontSize: "0.95rem",
    color: "#bbb",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    borderLeft: "2px solid #c9a84c",
    paddingLeft: "0.75rem",
  },
};

export default CardSearch;
