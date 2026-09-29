'use client'

/** Last-resort boundary when the root layout itself fails. Plain styles only. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: '#05070D', color: '#F8FAFC', fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 22 }}>Achilyon hit an unexpected error</h1>
          <p style={{ color: '#94A3B8' }}>Please reload the page.</p>
          <button type="button" onClick={reset} style={{ marginTop: 12, background: '#3B82F6', color: '#fff', border: 0, borderRadius: 10, padding: '10px 18px', cursor: 'pointer' }}>Reload</button>
        </div>
      </body>
    </html>
  )
}
