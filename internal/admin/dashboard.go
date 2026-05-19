package admin

import (
	"io/fs"
	"net/http"
	"strings"
)

const stubHTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>URL Redirector</title>
<style>
body { font-family: system-ui, sans-serif; background: #0b0d12; color: #e6e8ee; padding: 4rem 2rem; max-width: 640px; margin: 0 auto; line-height: 1.6; }
code { background: #161a23; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, monospace; }
a { color: #7c5cff; }
.box { border: 1px solid #222836; background: #11141b; padding: 1.5rem; border-radius: 12px; margin-top: 1.5rem; }
</style></head><body>
<h1>URL Redirector</h1>
<p>The dashboard UI was not built into this binary.</p>
<div class="box">
<p><strong>To build the dashboard locally:</strong></p>
<pre><code>cd web
npm install
npm run build</code></pre>
<p>Then rebuild the Go binary. The Dockerfile does this automatically.</p>
</div>
<div class="box">
<p>Meanwhile, you can use:</p>
<ul>
  <li><a href="/docs">API documentation</a></li>
  <li><a href="/api/redirects">List redirects (JSON)</a></li>
</ul>
</div>
</body></html>`

func newDashboardHandler(distFS fs.FS) http.Handler {
	fileServer := http.FileServer(http.FS(distFS))
	hasIndex := false
	if f, err := distFS.Open("index.html"); err == nil {
		_ = f.Close()
		hasIndex = true
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if path == "/" || path == "" {
			if !hasIndex {
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				_, _ = w.Write([]byte(stubHTML))
				return
			}
		}
		if strings.HasPrefix(path, "/assets/") {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		}
		fileServer.ServeHTTP(w, r)
	})
}
