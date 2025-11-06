package main

import (
	"log"
	"net/http"
	"time"

	"dotmostbox/internal/apis"
	"dotmostbox/internal/files"
	"dotmostbox/internal/mp"
	"dotmostbox/internal/sse"

	shell "github.com/ipfs/go-ipfs-api"
)

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

	// 静态站点：优先环境变量，其次嵌入资源，再回退到可执行目录与工作目录
	setupStatic(mux)

	go func() {
		mp.InitIP()
		ticker := time.NewTicker(time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			mp.InitIP()
		}
	}()

	address := mp.ListenAddress()
	log.Println("Server listening on", address)
	if err := http.ListenAndServe(address, handler); err != nil {
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

// removed normalizeBase: we now pass full URL directly to NewShell
