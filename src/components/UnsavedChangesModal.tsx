"use client";

interface UnsavedChangesModalProps {
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  saving?: boolean;
}

export default function UnsavedChangesModal({
  onSave,
  onDiscard,
  onCancel,
  saving = false,
}: UnsavedChangesModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card, #1e1e2e)",
          borderRadius: 16,
          padding: "28px 32px",
          maxWidth: 420,
          width: "90%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          border: "1px solid var(--border-color, #333)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(234,179,8,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <i
              className="fas fa-exclamation-triangle"
              style={{ color: "#eab308", fontSize: 18 }}
            ></i>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Хадгалаагүй өөрчлөлтүүд
            </h3>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 13,
                color: "var(--text-muted)",
              }}
            >
              Та хадгалаагүй өөрчлөлтүүдтэй байна
            </p>
          </div>
        </div>

        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            margin: "0 0 20px",
            lineHeight: 1.5,
          }}
        >
          Энэ хуудаснаас гарахын өмнө өөрчлөлтүүдийг хадгалах уу?
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onDiscard}
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              border: "1px solid var(--border-color, #333)",
              background: "none",
              color: "#ef4444",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Хадгалахгүй
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              border: "1px solid var(--border-color, #333)",
              background: "none",
              color: "var(--text-muted)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Буцах
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            style={{
              padding: "8px 22px",
              borderRadius: 10,
              border: "none",
              background: "var(--primary-color, #F15F22)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <>
                <i
                  className="fas fa-spinner fa-spin"
                  style={{ marginRight: 6 }}
                ></i>
                Хадгалж байна...
              </>
            ) : (
              <>
                <i className="fas fa-save" style={{ marginRight: 6 }}></i>
                Хадгалах
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
