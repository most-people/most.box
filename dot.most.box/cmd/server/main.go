package main

import (
	"context"
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"dotmostbox/internal/apis"
	"dotmostbox/internal/config"
	"dotmostbox/internal/files"
	"dotmostbox/internal/ipfs"
	"dotmostbox/internal/mp"
	"dotmostbox/internal/sse"

	"github.com/joho/godotenv"
)

// 嵌入 ./out 目录下的所有静态文件，便于单文件分发
//
//go:embed out/**
var embeddedFS embed.FS

func main() {
	// 加载当前可执行文件所在目录的 .env 文件
	exe, _ := os.Executable()
	dir := filepath.Dir(exe)
	_ = godotenv.Load(filepath.Join(dir, ".env"))

	// 初始化 IPFS Shell
	sh := config.NewIPFSShell()

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
	ipfs.Register(mux, sh)
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

	srv := &http.Server{Addr: ":" + mp.PORT, Handler: handler}
	log.Println("服务器正在监听", "http://localhost:"+mp.PORT)

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()
	<-stop
	log.Println("收到停止信号，正在关闭")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Println("服务器关闭错误", err)
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
