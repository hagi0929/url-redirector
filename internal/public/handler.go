package public

import (
	"errors"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/hagi0929/url-redirector/internal/geo"
	"github.com/hagi0929/url-redirector/internal/hits"
	"github.com/hagi0929/url-redirector/internal/redirect"
	"github.com/hagi0929/url-redirector/internal/storage"
	"github.com/hagi0929/url-redirector/internal/useragent"
)

func NewHandler(store *storage.Store, buf *hits.Buffer, geoLookup *geo.Lookup, fallbackURL string) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		slug := strings.TrimPrefix(r.URL.Path, "/")
		if slug == "" {
			if fallbackURL != "" {
				http.Redirect(w, r, fallbackURL, http.StatusFound)
				return
			}
			http.NotFound(w, r)
			return
		}
		red, err := store.Get(slug)
		if err != nil {
			if errors.Is(err, storage.ErrNotFound) {
				if fallbackURL != "" {
					http.Redirect(w, r, fallbackURL, http.StatusFound)
					return
				}
				http.NotFound(w, r)
				return
			}
			slog.Error("redirect lookup failed", "slug", slug, "err", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		ua := r.UserAgent()
		browser, os := useragent.Parse(ua)
		ip := clientIP(r)
		code, name := geoLookup.Country(ip)
		ev := redirect.HitEvent{
			At:          time.Now().UTC(),
			Slug:        slug,
			Target:      red.TargetURL,
			Browser:     browser,
			OS:          os,
			Referrer:    useragent.ParseReferrer(r.Referer()),
			IP:          ip,
			CountryCode: code,
			CountryName: name,
			UserAgent:   ua,
		}
		if buf != nil {
			buf.Push(ev)
		}
		go func(e redirect.HitEvent) {
			if err := store.RecordHit(e); err != nil {
				slog.Warn("record hit failed", "slug", e.Slug, "err", err)
			}
		}(ev)

		status := red.StatusCode
		if status == 0 {
			status = http.StatusFound
		}
		http.Redirect(w, r, red.TargetURL, status)
	})

	return mux
}

func clientIP(r *http.Request) string {
	if v := r.Header.Get("X-Forwarded-For"); v != "" {
		if i := strings.IndexByte(v, ','); i >= 0 {
			v = v[:i]
		}
		return strings.TrimSpace(v)
	}
	if v := r.Header.Get("X-Real-Ip"); v != "" {
		return strings.TrimSpace(v)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
