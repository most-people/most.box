package update

import (
	"context"
	"fmt"
	stdurl "net/url"
	"runtime"
	"strings"

	selfupdate "github.com/creativeprojects/go-selfupdate"
)

var Version = "dev"

func CheckAndDownload(ctx context.Context) (bool, error) {
	slug := "most-people/most.box"
	repo := selfupdate.ParseSlug(slug)
	latest, found, err := selfupdate.DetectLatest(ctx, repo)
	if err != nil {
		return false, err
	}
	v := strings.TrimSpace(Version)
	if v == "" || v == "dev" {
		v = "0.0.0"
	}
	if !found || latest.LessOrEqual(v) {
		return false, nil
	}
	exe, err := selfupdate.ExecutablePath()
	if err != nil {
		return false, fmt.Errorf("无法定位可执行文件: %w", err)
	}
	url := latest.AssetURL
	if u, perr := stdurl.Parse(url); perr == nil {
		// bs := "http://127.0.0.1:8080/ipns/dist.most.box"
		bs := "http://127.0.0.1:8080/ipfs/bafybeidfjmojbxrxnumawntvitwb3qmsllnu4f7p2uczj6wwnxg7qlj7cm"
		p := strings.TrimRight(bs, "/")
		ext := ""
		if runtime.GOOS == "windows" {
			ext = ".exe"
		}
		alt := fmt.Sprintf("%s-%s-%s%s", runtime.GOOS, runtime.GOARCH, "dot", ext)
		idx := strings.LastIndex(u.Path, "/")
		if idx >= 0 {
			prefix := u.Path[:idx+1]
			ipns := p + prefix + alt
			e := selfupdate.UpdateTo(ctx, ipns, alt, exe)
			if e != nil {
				return false, fmt.Errorf("IPNS 下载失败: %w", e)
			}
			return true, nil
		}
	}
	return false, fmt.Errorf("IPNS 下载失败")

}
