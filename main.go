package main

import (
	"context"
	"embed"
	"errors"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/hagi0929/url-redirector/internal/admin"
	"github.com/hagi0929/url-redirector/internal/geo"
	"github.com/hagi0929/url-redirector/internal/hits"
	"github.com/hagi0929/url-redirector/internal/public"
	"github.com/hagi0929/url-redirector/internal/storage"
)

//go:embed all:web/dist
var dashboardFS embed.FS

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	redirectAddr := ":" + envOr("HOST_PORT", "8080")
	adminAddr := ":" + envOr("ADMIN_HOST_PORT", "8081")
	dbPath := envOr("DB_PATH", "/data/redirects.db")
	fallbackURL := os.Getenv("FALLBACK_URL")

	store, err := storage.Open(dbPath)
	if err != nil {
		slog.Error("failed to open store", "path", dbPath, "err", err)
		os.Exit(1)
	}
	defer func() { _ = store.Close() }()

	geoLookup := geo.Open(envOr("GEOIP_DB", "/data/dbip-country-lite.mmdb"))
	defer geoLookup.Close()

	dist, err := fs.Sub(dashboardFS, "web/dist")
	if err != nil {
		slog.Error("dashboard fs init failed", "err", err)
		os.Exit(1)
	}

	hitBuffer := hits.New(500)

	pruneCtx, stopPruner := context.WithCancel(context.Background())
	defer stopPruner()
	go runHitLogPruner(pruneCtx, store)

	publicSrv := &http.Server{
		Addr:              redirectAddr,
		Handler:           public.NewHandler(store, hitBuffer, geoLookup, fallbackURL),
		ReadHeaderTimeout: 5 * time.Second,
	}
	publicBaseURL := os.Getenv("PUBLIC_BASE_URL")
	adminSrv := &http.Server{
		Addr:              adminAddr,
		Handler:           admin.NewHandler(store, hitBuffer, dist, publicBaseURL),
		ReadHeaderTimeout: 5 * time.Second,
	}

	go serve("redirect", publicSrv)
	go serve("admin", adminSrv)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	<-ctx.Done()

	slog.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = publicSrv.Shutdown(shutdownCtx)
	_ = adminSrv.Shutdown(shutdownCtx)
}

func serve(name string, srv *http.Server) {
	slog.Info("server listening", "name", name, "addr", srv.Addr)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		slog.Error("server failed", "name", name, "err", err)
		os.Exit(1)
	}
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func runHitLogPruner(ctx context.Context, store *storage.Store) {
	ticker := time.NewTicker(6 * time.Hour)
	defer ticker.Stop()
	prune := func() {
		removed, err := store.PruneHitLog(storage.HitLogRetention)
		if err != nil {
			slog.Warn("hit log prune failed", "err", err)
			return
		}
		if removed > 0 {
			slog.Info("hit log pruned", "removed", removed)
		}
	}
	prune()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			prune()
		}
	}
}
