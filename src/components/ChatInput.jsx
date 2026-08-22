import { useState, useRef } from "react";

const MODES = ["auto", "analytics", "visualization", "etl"];

const MODE_ICONS = {
  auto: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M6 4v2l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  analytics: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 9l2.5-3 2 2 3-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  visualization: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="2" y="6" width="2" height="4" rx="0.5" fill="currentColor"/>
      <rect x="5" y="3" width="2" height="7" rx="0.5" fill="currentColor"/>
      <rect x="8" y="5" width="2" height="5" rx="0.5" fill="currentColor"/>
    </svg>
  ),
  etl: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 4h8M2 8h8M5 2l-2 2 2 2M7 6l2 2-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

function getFileIcon(name) {
  const ext = name?.split(".").pop()?.toLowerCase();
  const colors = { csv: "#16a34a", xlsx: "#15803d", json: "#b45309", parquet: "#7c3aed" };
  const color = colors[ext] || "#6b7280";
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="1" width="8" height="11" rx="1.5" stroke={color} strokeWidth="1.2"/>
      <path d="M8 1v3h3" stroke={color} strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M4 7h5M4 9h3" stroke={color} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

export default function ChatInput({ onSend, disabled, status, model, setModel }) {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState("auto");
  const [filePath, setFilePath] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Upload is complete and successful when filePath is set
  const isReady = !uploading;

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setFilePath(null);
    setUploadError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/dataset/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setFilePath(data.file_path);
      setUploadError(null);
    } catch (err) {
      setUploadError(err.message || "Upload failed");
      setFileName(null);
      setFilePath(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFileName(null);
    setFilePath(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = () => {
    const text = value.trim();
    // Block send while uploading or if globally disabled
    if (!text || disabled || uploading) return;

    onSend({ message: text, mode, file_path: filePath, file_name: fileName, model });
    setValue("");
    // Keep the file attached for follow-up questions on the same dataset
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const autoResize = (e) => {
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
    setValue(el.value);
  };

  const sendDisabled = disabled || uploading || !value.trim();

  return (
    <div>
      {/* Top controls row */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
        <div className="mode-bar" style={{ margin: 0 }}>
          {MODES.map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`mode-pill ${mode === m ? "active" : ""}`}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                {MODE_ICONS[m]}{m}
              </span>
            </button>
          ))}
        </div>

        <div style={{ width: "1px", height: "20px", background: "var(--border)", flexShrink: 0 }} />

        {/* Model Selection Dropdown */}
        <div className="model-select-wrap" style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", marginRight: "6px" }}>Model:</span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="model-select"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "4px 24px 4px 8px",
              fontSize: "11px",
              color: "var(--text)",
              cursor: "pointer",
              outline: "none",
              fontFamily: "inherit",
              appearance: "none",
              fontWeight: 500,
            }}
          >
            <option value="openai/gpt-oss-120b">GPT-OSS 120B</option>
            <option value="qwen/qwen3.6-27b">Qwen 3.6 27B</option>
          </select>
          <div style={{
            position: "absolute",
            right: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center"
          }}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 2.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div style={{ width: "1px", height: "20px", background: "var(--border)", flexShrink: 0 }} />

        <label
          className={`file-upload-label ${filePath ? "has-file" : ""}`}
          title="Upload dataset"
          style={{ cursor: uploading ? "wait" : "pointer" }}
        >
          {uploading
            ? <span className="spinner dark" style={{ width: 11, height: 11 }} />
            : <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 8V2M4 4l2-2 2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 10h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
          }
          {uploading ? "Uploading…" : filePath ? "Uploaded ✓" : "Upload dataset"}
          <input
            ref={fileInputRef}
            className="file-upload-input"
            type="file"
            onChange={handleFileUpload}
            accept=".csv,.xlsx,.xls"
            disabled={uploading}
          />
        </label>
      </div>

      {/* Upload error banner */}
      {uploadError && (
        <div style={{
          background: "#fef2f2", border: "1px solid rgba(239,68,68,0.25)",
          color: "#b91c1c", borderRadius: "var(--radius-sm)",
          padding: "8px 12px", fontSize: "12px", marginBottom: "8px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span>⚠ Upload failed: {uploadError}</span>
          <button
            onClick={() => setUploadError(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#b91c1c", fontSize: "14px", lineHeight: 1 }}
          >×</button>
        </div>
      )}

      {/* Input box */}
      <div
        className={`chat-input-wrap ${sendDisabled ? "disabled" : ""}`}
        style={{
          flexDirection: "column", alignItems: "stretch", gap: 0,
          padding: fileName ? "10px 12px 10px 14px" : "12px 12px 12px 16px",
        }}
      >
        {/* File chip inside the input box */}
        {fileName && (
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            marginBottom: "8px", paddingBottom: "8px",
            borderBottom: "1px solid var(--border)",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "7px",
              background: "var(--bg-secondary)", border: "1px solid var(--border)",
              borderRadius: "8px", padding: "5px 10px 5px 8px", maxWidth: "260px",
            }}>
              {getFileIcon(fileName)}
              <span style={{
                fontSize: "12px", fontFamily: "var(--font-mono)",
                color: filePath ? "var(--accent)" : "var(--text-secondary)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "180px",
              }}>
                {fileName}
              </span>
              {uploading && <span className="spinner dark" style={{ width: 10, height: 10, flexShrink: 0 }} />}
              {filePath && !uploading && (
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M2 5.5l2.5 2.5 4.5-5" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>

            <button
              onClick={removeFile}
              title="Remove file"
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", display: "flex", alignItems: "center",
                padding: "3px", borderRadius: "4px",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--text)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M3.5 3.5l6 6M9.5 3.5l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* Textarea + send button row */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            value={value}
            onChange={autoResize}
            onKeyDown={handleKeyDown}
            placeholder={filePath ? "Ask about your dataset…" : "Ask anything or upload a dataset…"}
            disabled={disabled}
            rows={1}
            style={{ height: "auto", minHeight: "24px" }}
          />
          <button
            className={`send-btn ${!sendDisabled ? "active" : ""}`}
            onClick={handleSubmit}
            disabled={sendDisabled}
            title={uploading ? "Wait for upload to finish…" : "Send message"}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 12V4M4 8l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}