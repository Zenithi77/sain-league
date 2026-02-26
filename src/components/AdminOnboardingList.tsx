"use client";

/**
 * AdminOnboardingList.tsx
 *
 * Reusable admin component that displays a paginated, searchable list of
 * onboarding docs for a given role (kid | coach). Includes a CSV export
 * button that triggers a browser download.
 *
 * Props:
 *   role — 'kid' | 'coach'
 *
 * Fetches data from:
 *   GET  /api/admin/onboarding/list?role=...&pageSize=25&pageToken=...&q=...
 *   GET  /api/admin/onboarding/export?role=...&q=...
 *
 * Requires an admin ID token in the Authorization header. The component
 * uses `useAuth().getIdToken()` to obtain one.
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

// ── Cloud Function base URL ──────────────────────────────────────────────
const FUNCTIONS_BASE_URL =
  process.env.NEXT_PUBLIC_FUNCTIONS_URL ??
  "http://127.0.0.1:5001/YOUR_PROJECT_ID/us-central1";

// ── Types ────────────────────────────────────────────────────────────────
interface OnboardingDoc {
  id: string;
  uid?: string;
  name?: string;
  school?: string;
  grade?: string; // kid
  whyPlay?: string; // kid
  phone?: string; // kid
  hasGym?: boolean; // coach
  hasBalls?: boolean; // coach
  hasScoreboard?: boolean; // coach
  programAvailable?: string; // coach
  scorePointerClock?: boolean; // coach
  notes?: string; // coach
  createdAt?: string | { _seconds: number };
  updatedAt?: string | { _seconds: number };
  [key: string]: unknown;
}

interface ListResponse {
  success: boolean;
  role: string;
  pageSize: number;
  count: number;
  nextPageToken: string | null;
  data: OnboardingDoc[];
}

interface AdminOnboardingListProps {
  role: "kid" | "coach";
}

// ── Helpers ──────────────────────────────────────────────────────────────
function formatTimestamp(val: unknown): string {
  if (!val) return "—";
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString("mn-MN");
  }
  if (typeof val === "object" && val !== null && "_seconds" in val) {
    return new Date(
      (val as { _seconds: number })._seconds * 1000,
    ).toLocaleDateString("mn-MN");
  }
  return String(val);
}

// ── Component ────────────────────────────────────────────────────────────
export default function AdminOnboardingList({
  role,
}: AdminOnboardingListProps) {
  const { getIdToken } = useAuth();

  // Data
  const [docs, setDocs] = useState<OnboardingDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pagination
  const PAGE_SIZE = 25;
  const [pageToken, setPageToken] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [pageHistory, setPageHistory] = useState<(string | null)[]>([null]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Search
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Fetch list ─────────────────────────────────────────────────────────
  const fetchList = useCallback(
    async (token: string | null, q: string) => {
      setLoading(true);
      setError("");
      try {
        const idToken = await getIdToken();
        if (!idToken) throw new Error("Токен авах боломжгүй");

        const params = new URLSearchParams({
          role,
          pageSize: String(PAGE_SIZE),
        });
        if (token) params.set("pageToken", token);
        if (q) params.set("q", q);

        const res = await fetch(
          `${FUNCTIONS_BASE_URL}/api/admin/onboarding/list?${params}`,
          { headers: { Authorization: `Bearer ${idToken}` } },
        );

        if (res.status === 403) throw new Error("Админ эрх шаардлагатай");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `Серверийн алдаа (${res.status})`);
        }

        const json: ListResponse = await res.json();
        setDocs(json.data);
        setNextPageToken(json.nextPageToken);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Алдаа гарлаа");
        setDocs([]);
      } finally {
        setLoading(false);
      }
    },
    [role, getIdToken],
  );

  // Fetch on mount and when pageToken / query changes
  useEffect(() => {
    fetchList(pageToken, query);
  }, [pageToken, query, fetchList]);

  // ── Search handler ─────────────────────────────────────────────────────
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    // Reset pagination when searching
    setPageToken(null);
    setPageHistory([null]);
    setCurrentPageIndex(0);
    setQuery(searchInput.trim());
  }

  function handleClearSearch() {
    setSearchInput("");
    setPageToken(null);
    setPageHistory([null]);
    setCurrentPageIndex(0);
    setQuery("");
  }

  // ── Pagination handlers ────────────────────────────────────────────────
  function handleNextPage() {
    if (!nextPageToken) return;
    const newIndex = currentPageIndex + 1;
    const newHistory = [...pageHistory];
    if (newHistory.length <= newIndex) {
      newHistory.push(nextPageToken);
    }
    setPageHistory(newHistory);
    setCurrentPageIndex(newIndex);
    setPageToken(nextPageToken);
  }

  function handlePrevPage() {
    if (currentPageIndex <= 0) return;
    const newIndex = currentPageIndex - 1;
    setCurrentPageIndex(newIndex);
    setPageToken(pageHistory[newIndex]);
  }

  // ── CSV export ─────────────────────────────────────────────────────────
  async function handleExport() {
    try {
      const idToken = await getIdToken();
      if (!idToken) throw new Error("Токен авах боломжгүй");

      const params = new URLSearchParams({ role });
      if (query) params.set("q", query);

      const res = await fetch(
        `${FUNCTIONS_BASE_URL}/api/admin/onboarding/export?${params}`,
        { headers: { Authorization: `Bearer ${idToken}` } },
      );

      if (!res.ok) throw new Error(`Export алдаа (${res.status})`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `onboarding_${role === "kid" ? "kids" : "coaches"}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Экспортлоход алдаа гарлаа");
    }
  }

  // ── Row expansion ──────────────────────────────────────────────────────
  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // ── Render ─────────────────────────────────────────────────────────────
  const title =
    role === "kid" ? "Тоглогчид (Kids)" : "Дасгалжуулагчид (Coaches)";
  const emptyText =
    role === "kid" ? "Тоглогч олдсонгүй" : "Дасгалжуулагч олдсонгүй";

  return (
    <div className="admin-onboarding-list">
      {/* ── Header row ── */}
      <div className="aol-header">
        <h2 className="aol-title">
          <i
            className={`fas ${role === "kid" ? "fa-basketball-ball" : "fa-clipboard"}`}
          ></i>
          {title}
        </h2>
        <button
          type="button"
          className="aol-export-btn"
          onClick={handleExport}
          title="CSV татах"
        >
          <i className="fas fa-download"></i> CSV татах
        </button>
      </div>

      {/* ── Search bar ── */}
      <form className="aol-search" onSubmit={handleSearch}>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Нэр эсвэл сургуулиар хайх..."
          aria-label="Хайлт"
          className="aol-search-input"
        />
        <button type="submit" className="aol-search-btn" title="Хайх">
          <i className="fas fa-search"></i>
        </button>
        {query && (
          <button
            type="button"
            className="aol-search-clear"
            onClick={handleClearSearch}
            title="Цэвэрлэх"
          >
            <i className="fas fa-times"></i>
          </button>
        )}
      </form>

      {query && (
        <p className="aol-search-tag">
          Хайлт: <strong>{query}</strong>
        </p>
      )}

      {/* ── Error ── */}
      {error && <div className="auth-error">{error}</div>}

      {/* ── Loading ── */}
      {loading && (
        <div className="aol-loading">
          <div className="loading-spinner"></div>
          <p>Ачааллаж байна...</p>
        </div>
      )}

      {/* ── Table ── */}
      {!loading && docs.length > 0 && (
        <div className="aol-table-wrap">
          <table className="aol-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Нэр</th>
                <th>Сургууль</th>
                {role === "kid" && <th>Анги</th>}
                {role === "coach" && <th>Заал</th>}
                {role === "coach" && <th>Бөмбөг</th>}
                <th>Огноо</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc, idx) => (
                <>
                  <tr
                    key={doc.id}
                    className={expandedId === doc.id ? "expanded-row" : ""}
                  >
                    <td>{currentPageIndex * PAGE_SIZE + idx + 1}</td>
                    <td className="aol-name-cell">{doc.name ?? "—"}</td>
                    <td>{doc.school ?? "—"}</td>
                    {role === "kid" && <td>{doc.grade ?? "—"}</td>}
                    {role === "coach" && (
                      <td>
                        <span
                          className={`aol-badge ${doc.hasGym ? "yes" : "no"}`}
                        >
                          {doc.hasGym ? "Тийм" : "Үгүй"}
                        </span>
                      </td>
                    )}
                    {role === "coach" && (
                      <td>
                        <span
                          className={`aol-badge ${doc.hasBalls ? "yes" : "no"}`}
                        >
                          {doc.hasBalls ? "Тийм" : "Үгүй"}
                        </span>
                      </td>
                    )}
                    <td className="aol-date-cell">
                      {formatTimestamp(doc.createdAt)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="aol-expand-btn"
                        onClick={() => toggleExpand(doc.id)}
                        aria-label="Дэлгэрэнгүй"
                        title="Дэлгэрэнгүй"
                      >
                        <i
                          className={`fas fa-chevron-${expandedId === doc.id ? "up" : "down"}`}
                        ></i>
                      </button>
                    </td>
                  </tr>
                  {expandedId === doc.id && (
                    <tr key={`${doc.id}-detail`} className="aol-detail-row">
                      <td colSpan={role === "kid" ? 6 : 7}>
                        <div className="aol-detail">
                          {role === "kid" && (
                            <>
                              <div className="aol-detail-item">
                                <span className="aol-detail-label">
                                  Яагаад тоглохыг хүсч байна:
                                </span>
                                <span>{doc.whyPlay ?? "—"}</span>
                              </div>
                              {doc.phone && (
                                <div className="aol-detail-item">
                                  <span className="aol-detail-label">
                                    Утас:
                                  </span>
                                  <span>{doc.phone}</span>
                                </div>
                              )}
                            </>
                          )}
                          {role === "coach" && (
                            <>
                              <div className="aol-detail-item">
                                <span className="aol-detail-label">
                                  Оноо самбар:
                                </span>
                                <span>
                                  {doc.hasScoreboard ? "Тийм" : "Үгүй"}
                                </span>
                              </div>
                              {doc.programAvailable && (
                                <div className="aol-detail-item">
                                  <span className="aol-detail-label">
                                    Хөтөлбөр:
                                  </span>
                                  <span>{doc.programAvailable}</span>
                                </div>
                              )}
                              {doc.notes && (
                                <div className="aol-detail-item">
                                  <span className="aol-detail-label">
                                    Тэмдэглэл:
                                  </span>
                                  <span>{doc.notes}</span>
                                </div>
                              )}
                            </>
                          )}
                          <div className="aol-detail-item">
                            <span className="aol-detail-label">UID:</span>
                            <span className="aol-uid">{doc.uid ?? doc.id}</span>
                          </div>
                          <div className="aol-detail-item">
                            <span className="aol-detail-label">
                              Шинэчилсэн:
                            </span>
                            <span>{formatTimestamp(doc.updatedAt)}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && docs.length === 0 && !error && (
        <div className="aol-empty">
          <i
            className={`fas ${role === "kid" ? "fa-user-slash" : "fa-clipboard-list"}`}
          ></i>
          <p>{emptyText}</p>
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && (docs.length > 0 || currentPageIndex > 0) && (
        <div className="aol-pagination">
          <button
            type="button"
            className="aol-page-btn"
            onClick={handlePrevPage}
            disabled={currentPageIndex === 0}
          >
            <i className="fas fa-chevron-left"></i> Өмнөх
          </button>
          <span className="aol-page-info">Хуудас {currentPageIndex + 1}</span>
          <button
            type="button"
            className="aol-page-btn"
            onClick={handleNextPage}
            disabled={!nextPageToken}
          >
            Дараах <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      )}
    </div>
  );
}
