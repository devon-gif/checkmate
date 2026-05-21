import { useEffect, useState } from "react"

// CheckRay popup shell.
// TODO: Wire to CheckRay API at https://checkray.app/api/analyze-case once
// extension auth + rate-limiting story is finalized.

type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; risk: string; summary: string }
  | { status: "error"; message: string }

function IndexPopup() {
  const [tabUrl, setTabUrl] = useState<string>("")
  const [tabTitle, setTabTitle] = useState<string>("")
  const [state, setState] = useState<AnalysisState>({ status: "idle" })

  useEffect(() => {
    // Capture the current tab's URL using activeTab permission.
    // See: https://github.com/GoogleChrome/chrome-extensions-samples — api-samples/tabs
    if (typeof chrome === "undefined" || !chrome.tabs) return
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const t = tabs?.[0]
      if (!t) return
      setTabUrl(t.url ?? "")
      setTabTitle(t.title ?? "")
    })
  }, [])

  async function handleAnalyze() {
    setState({ status: "loading" })
    try {
      // TODO: replace placeholder with real CheckRay API call.
      // Example shape:
      //   const res = await fetch("https://checkray.app/api/analyze-case", {
      //     method: "POST",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({ kind: "url", input: tabUrl })
      //   })
      await new Promise((r) => setTimeout(r, 600))
      setState({
        status: "ok",
        risk: "unknown",
        summary:
          "Placeholder result. CheckRay API integration will replace this."
      })
    } catch (err) {
      setState({
        status: "error",
        message:
          err instanceof Error ? err.message : "Could not analyze this page."
      })
    }
  }

  return (
    <div
      style={{
        width: 320,
        padding: 16,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        background: "#0b1110",
        color: "#e6f1ee"
      }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12
        }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: "#7ae2cf",
            boxShadow: "0 0 12px rgba(122,226,207,0.9)"
          }}
        />
        <strong style={{ fontSize: 14, letterSpacing: 0.2 }}>CheckRay</strong>
      </div>

      <div
        style={{
          fontSize: 12,
          color: "rgba(230,241,238,0.6)",
          marginBottom: 4
        }}>
        Current tab
      </div>
      <div
        style={{
          fontSize: 12,
          marginBottom: 4,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis"
        }}
        title={tabTitle}>
        {tabTitle || "—"}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "rgba(230,241,238,0.45)",
          marginBottom: 14,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis"
        }}
        title={tabUrl}>
        {tabUrl || "—"}
      </div>

      <button
        onClick={handleAnalyze}
        disabled={state.status === "loading" || !tabUrl}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid rgba(122,226,207,0.35)",
          background:
            state.status === "loading"
              ? "rgba(122,226,207,0.15)"
              : "linear-gradient(135deg, rgba(122,226,207,0.28), rgba(27,140,119,0.16))",
          color: "#e6f1ee",
          fontSize: 13,
          cursor: state.status === "loading" ? "default" : "pointer"
        }}>
        {state.status === "loading" ? "Analyzing…" : "Analyze this page"}
      </button>

      <div style={{ marginTop: 14, minHeight: 64 }}>
        {state.status === "idle" && (
          <div style={{ fontSize: 12, color: "rgba(230,241,238,0.55)" }}>
            Ray will check this page for common scam, phishing, and ghost-job
            signals.
          </div>
        )}
        {state.status === "ok" && (
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)"
            }}>
            <div
              style={{
                fontSize: 11,
                color: "rgba(122,226,207,0.9)",
                marginBottom: 4
              }}>
              Risk: {state.risk}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.4 }}>{state.summary}</div>
          </div>
        )}
        {state.status === "error" && (
          <div
            style={{
              fontSize: 12,
              color: "#ff9b9b"
            }}>
            {state.message}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 14,
          fontSize: 10,
          color: "rgba(230,241,238,0.35)",
          lineHeight: 1.4
        }}>
      </div>
    </div>
  )
}

export default IndexPopup
