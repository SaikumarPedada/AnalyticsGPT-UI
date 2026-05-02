import { memo, Suspense, lazy } from "react";

// Lazy-load Plotly — ESM/Vite safe
const Plot = lazy(() => import("react-plotly.js"));

// ── File attachment chip ───────────────────────────────────────────────────
function getFileColor(name) {
  const ext = name?.split(".").pop()?.toLowerCase();
  const colors = { csv: "#16a34a", xlsx: "#15803d", json: "#b45309", parquet: "#7c3aed" };
  return colors[ext] || "#6b7280";
}

function getFileIcon(name) {
  const color = getFileColor(name);
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="1" width="8" height="11" rx="1.5" stroke={color} strokeWidth="1.2" />
      <path d="M8 1v3h3" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M4 7h5M4 9h3" stroke={color} strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function FileAttachment({ fileName }) {
  const ext = fileName?.split(".").pop()?.toLowerCase() || "";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "7px",
      background: "var(--bg-secondary)", border: "1px solid var(--border)",
      borderRadius: "8px", padding: "6px 10px", marginBottom: "8px", maxWidth: "240px",
    }}>
      {getFileIcon(fileName)}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{
          fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          maxWidth: "160px", lineHeight: 1.3,
        }}>{fileName}</span>
        <span style={{
          fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase",
          letterSpacing: "0.06em", fontFamily: "var(--font-mono)", lineHeight: 1.3,
        }}>{ext} file attached</span>
      </div>
    </div>
  );
}

// ── Parse content into segments ────────────────────────────────────────────
//
// Handles three embedded JSON shapes:
//   1. Plotly chart  → { data: [...], layout: {...} }
//   2. Table result  → { summary: { rows, columns }, data: [...] }
//   3. Everything else rendered as plain text
//
function parseSegments(content) {
  if (!content) return [];

  const segments = [];
  let remaining = content;

  while (remaining.length > 0) {
    const braceIdx = remaining.indexOf("{");

    if (braceIdx === -1) {
      if (remaining.trim()) segments.push({ type: "text", value: remaining });
      break;
    }

    // Text before the brace
    if (braceIdx > 0) {
      const pre = remaining.slice(0, braceIdx);
      if (pre.trim()) segments.push({ type: "text", value: pre });
    }

    // Walk from braceIdx to find the matching closing brace
    let depth = 0;
    let parsed = null;
    let parsedType = null;
    let endIdx = -1;

    for (let i = braceIdx; i < remaining.length; i++) {
      const ch = remaining[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          const candidate = remaining.slice(braceIdx, i + 1);
          try {
            const obj = JSON.parse(candidate);
            // Detect Plotly chart
            if (Array.isArray(obj?.data) && obj?.layout !== undefined) {
              parsed = obj;
              parsedType = "chart";
              endIdx = i + 1;
            }
            // Detect analytics/ETL table result
            else if (
              obj?.summary &&
              typeof obj.summary.rows === "number" &&
              Array.isArray(obj.summary.columns) &&
              Array.isArray(obj?.data)
            ) {
              parsed = obj;
              parsedType = "table";
              endIdx = i + 1;
            }
          } catch {
            // not valid JSON — keep going
          }
          break;
        }
      }
    }

    if (parsed) {
      segments.push({ type: parsedType, value: parsed });
      remaining = remaining.slice(endIdx);
    } else {
      // The '{' didn't yield a recognised object — emit up to next '{' as text
      const nextBrace = remaining.indexOf("{", braceIdx + 1);
      const textChunk = nextBrace === -1 ? remaining : remaining.slice(0, nextBrace);
      if (textChunk.trim()) segments.push({ type: "text", value: textChunk });
      remaining = nextBrace === -1 ? "" : remaining.slice(nextBrace);
    }
  }

  return segments;
}

// ── Plotly chart block ─────────────────────────────────────────────────────
function ChartBlock({ chart }) {
  return (
    <div style={{ margin: "10px 0", borderRadius: "var(--radius)", overflow: "hidden" }}>
      <Suspense fallback={
        <div style={{
          padding: "24px", textAlign: "center", fontSize: 12,
          color: "var(--text-muted)", background: "var(--bg-secondary)",
          borderRadius: "var(--radius)",
        }}>
          Loading chart…
        </div>
      }>
        <Plot
          data={chart.data}
          layout={{
            ...chart.layout,
            autosize: true,
            paper_bgcolor: "transparent",
            plot_bgcolor: "rgba(244,242,238,0.6)",
            font: { color: "#1a1814", family: "Geist, sans-serif" },
            margin: { l: 48, r: 20, t: 48, b: 48 },
          }}
          style={{ width: "100%", height: "380px" }}
          config={{ responsive: true, displayModeBar: false }}
        />
      </Suspense>
    </div>
  );
}

// ── Analytics / ETL table block ────────────────────────────────────────────
function TableBlock({ result }) {
  const { summary, data } = result;
  if (!data || data.length === 0) return null;

  const columns = summary?.columns || Object.keys(data[0] || {});

  return (
    <div style={{ margin: "10px 0", overflowX: "auto" }}>
      {/* Summary header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        marginBottom: "8px", fontSize: "11px", color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
      }}>
        <span style={{
          background: "var(--accent-dim)", border: "1px solid var(--border-accent)",
          borderRadius: "20px", padding: "2px 10px", color: "var(--accent)",
          fontSize: "10px", letterSpacing: "0.02em",
        }}>
          {summary?.rows ?? data.length} rows · {columns.length} columns
          {summary?.rows > 20 ? " · showing first 20" : ""}
        </span>
      </div>

      {/* Table */}
      <div style={{
        borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
        overflow: "hidden", background: "var(--bg)",
      }}>
        <table style={{
          width: "100%", borderCollapse: "collapse",
          fontSize: "12px", fontFamily: "var(--font-mono)",
        }}>
          <thead>
            <tr style={{ background: "var(--bg-secondary)" }}>
              {columns.map((col) => (
                <th key={col} style={{
                  padding: "8px 12px", textAlign: "left",
                  fontWeight: 500, color: "var(--text-secondary)",
                  fontSize: "11px", textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  borderBottom: "1px solid var(--border)",
                  whiteSpace: "nowrap",
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} style={{
                background: i % 2 === 0 ? "var(--bg)" : "var(--bg-secondary)",
                transition: "background 0.1s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--accent-dim)"}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "var(--bg)" : "var(--bg-secondary)"}
              >
                {columns.map((col) => {
                  const val = row[col];
                  const isNum = typeof val === "number";
                  return (
                    <td key={col} style={{
                      padding: "7px 12px",
                      color: isNum ? "var(--accent)" : "var(--text)",
                      borderBottom: "1px solid var(--border)",
                      whiteSpace: "nowrap",
                      maxWidth: "200px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {val === null || val === undefined
                        ? <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>null</span>
                        : isNum
                          ? Number.isInteger(val) ? val.toLocaleString() : val.toFixed(4)
                          : String(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Inline text (bold + inline code) ──────────────────────────────────────
function InlineText({ text }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`"))
          return <code key={i} className="inline-code">{part.slice(1, -1)}</code>;
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ── Full message content renderer ──────────────────────────────────────────
function MessageContent({ content }) {
  if (!content) return null;

  const segments = parseSegments(content);
  if (segments.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {segments.map((seg, i) => {
        if (seg.type === "chart") return <ChartBlock key={i} chart={seg.value} />;
        if (seg.type === "table") return <TableBlock key={i} result={seg.value} />;
        return (
          <div key={i} className="msg-text"
            style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            <InlineText text={seg.value.trimStart()} />
          </div>
        );
      })}
    </div>
  );
}

// ── Step / agent progress message ──────────────────────────────────────────
function StepMessage({ content }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      padding: "6px 12px", margin: "2px 0",
      fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)",
    }}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
        style={{ flexShrink: 0, color: "var(--accent)", opacity: 0.7 }}>
        <path
          d="M6 1v2M6 9v2M1 6h2M9 6h2M2.5 2.5l1.4 1.4M8.1 8.1l1.4 1.4M2.5 9.5l1.4-1.4M8.1 3.9l1.4-1.4"
          stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      <span style={{ color: "var(--accent)", opacity: 0.7 }}>
        {content.replace(/^⚙️\s*/, "")}
      </span>
    </div>
  );
}

// ── Individual message bubble ──────────────────────────────────────────────
const Message = memo(({ msg }) => {
  const isUser = msg.role === "user";

  if (msg.isStep) return <StepMessage content={msg.content} />;

  return (
    <div className={`message ${msg.role}${msg.error ? " error" : ""}`}>
      {!isUser && (
        <div className="msg-avatar assistant-avatar">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="6.5" cy="6.5" r="2" fill="currentColor" />
          </svg>
        </div>
      )}

      <div className="msg-content">
        <div className="msg-bubble">
          {msg.fileName && <FileAttachment fileName={msg.fileName} />}
          <MessageContent content={msg.content} />
        </div>
        {msg.tokens > 0 && (
          <div className="msg-meta">
            <span className="msg-tokens">{msg.tokens.toLocaleString()} tok</span>
          </div>
        )}
      </div>

      {isUser && (
        <div className="msg-avatar user-avatar" style={{ fontSize: "11px", fontWeight: 600 }}>
          U
        </div>
      )}
    </div>
  );
});

Message.displayName = "Message";

// ── Typing indicator ───────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="message assistant"
      style={{ animation: "msgIn 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
      <div className="msg-avatar assistant-avatar">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="6.5" cy="6.5" r="2" fill="currentColor" />
        </svg>
      </div>
      <div className="msg-bubble" style={{
        background: "var(--assistant-bubble)",
        border: "1px solid var(--assistant-border)",
        borderRadius: "4px var(--radius) var(--radius) var(--radius)",
      }}>
        <div className="typing-bubble">
          <div className="dot" /><div className="dot" /><div className="dot" />
        </div>
      </div>
    </div>
  );
}

// ── MessageList ────────────────────────────────────────────────────────────
export default function MessageList({ messages, isTyping }) {
  return (
    <div className="message-list">
      {messages.map((msg) => (
        <Message key={msg.id} msg={msg} />
      ))}
      {isTyping && <TypingIndicator />}
    </div>
  );
}