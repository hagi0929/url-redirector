package admin

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humago"

	"github.com/hagi0929/url-redirector/internal/hits"
	"github.com/hagi0929/url-redirector/internal/redirect"
	"github.com/hagi0929/url-redirector/internal/storage"
)

func NewHandler(store *storage.Store, buf *hits.Buffer, dashboardFS fs.FS, publicBaseURL string) http.Handler {
	mux := http.NewServeMux()

	config := huma.DefaultConfig("URL Redirector Admin API", "1.0.0")
	config.Info.Description = "Manage URL redirects served by the public redirect endpoint."
	config.DocsPath = "/docs"
	config.DocsRenderer = huma.DocsRendererScalar

	api := humago.New(mux, config)
	registerCRUDRoutes(api, store)
	registerStatsRoute(api, store)
	registerMetricsRoutes(api, store, buf)
	registerHitLogRoutes(api, store)
	registerConfigRoute(api, publicBaseURL)

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	mux.Handle("GET /", newDashboardHandler(dashboardFS))
	return mux
}

type listOutput struct {
	Body struct {
		Items []redirect.Redirect `json:"items"`
		Total int                 `json:"total"`
	}
}

type slugInput struct {
	Slug string `path:"slug" doc:"Slug identifier" example:"gh"`
}

type redirectOutput struct {
	Body redirect.Redirect
}

type createInput struct {
	Body struct {
		Slug       string `json:"slug" minLength:"1" maxLength:"128" pattern:"^[a-zA-Z0-9][a-zA-Z0-9_-]*$" doc:"URL path segment" example:"gh"`
		TargetURL  string `json:"target_url" format:"uri" minLength:"1" doc:"Destination URL" example:"https://github.com"`
		StatusCode int    `json:"status_code,omitempty" enum:"301,302,303,307,308" default:"302" doc:"HTTP redirect status code"`
	}
}

type updateInput struct {
	Slug string `path:"slug" doc:"Slug identifier" example:"gh"`
	Body struct {
		TargetURL  string `json:"target_url,omitempty" format:"uri" doc:"New destination URL"`
		StatusCode int    `json:"status_code,omitempty" enum:"301,302,303,307,308" doc:"HTTP redirect status code"`
	}
}

func registerCRUDRoutes(api huma.API, store *storage.Store) {
	huma.Register(api, huma.Operation{
		OperationID: "list-redirects",
		Method:      http.MethodGet,
		Path:        "/api/redirects",
		Summary:     "List all redirects",
		Tags:        []string{"redirects"},
	}, func(_ context.Context, _ *struct{}) (*listOutput, error) {
		items, err := store.List()
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to list redirects", err)
		}
		out := &listOutput{}
		out.Body.Items = items
		out.Body.Total = len(items)
		return out, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-redirect",
		Method:      http.MethodGet,
		Path:        "/api/redirects/{slug}",
		Summary:     "Get a redirect by slug",
		Tags:        []string{"redirects"},
	}, func(_ context.Context, in *slugInput) (*redirectOutput, error) {
		r, err := store.Get(in.Slug)
		if err != nil {
			if errors.Is(err, storage.ErrNotFound) {
				return nil, huma.Error404NotFound(fmt.Sprintf("slug %q not found", in.Slug))
			}
			return nil, huma.Error500InternalServerError("failed to get redirect", err)
		}
		return &redirectOutput{Body: r}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "create-redirect",
		Method:        http.MethodPost,
		Path:          "/api/redirects",
		Summary:       "Create a redirect",
		Tags:          []string{"redirects"},
		DefaultStatus: http.StatusCreated,
	}, func(_ context.Context, in *createInput) (*redirectOutput, error) {
		status := in.Body.StatusCode
		if status == 0 {
			status = http.StatusFound
		}
		r := redirect.Redirect{
			Slug:       in.Body.Slug,
			TargetURL:  in.Body.TargetURL,
			StatusCode: status,
		}
		created, err := store.Create(r)
		if err != nil {
			if errors.Is(err, storage.ErrAlreadyExists) {
				return nil, huma.Error409Conflict(fmt.Sprintf("slug %q already exists", r.Slug))
			}
			return nil, huma.Error500InternalServerError("failed to create redirect", err)
		}
		return &redirectOutput{Body: created}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "update-redirect",
		Method:      http.MethodPut,
		Path:        "/api/redirects/{slug}",
		Summary:     "Update a redirect",
		Tags:        []string{"redirects"},
	}, func(_ context.Context, in *updateInput) (*redirectOutput, error) {
		if in.Body.TargetURL == "" && in.Body.StatusCode == 0 {
			return nil, huma.Error400BadRequest("at least one of target_url or status_code must be provided")
		}
		r, err := store.Update(in.Slug, in.Body.TargetURL, in.Body.StatusCode)
		if err != nil {
			if errors.Is(err, storage.ErrNotFound) {
				return nil, huma.Error404NotFound(fmt.Sprintf("slug %q not found", in.Slug))
			}
			return nil, huma.Error500InternalServerError("failed to update redirect", err)
		}
		return &redirectOutput{Body: r}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "delete-redirect",
		Method:        http.MethodDelete,
		Path:          "/api/redirects/{slug}",
		Summary:       "Delete a redirect",
		Tags:          []string{"redirects"},
		DefaultStatus: http.StatusNoContent,
	}, func(_ context.Context, in *slugInput) (*struct{}, error) {
		if err := store.Delete(in.Slug); err != nil {
			if errors.Is(err, storage.ErrNotFound) {
				return nil, huma.Error404NotFound(fmt.Sprintf("slug %q not found", in.Slug))
			}
			return nil, huma.Error500InternalServerError("failed to delete redirect", err)
		}
		return nil, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "rename-redirect",
		Method:      http.MethodPost,
		Path:        "/api/redirects/{slug}/rename",
		Summary:     "Change a redirect's slug, preserving hit count and metrics",
		Tags:        []string{"redirects"},
	}, func(_ context.Context, in *struct {
		Slug string `path:"slug" doc:"Current slug" example:"gh"`
		Body struct {
			NewSlug string `json:"new_slug" minLength:"1" maxLength:"128" pattern:"^[a-zA-Z0-9][a-zA-Z0-9_-]*$" doc:"New slug" example:"github"`
		}
	}) (*redirectOutput, error) {
		r, err := store.Rename(in.Slug, in.Body.NewSlug)
		if err != nil {
			if errors.Is(err, storage.ErrNotFound) {
				return nil, huma.Error404NotFound(fmt.Sprintf("slug %q not found", in.Slug))
			}
			if errors.Is(err, storage.ErrAlreadyExists) {
				return nil, huma.Error409Conflict(fmt.Sprintf("slug %q already exists", in.Body.NewSlug))
			}
			return nil, huma.Error500InternalServerError("failed to rename redirect", err)
		}
		return &redirectOutput{Body: r}, nil
	})
}
