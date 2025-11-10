package update

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	semver "github.com/blang/semver/v4"
)

// Version 由构建系统注入（GoReleaser ldflags），默认为 dev
var Version = "dev"

var Repo = "https://api.github.com/repos/most-people/most.box/releases/latest"

type githubRelease struct {
	TagName string        `json:"tag_name"`
	Assets  []githubAsset `json:"assets"`
}

type githubAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
}

// StartBackgroundCheck 在后台定时检测更新（启动时先检查一次，后续每日检查）
func StartBackgroundCheck(ctx context.Context) {
	// 尝试应用已下载的待更新文件（非 Windows 可直接替换）
	ApplyPendingIfPossible()

	// 首次启动尝试检查
	go func() {
		// 允许启动后 3 秒再检查，避免与其他初始化竞争
		time.Sleep(3 * time.Second)
		if err := CheckAndDownload(ctx); err != nil {
			// 仅日志提示，不影响主流程
			fmt.Println("[update] 首次检测失败:", err)
		}
	}()

	// 每日检查一次
	go func() {
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := CheckAndDownload(ctx); err != nil {
					fmt.Println("[update] 定时检测失败:", err)
				}
			}
		}
	}()
}

// ApplyPendingIfPossible 在非 Windows 平台将 dot.new* 覆盖为 dot*
func ApplyPendingIfPossible() {
	exePath, err := os.Executable()
	if err != nil {
		return
	}
	exeDir := filepath.Dir(exePath)
	if runtime.GOOS == "windows" {
		// Windows 无法在运行时覆盖自身，跳过
		return
	}
	// 非 Windows：将 dot.new 替换为 dot
	newPath := filepath.Join(exeDir, "dot.new")
	targetPath := filepath.Join(exeDir, "dot")
	if _, err := os.Stat(newPath); err == nil {
		// 使用原子替换
		_ = os.Rename(newPath, targetPath)
		fmt.Println("[update] 已应用待更新文件，重启后生效")
	}
}

// CheckAndDownload 检测是否存在更新；若发现新版本则下载对应平台的二进制到当前目录（dot.new*）
func CheckAndDownload(ctx context.Context) error {
	latest, err := fetchLatest(ctx)
	if err != nil {
		return err
	}

	curV, latestV, cmp, err := compareVersions(Version, latest.TagName)
	if err != nil {
		return err
	}
	if cmp >= 0 {
		fmt.Printf("[update] 当前版本 %s 已是最新（最新 %s）\n", curV, latestV)
		return nil
	}

	assetNamePrefix := fmt.Sprintf("dot-%s-%s", runtime.GOOS, runtime.GOARCH)
	asset, ok := findAsset(latest.Assets, assetNamePrefix)
	if !ok {
		return fmt.Errorf("未找到匹配资产: %s", assetNamePrefix)
	}

	// 计算目标文件路径
	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("获取当前可执行文件失败: %w", err)
	}
	exeDir := filepath.Dir(exePath)
	ext := ""
	if runtime.GOOS == "windows" {
		ext = ".exe"
	}
	newName := "dot.new" + ext
	newPath := filepath.Join(exeDir, newName)

	// 下载二进制
	if err := downloadFile(ctx, asset.BrowserDownloadURL, newPath); err != nil {
		return fmt.Errorf("下载新版本失败: %w", err)
	}

	// 校验 checksum（可选）
	if sumURL, ok := findChecksumsURL(latest.Assets); ok {
		if err := verifyChecksum(ctx, sumURL, newPath); err != nil {
			return fmt.Errorf("校验新版本失败: %w", err)
		}
	}

	fmt.Printf("[update] 已下载新版本 %s 至 %s\n", latestV, newPath)
	fmt.Println("[update] 提示：请手动重启以应用更新（Windows 无法在运行时覆盖自身）")
	return nil
}

func fetchLatest(ctx context.Context) (*githubRelease, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, Repo, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "dot.most.box-updater")
	if token := os.Getenv("GITHUB_TOKEN"); token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API 响应错误: %d %s", resp.StatusCode, string(b))
	}
	var gr githubRelease
	if err := json.NewDecoder(resp.Body).Decode(&gr); err != nil {
		return nil, err
	}
	return &gr, nil
}

func compareVersions(current, latest string) (curV, latestV string, cmp int, err error) {
	norm := func(v string) string {
		v = strings.TrimSpace(v)
		v = strings.TrimPrefix(v, "v")
		return v
	}
	c := norm(current)
	l := norm(latest)
	// dev 或空版本视为 0.0.0
	if c == "" || c == "dev" {
		c = "0.0.0"
	}
	cv, err := semver.Parse(c)
	if err != nil {
		return c, l, 0, fmt.Errorf("无法解析当前版本 %q: %w", c, err)
	}
	lv, err := semver.Parse(l)
	if err != nil {
		return c, l, 0, fmt.Errorf("无法解析最新版本 %q: %w", l, err)
	}
	return cv.String(), lv.String(), cv.Compare(lv), nil
}

func findAsset(assets []githubAsset, prefix string) (githubAsset, bool) {
	for _, a := range assets {
		if a.Name == prefix || strings.HasPrefix(a.Name, prefix) {
			return a, true
		}
	}
	return githubAsset{}, false
}

func findChecksumsURL(assets []githubAsset) (string, bool) {
	for _, a := range assets {
		if a.Name == "checksums.txt" {
			return a.BrowserDownloadURL, true
		}
	}
	return "", false
}

func downloadFile(ctx context.Context, url, dest string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "dot.most.box-updater")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("下载失败: %d %s", resp.StatusCode, string(b))
	}

	f, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer f.Close()
	if _, err := io.Copy(f, resp.Body); err != nil {
		return err
	}
	return nil
}

func verifyChecksum(ctx context.Context, checksumsURL, filePath string) error {
	// 下载 checksums.txt
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, checksumsURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "dot.most.box-updater")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("下载校验文件失败: %d %s", resp.StatusCode, string(b))
	}
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	// 计算本地文件 sha256
	f, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return err
	}
	sum := hex.EncodeToString(h.Sum(nil))

	// 在 checksums.txt 中查找匹配的文件名与哈希
	base := filepath.Base(filePath)
	expected := findExpectedChecksum(string(data), base)
	if expected == "" {
		// 某些命名不带 .exe 或不同前缀，尝试去除后检查
		noExt := strings.TrimSuffix(base, filepath.Ext(base))
		expected = findExpectedChecksum(string(data), noExt)
	}
	if expected == "" {
		// 无法匹配校验信息，返回可选错误
		return errors.New("校验信息缺失")
	}
	if !strings.EqualFold(sum, expected) {
		return fmt.Errorf("校验失败: 期望 %s 实际 %s", expected, sum)
	}
	return nil
}

func findExpectedChecksum(checksums, filename string) string {
	// checksums.txt 每行格式: <sha256>  <filename>
	for _, line := range strings.Split(checksums, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}
		if parts[len(parts)-1] == filename {
			return parts[0]
		}
	}
	return ""
}
