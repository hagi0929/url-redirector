package useragent

import "strings"

func Parse(ua string) (browser, os string) {
	return ParseBrowser(ua), ParseOS(ua)
}

func ParseBrowser(ua string) string {
	if ua == "" {
		return "Unknown"
	}
	switch {
	case strings.Contains(ua, "Edg/"), strings.Contains(ua, "Edge/"):
		return "Edge"
	case strings.Contains(ua, "OPR/"), strings.Contains(ua, "Opera"):
		return "Opera"
	case strings.Contains(ua, "Firefox/"):
		return "Firefox"
	case strings.Contains(ua, "Chrome/"):
		return "Chrome"
	case strings.Contains(ua, "Safari/"):
		return "Safari"
	case strings.Contains(ua, "curl/"):
		return "curl"
	case strings.Contains(ua, "Wget/"):
		return "Wget"
	case strings.Contains(ua, "bot"), strings.Contains(ua, "Bot"), strings.Contains(ua, "spider"):
		return "Bot"
	}
	return "Other"
}

func ParseOS(ua string) string {
	if ua == "" {
		return "Unknown"
	}
	switch {
	case strings.Contains(ua, "iPhone"), strings.Contains(ua, "iPad"), strings.Contains(ua, "iOS"):
		return "iOS"
	case strings.Contains(ua, "Android"):
		return "Android"
	case strings.Contains(ua, "Windows"):
		return "Windows"
	case strings.Contains(ua, "Mac OS X"), strings.Contains(ua, "Macintosh"):
		return "macOS"
	case strings.Contains(ua, "CrOS"):
		return "ChromeOS"
	case strings.Contains(ua, "Linux"):
		return "Linux"
	}
	return "Other"
}

func ParseReferrer(referer string) string {
	if referer == "" {
		return "direct"
	}
	s := referer
	if i := strings.Index(s, "://"); i >= 0 {
		s = s[i+3:]
	}
	if i := strings.IndexAny(s, "/?#"); i >= 0 {
		s = s[:i]
	}
	s = strings.TrimPrefix(s, "www.")
	if s == "" {
		return "direct"
	}
	return strings.ToLower(s)
}
