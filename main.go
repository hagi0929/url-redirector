package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
)

var redirects map[string]string

func loadRedirects(filePath string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	byteValue, err := ioutil.ReadAll(file)
	if err != nil {
		return err
	}

	err = json.Unmarshal(byteValue, &redirects)
	if err != nil {
		return err
	}

	return nil
}

func redirectHandler(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path[1:] // Get the URL path without leading "/"

	if dest, ok := redirects[path]; ok {
		http.Redirect(w, r, dest, http.StatusMovedPermanently)
	} else {
		w.WriteHeader(http.StatusNotFound)
		fmt.Fprintln(w, "Invalid link")
	}
}

func main() {
	err := loadRedirects("redirects.json")
	if err != nil {
		log.Fatalf("Error loading redirects: %v", err)
	}

	http.HandleFunc("/", redirectHandler)

	log.Println("Starting server on :8080...")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}
