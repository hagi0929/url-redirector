package admin

import (
	"context"
	"net/http"
	"sort"
	"time"

	"github.com/danielgtaylor/huma/v2"

	"github.com/hagi0929/url-redirector/internal/redirect"
	"github.com/hagi0929/url-redirector/internal/storage"
)

const defaultTopN = 10

type statsOutput struct {
	Body struct {
		TotalRedirects int                 `json:"total_redirects" doc:"Total number of configured redirects"`
		TotalHits      int64               `json:"total_hits" doc:"Sum of hit counts across all redirects"`
		FavoriteCount  int                 `json:"favorite_count" doc:"Number of starred redirects"`
		HitsLast24h    int64               `json:"hits_last_24h" doc:"Total hits across all redirects in the last 24 hours"`
		ActiveSlugs24h int                 `json:"active_slugs_24h" doc:"Number of distinct slugs accessed in the last 24 hours"`
		TopSlugs       []redirect.Redirect `json:"top_slugs" doc:"Top redirects by hit count"`
		Recent         []redirect.Redirect `json:"recent" doc:"Most recently created redirects"`
		Favorites      []redirect.Redirect `json:"favorites" doc:"Starred redirects"`
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
		out.Body.Favorites = []redirect.Redirect{}

		cutoff := time.Now().UTC().Add(-24 * time.Hour)
		var (
			totalHits   int64
			favorites   []redirect.Redirect
			active24h   = map[string]bool{}
			hits24Total int64
		)

		for _, r := range items {
			totalHits += r.HitCount
			if r.Favorite {
				favorites = append(favorites, r)
			}
			if !r.LastAccessed.IsZero() && r.LastAccessed.After(cutoff) {
				active24h[r.Slug] = true
			}
		}

		// Hits in last 24h: read per-slug metrics
		for _, r := range items {
			m, err := store.Metrics(r.Slug)
			if err != nil {
				continue
			}
			for ts, c := range m.HourlyHits {
				t, err := time.Parse("2006-01-02T15", ts)
				if err != nil {
					continue
				}
				if t.After(cutoff.Truncate(time.Hour)) {
					hits24Total += c
				}
			}
		}

		out.Body.TotalRedirects = len(items)
		out.Body.TotalHits = totalHits
		out.Body.FavoriteCount = len(favorites)
		out.Body.HitsLast24h = hits24Total
		out.Body.ActiveSlugs24h = len(active24h)

		if len(items) == 0 {
			return out, nil
		}

		byHits := append(make([]redirect.Redirect, 0, len(items)), items...)
		sort.Slice(byHits, func(i, j int) bool { return byHits[i].HitCount > byHits[j].HitCount })
		byRecent := append(make([]redirect.Redirect, 0, len(items)), items...)
		sort.Slice(byRecent, func(i, j int) bool { return byRecent[i].CreatedAt.After(byRecent[j].CreatedAt) })
		sort.Slice(favorites, func(i, j int) bool { return favorites[i].HitCount > favorites[j].HitCount })

		n := defaultTopN
		if n > len(items) {
			n = len(items)
		}
		out.Body.TopSlugs = byHits[:n]
		out.Body.Recent = byRecent[:n]
		out.Body.Favorites = favorites
		return out, nil
	})
}
