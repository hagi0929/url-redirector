package admin

import (
	"context"
	"net/http"
	"sort"

	"github.com/danielgtaylor/huma/v2"

	"github.com/hagi0929/url-redirector/internal/redirect"
	"github.com/hagi0929/url-redirector/internal/storage"
)

const defaultTopN = 10

type statsOutput struct {
	Body struct {
		TotalRedirects int                 `json:"total_redirects" doc:"Total number of configured redirects"`
		TotalHits      int64               `json:"total_hits" doc:"Sum of hit counts across all redirects"`
		TopSlugs       []redirect.Redirect `json:"top_slugs" doc:"Top redirects by hit count"`
		Recent         []redirect.Redirect `json:"recent" doc:"Most recently created redirects"`
	}
}

func registerStatsRoute(api huma.API, store *storage.Store) {
	huma.Register(api, huma.Operation{
		OperationID: "get-stats",
		Method:      http.MethodGet,
		Path:        "/api/stats",
		Summary:     "Get aggregate statistics",
		Tags:        []string{"stats"},
	}, func(_ context.Context, _ *struct{}) (*statsOutput, error) {
		items, err := store.List()
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to list redirects", err)
		}
		out := &statsOutput{}
		out.Body.TopSlugs = []redirect.Redirect{}
		out.Body.Recent = []redirect.Redirect{}

		var total int64
		for _, r := range items {
			total += r.HitCount
		}
		out.Body.TotalRedirects = len(items)
		out.Body.TotalHits = total

		if len(items) == 0 {
			return out, nil
		}

		byHits := append(make([]redirect.Redirect, 0, len(items)), items...)
		sort.Slice(byHits, func(i, j int) bool { return byHits[i].HitCount > byHits[j].HitCount })
		byRecent := append(make([]redirect.Redirect, 0, len(items)), items...)
		sort.Slice(byRecent, func(i, j int) bool { return byRecent[i].CreatedAt.After(byRecent[j].CreatedAt) })

		n := defaultTopN
		if n > len(items) {
			n = len(items)
		}
		out.Body.TopSlugs = byHits[:n]
		out.Body.Recent = byRecent[:n]
		return out, nil
	})
}
