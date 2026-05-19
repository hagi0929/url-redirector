package admin

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/danielgtaylor/huma/v2"

	"github.com/hagi0929/url-redirector/internal/hits"
	"github.com/hagi0929/url-redirector/internal/redirect"
	"github.com/hagi0929/url-redirector/internal/storage"
)

type metricsOutput struct {
	Body redirect.Metrics
}

type recentOutput struct {
	Body struct {
		Items []redirect.HitEvent `json:"items"`
	}
}

type favoriteInput struct {
	Slug string `path:"slug" doc:"Slug identifier" example:"gh"`
	Body struct {
		Favorite bool `json:"favorite" doc:"Whether to mark this redirect as a favorite"`
	}
}

func registerMetricsRoutes(api huma.API, store *storage.Store, buf *hits.Buffer) {
	huma.Register(api, huma.Operation{
		OperationID: "get-redirect-metrics",
		Method:      http.MethodGet,
		Path:        "/api/redirects/{slug}/metrics",
		Summary:     "Get detailed metrics for a redirect",
		Tags:        []string{"metrics"},
	}, func(_ context.Context, in *slugInput) (*metricsOutput, error) {
		m, err := store.Metrics(in.Slug)
		if err != nil {
			if errors.Is(err, storage.ErrNotFound) {
				return nil, huma.Error404NotFound(fmt.Sprintf("slug %q not found", in.Slug))
			}
			return nil, huma.Error500InternalServerError("failed to load metrics", err)
		}
		return &metricsOutput{Body: m}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "set-redirect-favorite",
		Method:      http.MethodPut,
		Path:        "/api/redirects/{slug}/favorite",
		Summary:     "Toggle redirect favorite flag",
		Tags:        []string{"redirects"},
	}, func(_ context.Context, in *favoriteInput) (*redirectOutput, error) {
		r, err := store.SetFavorite(in.Slug, in.Body.Favorite)
		if err != nil {
			if errors.Is(err, storage.ErrNotFound) {
				return nil, huma.Error404NotFound(fmt.Sprintf("slug %q not found", in.Slug))
			}
			return nil, huma.Error500InternalServerError("failed to update favorite", err)
		}
		return &redirectOutput{Body: r}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-recent-hits",
		Method:      http.MethodGet,
		Path:        "/api/recent-hits",
		Summary:     "Get the most recent redirect hits",
		Tags:        []string{"metrics"},
	}, func(_ context.Context, _ *struct{}) (*recentOutput, error) {
		out := &recentOutput{}
		out.Body.Items = []redirect.HitEvent{}
		if buf != nil {
			out.Body.Items = buf.Recent(200)
		}
		return out, nil
	})
}
