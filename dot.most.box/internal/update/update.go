package update

import (
	"context"
	"fmt"
	"runtime"
	"strings"

	"github.com/Masterminds/semver/v3"
	selfupdate "github.com/creativeprojects/go-selfupdate"
	github "github.com/google/go-github/v30/github"
)

var Version = "dev"

func CheckAndDownload(ctx context.Context) (bool, error) {
	owner := "most-people"
	repo := "most.box"

	client := github.NewClient(nil)
	releases, _, err := client.Repositories.ListReleases(ctx, owner, repo, &github.ListOptions{PerPage: 100})
	if err != nil {
		return false, err
	}

	var latestTag string
	var latestVer *semver.Version
	for _, r := range releases {
		if r.GetDraft() || r.GetPrerelease() {
			continue
		}
		tag := strings.TrimSpace(r.GetTagName())
		if tag == "" {
			continue
		}
		t := strings.TrimPrefix(tag, "v")
		ver, e := semver.NewVersion(t)
		if e != nil {
			continue
		}
		if latestVer == nil || ver.GreaterThan(latestVer) {
			latestVer = ver
			latestTag = tag
		}
	}
	if latestTag == "" || latestVer == nil {
		return false, fmt.Errorf("未找到稳定版发布")
	}

	v := strings.TrimSpace(Version)
	if v == "" || v == "dev" {
		v = "0.0.0"
	}
	cv, err := semver.NewVersion(strings.TrimPrefix(v, "v"))
	if err != nil {
		cv, _ = semver.NewVersion("0.0.0")
	}
	if !latestVer.GreaterThan(cv) {
		return false, nil
	}

	exe, err := selfupdate.ExecutablePath()
	if err != nil {
		return false, fmt.Errorf("无法定位可执行文件: %w", err)
	}

	bs := "http://127.0.0.1:8080/ipns/dist.most.box"
	p := strings.TrimRight(bs, "/")
	ext := ""
	if runtime.GOOS == "windows" {
		ext = ".exe"
	}
	alt := fmt.Sprintf("%s-%s-%s%s", runtime.GOOS, runtime.GOARCH, "dot", ext)
	prefix := fmt.Sprintf("/%s/%s/releases/download/%s/", owner, repo, latestTag)
	ipns := p + prefix + alt
	e := selfupdate.UpdateTo(ctx, ipns, alt, exe)
	if e != nil {
		return false, fmt.Errorf("IPNS 下载失败: %w", e)
	}
	return true, nil
}
