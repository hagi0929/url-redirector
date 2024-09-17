package main

import (
	"log"
	"net/http"
)

// A map to hold the redirect URLs
var redirects = map[string]string{
	"github":       "https://github.com/hagi0929",
	"portfolio":    "https://jaehak.me",
	"linkedin":     "https://www.linkedin.com/in/ha-gi/",
	"algowarriors": "https://www.linkedin.com/feed/",
}

func redirectHandler(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path[1:]

	if dest, ok := redirects[path]; ok {
		http.Redirect(w, r, dest, http.StatusMovedPermanently)
	} else {
		http.NotFound(w, r)
	}
}

func main() {
	http.HandleFunc("/", redirectHandler)

	log.Println("Starting server on :8080...")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}
