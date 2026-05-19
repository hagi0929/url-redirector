package redirect

import "time"

type Redirect struct {
	Slug         string    `json:"slug" doc:"URL path segment used as the redirect key" example:"gh"`
	TargetURL    string    `json:"target_url" doc:"Destination URL" example:"https://github.com"`
	StatusCode   int       `json:"status_code" doc:"HTTP redirect status code" example:"302"`
	HitCount     int64     `json:"hit_count" doc:"Number of times this redirect was followed" readOnly:"true"`
	Favorite     bool      `json:"favorite" doc:"Whether the user has starred this redirect"`
	LastAccessed time.Time `json:"last_accessed,omitempty" doc:"Most recent hit timestamp (UTC)" readOnly:"true"`
	CreatedAt    time.Time `json:"created_at" doc:"Creation timestamp (UTC)" readOnly:"true"`
	UpdatedAt    time.Time `json:"updated_at" doc:"Last update timestamp (UTC)" readOnly:"true"`
}

type HitEvent struct {
	At        time.Time `json:"at"`
	Slug      string    `json:"slug"`
	Target    string    `json:"target"`
	Browser   string    `json:"browser"`
	OS        string    `json:"os"`
	Referrer  string    `json:"referrer"`
	UserAgent string    `json:"-"`
}

type Metrics struct {
	Slug         string           `json:"slug"`
	LastAccessed time.Time        `json:"last_accessed,omitempty"`
	DailyHits    map[string]int64 `json:"daily_hits"`
	HourlyHits   map[string]int64 `json:"hourly_hits"`
	Browsers     map[string]int64 `json:"browsers"`
	OSes         map[string]int64 `json:"oses"`
	Referrers    map[string]int64 `json:"referrers"`
}

func NewMetrics(slug string) Metrics {
	return Metrics{
		Slug:       slug,
		DailyHits:  map[string]int64{},
		HourlyHits: map[string]int64{},
		Browsers:   map[string]int64{},
		OSes:       map[string]int64{},
		Referrers:  map[string]int64{},
	}
}
