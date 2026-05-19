package redirect

import "time"

type Redirect struct {
	Slug       string    `json:"slug" doc:"URL path segment used as the redirect key" example:"gh"`
	TargetURL  string    `json:"target_url" doc:"Destination URL" example:"https://github.com"`
	StatusCode int       `json:"status_code" doc:"HTTP redirect status code" example:"302"`
	HitCount   int64     `json:"hit_count" doc:"Number of times this redirect was followed" readOnly:"true"`
	CreatedAt  time.Time `json:"created_at" doc:"Creation timestamp (UTC)" readOnly:"true"`
	UpdatedAt  time.Time `json:"updated_at" doc:"Last update timestamp (UTC)" readOnly:"true"`
}
