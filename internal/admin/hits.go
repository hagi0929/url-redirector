package admin

import (
	"context"
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"

	"github.com/hagi0929/url-redirector/internal/redirect"
	"github.com/hagi0929/url-redirector/internal/storage"
)

type hitLogInput struct {
	Slug    string `query:"slug" doc:"Filter by slug"`
	Country string `query:"country" doc:"Filter by ISO-3166 alpha-2 country code"`
	Since   string `query:"since" doc:"RFC3339 lower bound (inclusive)"`
	Until   string `query:"until" doc:"RFC3339 upper bound (inclusive)"`
	Limit   int    `query:"limit" minimum:"1" maximum:"2000" default:"200" doc:"Maximum events to return (most recent first)"`
}

type hitLogOutput struct {
	Body struct {
		Items []redirect.HitEvent `json:"items"`
		Total int                 `json:"total"`
	}
}

type geoAggOutput struct {
	Body struct {
		Counts map[string]int64 `json:"counts" doc:"ISO-3166 alpha-2 code → hit count (?? for unknown)"`
		Total  int64            `json:"total"`
	}
}

func registerHitLogRoutes(api huma.API, store *storage.Store) {
	huma.Register(api, huma.Operation{
		OperationID: "list-hit-events",
		Method:      http.MethodGet,
		Path:        "/api/hits",
		Summary:     "Query the hit event log",
		Tags:        []string{"stats"},
	}, func(_ context.Context, in *hitLogInput) (*hitLogOutput, error) {
		filter := storage.HitLogFilter{
			Slug:    in.Slug,
			Country: in.Country,
			Limit:   in.Limit,
		}
		if in.Since != "" {
			t, err := time.Parse(time.RFC3339, in.Since)
			if err != nil {
				return nil, huma.Error400BadRequest("invalid since timestamp")
			}
			filter.Since = t
		}
		if in.Until != "" {
			t, err := time.Parse(time.RFC3339, in.Until)
			if err != nil {
				return nil, huma.Error400BadRequest("invalid until timestamp")
			}
			filter.Until = t
		}
		events, err := store.HitLog(filter)
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to query hit log", err)
		}
		out := &hitLogOutput{}
		out.Body.Items = events
		out.Body.Total = len(events)
		return out, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "geo-aggregate",
		Method:      http.MethodGet,
		Path:        "/api/hits/geo",
		Summary:     "Hit counts grouped by country",
		Tags:        []string{"stats"},
	}, func(_ context.Context, in *hitLogInput) (*geoAggOutput, error) {
		filter := storage.HitLogFilter{Slug: in.Slug}
		if in.Since != "" {
			t, err := time.Parse(time.RFC3339, in.Since)
			if err != nil {
				return nil, huma.Error400BadRequest("invalid since timestamp")
			}
			filter.Since = t
		}
		if in.Until != "" {
			t, err := time.Parse(time.RFC3339, in.Until)
			if err != nil {
				return nil, huma.Error400BadRequest("invalid until timestamp")
			}
			filter.Until = t
		}
		counts, err := store.GeoAggregate(filter)
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to aggregate geo data", err)
		}
		out := &geoAggOutput{}
		out.Body.Counts = counts
		var total int64
		for _, c := range counts {
			total += c
		}
		out.Body.Total = total
		return out, nil
	})
}
