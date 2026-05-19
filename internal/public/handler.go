package public

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/hagi0929/url-redirector/internal/storage"
)

func NewHandler(store *storage.Store, fallbackURL string) http.Handler {
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

		go func(s string) {
			if err := store.IncrementHit(s); err != nil {
				slog.Warn("increment hit failed", "slug", s, "err", err)
			}
		}(slug)

		status := red.StatusCode
		if status == 0 {
			status = http.StatusFound
		}
		http.Redirect(w, r, red.TargetURL, status)
	})

	return mux
}
