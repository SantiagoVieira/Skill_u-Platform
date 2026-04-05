"use client";

interface Props {
  title:         string;
  message:       string;
  confirmLabel?: string;
  onConfirm:     () => void;
  onCancel:      () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = "Eliminar",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-box" style={{ maxWidth: 420 }}>

        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "#fef2f2",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9"  x2="12"    y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <span className="modal-title">{title}</span>
          </div>
          <button className="modal-close-btn" onClick={onCancel}>✕</button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: 13, color: "var(--gray-600)", lineHeight: 1.6, margin: 0 }}>
            {message}
          </p>
        </div>

        <div className="modal-footer">
          <button className="modal-btn-cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              height: 36, padding: "0 18px",
              background: "#ef4444", color: "white",
              border: "none", borderRadius: "var(--radius-md)",
              fontFamily: "DM Sans, sans-serif",
              fontSize: 12, fontWeight: 500, cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#dc2626"}
            onMouseLeave={e => e.currentTarget.style.background = "#ef4444"}
          >
            {confirmLabel}
          </button>
        </div>

      </div>
    </div>
  );
}