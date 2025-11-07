package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"path"
	"strings"
	"time"

	"dotmostbox/internal/apis"
	"dotmostbox/internal/files"
	"dotmostbox/internal/mp"
	"dotmostbox/internal/sse"

	shell "github.com/ipfs/go-ipfs-api"
)

// 嵌入 ./out 目录下的所有静态文件，便于单文件分发
//
//go:embed out/**
var embeddedFS embed.FS

func main() {
	sh := shell.NewShell("http://127.0.0.1:5001")

	if _, err := sh.ID(); err != nil {
		log.Println("IPFS 节点未运行，请启动 IPFS 节点。")
		// os.Exit(1)
	}

	mux := http.NewServeMux()

	// CORS & common middleware
	handler := withCORS(mux)

	// register routes
	files.Register(mux, sh)
	apis.Register(mux, sh)
	sse.Register(mux)

	// 静态站点：仅使用嵌入的 ./out 内容
	setupStatic(mux)

	go func() {
		mp.InitIP()
		ticker := time.NewTicker(time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			mp.InitIP()
		}
	}()

	log.Println("Server listening on", "http://localhost:"+mp.PORT)
	if err := http.ListenAndServe(":"+mp.PORT, handler); err != nil {
		log.Fatal(err)
	}
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("Access-Control-Allow-Origin", "*")
		writer.Header().Set("Access-Control-Allow-Credentials", "true")
		writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if request.Method == http.MethodOptions {
			writer.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(writer, request)
	})
}

// 注册静态站点，使用嵌入的 ./out 内容
func setupStatic(mux *http.ServeMux) {
	if sub, err := fs.Sub(embeddedFS, "out"); err == nil {
		fsrv := http.FileServer(http.FS(sub))
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			// 预检查请求的文件是否存在；不存在则返回嵌入的 404.html
			p := path.Clean(r.URL.Path)
			rel := strings.TrimPrefix(p, "/")
			check := rel
			if strings.HasSuffix(p, "/") || rel == "" {
				check = path.Join(rel, "index.html")
			}

			if f, err := sub.Open(check); err != nil {
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				w.WriteHeader(http.StatusNotFound)
				if data, e := fs.ReadFile(sub, "404.html"); e == nil {
					w.Write(data)
				} else {
					w.Write([]byte("404: page not found"))
				}
				return
			} else {
				f.Close()
			}

			// 文件存在时交由原始文件服务器处理（包含缓存/类型等）
			fsrv.ServeHTTP(w, r)
		})
		return
	}
}
