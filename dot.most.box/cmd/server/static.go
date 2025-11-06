package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// Embed all files under ./out for single-file distribution
//
//go:embed out/**
var embeddedFS embed.FS

// setupStatic registers the document root handler on mux with precedence:
// 1) MOSTBOX_STATIC_DIR env if valid dir
// 2) embedded ./out contents
// 3) executable directory ./out
// 4) working directory ./out
func setupStatic(mux *http.ServeMux) {
	// 1) environment override
	if env := strings.TrimSpace(os.Getenv("MOSTBOX_STATIC_DIR")); env != "" {
		if fi, err := os.Stat(env); err == nil && fi.IsDir() {
			log.Println("Serving static from", env)
			mux.Handle("/", http.FileServer(http.Dir(env)))
			return
		}
		log.Println("MOSTBOX_STATIC_DIR is not a directory:", env)
	}

	// 2) embedded files
	if sub, err := fs.Sub(embeddedFS, "out"); err == nil {
		log.Println("Serving static from embedded /out")
		mux.Handle("/", http.FileServer(http.FS(sub)))
		return
	}

	// 3) executable dir ./out
	if exe, err := os.Executable(); err == nil {
		exeOut := filepath.Join(filepath.Dir(exe), "out")
		if fi, err := os.Stat(exeOut); err == nil && fi.IsDir() {
			log.Println("Serving static from", exeOut)
			mux.Handle("/", http.FileServer(http.Dir(exeOut)))
			return
		}
	}

	// 4) working dir ./out
	if wd, err := os.Getwd(); err == nil {
		wdOut := filepath.Join(wd, "out")
		if fi, err := os.Stat(wdOut); err == nil && fi.IsDir() {
			log.Println("Serving static from", wdOut)
			mux.Handle("/", http.FileServer(http.Dir(wdOut)))
			return
		}
	}
	log.Println("Static site not found; '/' not served")
}
