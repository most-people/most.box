package update

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"

	semver "github.com/blang/semver/v4"
)

// Version 由构建系统注入（GoReleaser ldflags），默认为 dev
var Version = "dev"

var IPNSBase = "http://127.0.0.1:8080/ipns/dist.most.box"
var DistRoot = "dot"
var ErrChecksumInfoMissing = errors.New("校验信息缺失")

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
	latestTag, err := fetchLatestVersion(ctx)
	if err != nil {
		return err
	}

	curV, latestV, cmp, err := compareVersions(Version, latestTag)
	if err != nil {
		return err
	}
	if cmp >= 0 {
		fmt.Printf("[update] 当前版本 %s 已是最新（最新 %s）\n", curV, latestV)
		return nil
	}

	ext := ""
	if runtime.GOOS == "windows" {
		ext = ".exe"
	}
	file := fmt.Sprintf("%s-%s-%s%s", runtime.GOOS, runtime.GOARCH, "dot", ext)

	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("获取当前可执行文件失败: %w", err)
	}
	exeDir := filepath.Dir(exePath)
	newName := "dot.new" + ext
	newPath := filepath.Join(exeDir, newName)

	assetURL := fmt.Sprintf("%s/%s/v%s/%s", IPNSBase, DistRoot, latestV, file)
	if err := downloadFile(ctx, assetURL, newPath); err != nil {
		return fmt.Errorf("下载新版本失败: %w", err)
	}

	sumsURL := fmt.Sprintf("%s/%s/v%s/checksums.txt", IPNSBase, DistRoot, latestV)
	expectedName := file
	if err := verifyChecksum(ctx, sumsURL, newPath, expectedName); err != nil && !errors.Is(err, ErrChecksumInfoMissing) {
		return fmt.Errorf("校验新版本失败: %w", err)
	}

	fmt.Printf("[update] 已下载新版本 %s 至 %s\n", latestV, newPath)
	fmt.Println("[update] 提示：请手动重启以应用更新（Windows 无法在运行时覆盖自身）")
	return nil
}

func fetchLatestVersion(ctx context.Context) (string, error) {
	u := fmt.Sprintf("%s/%s/", IPNSBase, DistRoot)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "dot.most.box-updater")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("目录获取失败: %d %s", resp.StatusCode, string(b))
	}
	body, _ := io.ReadAll(resp.Body)
	text := string(body)
	re := regexp.MustCompile(`v[0-9]+\.[0-9]+\.[0-9]+`)
	matches := re.FindAllString(text, -1)
	if len(matches) == 0 {
		return "", fmt.Errorf("目录中未发现版本")
	}
	seen := map[string]struct{}{}
	list := []string{}
	for _, m := range matches {
		if _, ok := seen[m]; !ok {
			seen[m] = struct{}{}
			list = append(list, m)
		}
	}
	best := pickLatest(list)
	if best == "" {
		return "", fmt.Errorf("无法解析最新版本")
	}
	return best, nil
}

func pickLatest(list []string) string {
	best := ""
	for _, s := range list {
		_, _, cmp, err := compareVersions(best, s)
		if err != nil {
			continue
		}
		if best == "" || cmp < 0 {
			best = s
		}
	}
	return best
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

// GitHub 相关逻辑已移除，使用 IPNS 版本分发

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

func verifyChecksum(ctx context.Context, checksumsURL, filePath string, expectedName string) error {
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
	base := expectedName
	expected := findExpectedChecksum(string(data), base)
	fmt.Printf("[update] 校验信息: %s %s", sum, base)
	if expected == "" {
		noExt := strings.TrimSuffix(base, filepath.Ext(base))
		expected = findExpectedChecksum(string(data), noExt)
	}
	if expected == "" {
		return ErrChecksumInfoMissing
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
