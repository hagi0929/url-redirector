package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/hagi0929/url-redirector/internal/admin"
	"github.com/hagi0929/url-redirector/internal/public"
	"github.com/hagi0929/url-redirector/internal/storage"
)

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

	publicSrv := &http.Server{
		Addr:              redirectAddr,
		Handler:           public.NewHandler(store, fallbackURL),
		ReadHeaderTimeout: 5 * time.Second,
	}
	adminSrv := &http.Server{
		Addr:              adminAddr,
		Handler:           admin.NewHandler(store),
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
