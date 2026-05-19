package admin

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
)

type configOutput struct {
	Body struct {
		PublicBaseURL string `json:"public_base_url" doc:"Base URL of the public redirect server (used by the dashboard to render short URLs). Empty means the dashboard falls back to window.location.origin."`
	}
}

func registerConfigRoute(api huma.API, publicBaseURL string) {
	huma.Register(api, huma.Operation{
		OperationID: "get-dashboard-config",
		Method:      http.MethodGet,
		Path:        "/api/config",
		Summary:     "Dashboard configuration",
		Tags:        []string{"config"},
	}, func(_ context.Context, _ *struct{}) (*configOutput, error) {
		out := &configOutput{}
		out.Body.PublicBaseURL = publicBaseURL
		return out, nil
	})
}
