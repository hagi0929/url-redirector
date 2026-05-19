// Package geo resolves IPv4/IPv6 addresses to ISO 3166-1 alpha-2 country
// codes using a MaxMind-format DB (MaxMind GeoLite2 or db-ip Lite).
//
// Open() never returns an error; if the DB file is missing or unreadable,
// all lookups return ("", "") so the rest of the app keeps working with
// "Unknown" geo data. Fetch a DB with `mise run geo-fetch`.
package geo

import (
	"log/slog"
	"net"
	"os"

	"github.com/oschwald/maxminddb-golang"
)

type Lookup struct {
	r *maxminddb.Reader
}

type record struct {
	Country struct {
		ISOCode string            `maxminddb:"iso_code"`
		Names   map[string]string `maxminddb:"names"`
	} `maxminddb:"country"`
}

func Open(path string) *Lookup {
	if path == "" {
		return &Lookup{}
	}
	if _, err := os.Stat(path); err != nil {
		slog.Info("geo: no DB file, country lookups disabled", "path", path)
		return &Lookup{}
	}
	r, err := maxminddb.Open(path)
	if err != nil {
		slog.Warn("geo: failed to open DB", "path", path, "err", err)
		return &Lookup{}
	}
	slog.Info("geo: DB loaded", "path", path)
	return &Lookup{r: r}
}

func (l *Lookup) Close() {
	if l != nil && l.r != nil {
		_ = l.r.Close()
	}
}

func (l *Lookup) Country(ipStr string) (code, name string) {
	if l == nil || l.r == nil || ipStr == "" {
		return "", ""
	}
	ip := net.ParseIP(ipStr)
	if ip == nil {
		return "", ""
	}
	var rec record
	if err := l.r.Lookup(ip, &rec); err != nil {
		return "", ""
	}
	name = rec.Country.Names["en"]
	return rec.Country.ISOCode, name
}
