package update

import (
	"context"
	"fmt"
	"log"
	stdurl "net/url"
	"strings"

	selfupdate "github.com/creativeprojects/go-selfupdate"
)

var Version = "dev"

func CheckAndDownload(ctx context.Context) (bool, error) {
	repo := selfupdate.ParseSlug("most-people/most.box")
	latest, found, err := selfupdate.DetectLatest(ctx, repo)
	if err != nil {
		return false, err
	}
	log.Printf("Latest: %s", latest.AssetURL)
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
		bs := "http://127.0.0.1:8080/ipns/dist.most.box"
		idx := strings.LastIndex(u.Path, "/")
		if idx >= 0 {
			asset := u.Path[idx+1:]
			ipns := strings.Replace(url, "https://github.com", bs, 1)
			log.Printf("AssetURL: %s", ipns)
			e := selfupdate.UpdateTo(ctx, ipns, asset, exe)
			if e != nil {
				return false, fmt.Errorf("IPNS 下载失败: %w", e)
			}
			return true, nil
		}
	}
	return false, fmt.Errorf("IPNS 下载出错")
}
