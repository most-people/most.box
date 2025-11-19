// IPFS 配置接口与生成逻辑
// 提供 /ipfs/config 路由，依据链上节点与角色模板生成配置并应用
package ipfs

import (
	"bytes"
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"mime/multipart"
	"net"
	"net/http"
	"net/url"
	"os/exec"
	"reflect"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"dotmostbox/internal/mp"

	shell "github.com/ipfs/go-ipfs-api"
)

// 节点角色：dhtclient（非公开）/ dhtserver（公开）
type nodeRole string

// 角色常量
const (
	roleClient nodeRole = "dhtclient"
	roleServer nodeRole = "dhtserver"
)

var httpClientApply = &http.Client{Timeout: applyTimeout}
var httpClientShutdown = &http.Client{Timeout: shutdownTimeout}

//go:embed dhtclient.json
var embeddedDHTClient []byte

//go:embed dhtserver.json
var embeddedDHTServer []byte

//go:embed default.json
var embeddedDefault []byte

// 节点定义：由链上 Dot 转换而来
type nodeDef struct {
	Name string
	Type nodeRole
	ID   string
	IP   []string
	Port int
}

// 配置生成常量：默认端口、选择数量等
const (
	defaultPort     = 4001
	bootstrapK      = 8
	peeringRing     = 3
	peeringRandom   = 3
	ipfsAPIBase     = "http://127.0.0.1:5001"
	dialTCPTimeout  = 1200 * time.Millisecond
	shutdownTimeout = 8 * time.Second
	idTimeout       = 700 * time.Millisecond
	applyTimeout    = 12 * time.Second
	restartTimeout  = 10 * time.Second
)

func authorized(r *http.Request) bool {
	return mp.IsLocalRequest(r) || mp.IsOwner(r.Header.Get("Authorization"))
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

// 注册 /ipfs/config 路由：生成并替换本机 IPFS 配置
func Register(mux *http.ServeMux, sh *shell.Shell) {

	// 返回当前配置 /ipfs/config/show
	mux.HandleFunc("/ipfs.config.show", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		if !authorized(r) {
			http.Error(w, "管理员 token 无效", http.StatusUnauthorized)
			return
		}
		var cfg map[string]any
		ctx, cancel := context.WithTimeout(context.Background(), idTimeout)
		defer cancel()
		if err := sh.Request("config/show").Exec(ctx, &cfg); err != nil {
			http.Error(w, "读取当前配置失败 "+err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, cfg)
	})

	// 根据链上节点清单生成配置
	mux.HandleFunc("/ipfs.config.update", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPut {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		if !authorized(r) {
			http.Error(w, "管理员 token 无效", http.StatusUnauthorized)
			return
		}
		// 读取链上节点清单
		dots, err := mp.GetAllDots()
		if err != nil {
			http.Error(w, "读取链上节点失败 "+err.Error(), http.StatusInternalServerError)
			return
		}
		custom, err := dotsToCustom(dots)
		if err != nil {
			http.Error(w, "解析节点清单失败 "+err.Error(), http.StatusInternalServerError)
			return
		}
		// 加载角色模板
		defaultCfg, dhtClient, dhtServer, err := loadRoleTemplates()
		if err != nil {
			http.Error(w, "读取角色模板失败 "+err.Error(), http.StatusInternalServerError)
			return
		}
		bs := buildBootstrap(custom)
		// 获取本地节点信息
		idInfo, err := sh.ID()
		if err != nil {
			http.Error(w, "获取本地 Peer ID 失败 "+err.Error(), http.StatusServiceUnavailable)
			return
		}
		peerID := idInfo.ID
		// 拉取当前配置
		var currentCfg map[string]any
		ctxCfg, cancelCfg := context.WithTimeout(context.Background(), idTimeout)
		defer cancelCfg()
		if err := sh.Request("config/show").Exec(ctxCfg, &currentCfg); err != nil {
			http.Error(w, "读取当前配置失败 "+err.Error(), http.StatusInternalServerError)
			return
		}
		matched := findByPeer(custom, peerID)
		roleCfg := dhtClient
		if matched != nil && matched.Type == roleServer {
			roleCfg = dhtServer
		}
		announceAddrs := buildAnnounce(matchedIP(matched), nodePort(matched))
		peeringPeers := buildPeeringForLocal(custom, peerID)
		// 合并配置（当前配置 + 计算结果 + 角色模板）
		finalCfg := mergeBaseWithExtras(currentCfg, map[string]any{
			"announceAddrs":  announceAddrs,
			"bootstrapAddrs": bs,
			"peeringPeers":   peeringPeers,
			"roleCfg":        roleCfg,
			"defaultCfg":     defaultCfg,
		})
		// 通过 IPFS HTTP API 替换配置
		if err := applyConfigViaHTTP(ipfsAPIBase, finalCfg); err != nil {
			http.Error(w, "替换配置失败 "+err.Error(), http.StatusInternalServerError)
			return
		}
		out := map[string]any{
			"ok":             true,
			"message":        "配置已更新",
			"peerId":         peerID,
			"role":           ifThen(matched != nil && matched.Type == roleServer, string(roleServer), string(roleClient)),
			"announceCount":  len(announceAddrs),
			"bootstrapCount": len(bs),
			"peeringCount":   len(peeringPeers),
		}
		writeJSON(w, http.StatusOK, out)
	})

	// 关闭 IPFS 节点
	mux.HandleFunc("/ipfs.shutdown", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		if !authorized(r) {
			http.Error(w, "管理员 token 无效", http.StatusUnauthorized)
			return
		}
		client := httpClientShutdown
		req, _ := http.NewRequest("POST", ipfsAPIBase+"/api/v0/shutdown", nil)
		resp, err := client.Do(req)
		if err == nil {
			io.ReadAll(resp.Body)
			resp.Body.Close()
		}
		ok := err == nil
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":      ok,
			"message": ifThen(ok, "关闭命令已发送", "关闭命令发送失败"),
		})
	})

	// 重启 IPFS 节点
	mux.HandleFunc("/ipfs.restart", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		if !authorized(r) {
			http.Error(w, "管理员 token 无效", http.StatusUnauthorized)
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), restartTimeout)
		defer cancel()
		var cmd *exec.Cmd
		if runtime.GOOS == "windows" {
			cmd = exec.CommandContext(ctx, "cmd", "/C", "pm2 restart ipfs")
		} else {
			cmd = exec.CommandContext(ctx, "bash", "-lc", "pm2 restart ipfs")
		}
		err := cmd.Run()
		ok := err == nil
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":      ok,
			"message": ifThen(ok, "已执行 pm2 restart ipfs", "执行失败"),
		})
	})
}

// 将链上 Dot 转换为内部节点清单，并判定角色（探测 Swarm 端口）
func dotsToCustom(dots []mp.Dot) ([]nodeDef, error) {
	result := make([]nodeDef, 0, len(dots))
	for _, d := range dots {
		name, id := splitDotName(d.Name)
		ips := toMaBasesFromApis(d.APIs)
		hosts := hostsFromApis(d.APIs)
		open := anySwarmOpen(hosts, defaultPort)
		t := roleClient
		if open {
			t = roleServer
		}
		result = append(result, nodeDef{Name: name, ID: id, IP: ips, Type: t, Port: 0})
	}
	return result, nil
}

// 读取角色模板配置（dhtclient/dhtserver）
func loadRoleTemplates() (map[string]any, map[string]any, map[string]any, error) {
	var df map[string]any
	var dc map[string]any
	var ds map[string]any
	if err := json.Unmarshal(embeddedDefault, &df); err != nil {
		return nil, nil, nil, err
	}
	if err := json.Unmarshal(embeddedDHTClient, &dc); err != nil {
		return nil, nil, nil, err
	}
	if err := json.Unmarshal(embeddedDHTServer, &ds); err != nil {
		return nil, nil, nil, err
	}
	return df, dc, ds, nil
}

// 从名称中拆分 PeerID（约定格式：name-peerID）
func splitDotName(full string) (string, string) {
	i := strings.LastIndex(full, "-")
	if i > 0 {
		return full[:i], full[i+1:]
	}
	return full, ""
}

// 从 API URL 提取主机并生成基础 multiaddr 前缀（/ip4、/ip6、dns4、dns6）
func toMaBasesFromApis(apis []string) []string {
	out := []string{}
	for _, s := range apis {
		u, err := url.Parse(s)
		if err != nil {
			continue
		}
		host := u.Hostname()
		if host == "" {
			continue
		}
		ip := net.ParseIP(host)
		if ip != nil {
			if ip.To4() != nil {
				out = append(out, "/ip4/"+host)
			} else {
				out = append(out, "/ip6/"+host)
			}
			continue
		}
		v4 := false
		v6 := false
		ips, err := net.LookupIP(host)
		if err == nil {
			for _, a := range ips {
				if a.To4() != nil {
					v4 = true
				} else {
					v6 = true
				}
			}
		}
		if v4 {
			out = append(out, "/dns4/"+host)
		}
		if v6 || (!v4 && !v6) {
			out = append(out, "/dns6/"+host)
		}
	}
	return dedupeStrings(out)
}

// 从 API URL 提取主机列表（用于端口探测）
func hostsFromApis(apis []string) []string {
	out := []string{}
	for _, s := range apis {
		u, err := url.Parse(s)
		if err != nil {
			continue
		}
		h := u.Hostname()
		if h != "" {
			out = append(out, h)
		}
	}
	return dedupeStrings(out)
}

// 探测任意主机的 Swarm 端口是否开放
func anySwarmOpen(hosts []string, port int) bool {
	if len(hosts) == 0 {
		return false
	}
	success := make(chan struct{}, 1)
	var wg sync.WaitGroup
	for _, h := range hosts {
		wg.Add(1)
		go func(host string) {
			defer wg.Done()
			if isSwarmPortOpen(host, port) {
				select {
				case success <- struct{}{}:
				default:
				}
			}
		}(h)
	}
	done := make(chan struct{})
	go func() { wg.Wait(); close(done) }()
	select {
	case <-success:
		return true
	case <-done:
		return false
	}
}

// 探测单主机的 Swarm 端口是否开放（支持解析域名至多地址）
func isSwarmPortOpen(host string, port int) bool {
	ip := net.ParseIP(host)
	targets := []string{}
	if ip != nil {
		targets = append(targets, host)
	} else {
		ips, err := net.LookupIP(host)
		if err == nil && len(ips) > 0 {
			for _, a := range ips {
				targets = append(targets, a.String())
			}
		} else {
			targets = append(targets, host)
		}
	}
	if len(targets) == 0 {
		return false
	}
	success := make(chan struct{}, 1)
	var wg sync.WaitGroup
	for _, t := range targets {
		wg.Add(1)
		go func(target string) {
			defer wg.Done()
			addr := net.JoinHostPort(target, strconv.Itoa(port))
			c, err := net.DialTimeout("tcp", addr, dialTCPTimeout)
			if err == nil {
				c.Close()
				select {
				case success <- struct{}{}:
				default:
				}
			}
		}(t)
	}
	done := make(chan struct{})
	go func() { wg.Wait(); close(done) }()
	select {
	case <-success:
		return true
	case <-done:
		return false
	}
}

// 返回节点端口（默认 4001）
func nodePort(n *nodeDef) int {
	if n == nil || n.Port <= 0 {
		return defaultPort
	}
	return n.Port
}

// 构建 TCP 地址
func addTcp(base string, port int) string { return base + "/tcp/" + strconv.Itoa(port) }

// 构建 QUIC v1 地址
func addUdpQuic(base string, port int) string {
	return base + "/udp/" + strconv.Itoa(port) + "/quic-v1"
}

// 构建带 /p2p 的 TCP 地址
func addP2pTcp(base, peerID string, port int) string { return addTcp(base, port) + "/p2p/" + peerID }

// 判断是否为 /dnsaddr/ 前缀
func isDnsaddr(s string) bool { return strings.HasPrefix(s, "/dnsaddr/") }

// 规范化地址（不含 /p2p）
func normalizeNoP2p(base string, port int) []string {
	if isDnsaddr(base) {
		return []string{base}
	}
	return []string{addTcp(base, port), addUdpQuic(base, port)}
}

// 规范化地址（包含 /p2p/<peerID>）
func normalizeWithP2p(base, peerID string, port int) []string {
	if isDnsaddr(base) {
		return []string{base}
	}
	return []string{addP2pTcp(base, peerID, port), addUdpQuic(base, port) + "/p2p/" + peerID}
}

// 构建 Announce 地址列表：TCP + QUIC v1
func buildAnnounce(ipList []string, port int) []string {
	out := []string{}
	for _, ip := range ipList {
		addrs := normalizeNoP2p(ip, port)
		out = append(out, addrs...)
	}
	return dedupeStrings(out)
}

// 构建 Bootstrap 地址：选择 K 个服务器节点，生成带 /p2p 的地址
func buildBootstrap(nodes []nodeDef) []string {
	servers := []nodeDef{}
	for _, n := range nodes {
		if n.Type == roleServer && len(n.IP) > 0 {
			servers = append(servers, n)
		}
	}
	sel := pickKNodes(servers, bootstrapK)
	out := []string{}
	for _, n := range sel {
		p := nodePort(&n)
		for _, ip := range n.IP {
			out = append(out, normalizeWithP2p(ip, n.ID, p)...)
		}
	}
	return dedupeStrings(out)
}

// 构建 Peering 邻居：环形邻居与随机邻居（优先服务器）
func buildPeeringForLocal(nodes []nodeDef, localPeerID string) []map[string]any {
	arr := make([]nodeDef, len(nodes))
	copy(arr, nodes)
	idx := -1
	for i := range arr {
		if arr[i].ID == localPeerID {
			idx = i
			break
		}
	}
	N := len(arr)
	chosen := map[string]nodeDef{}
	if N > 0 && idx >= 0 {
		for d := 1; d <= peeringRing; d++ {
			l := arr[(idx-d+N)%N]
			r := arr[(idx+d)%N]
			if l.ID != localPeerID {
				chosen[l.ID] = l
			}
			if r.ID != localPeerID {
				chosen[r.ID] = r
			}
		}
	}
	others := []nodeDef{}
	for _, n := range arr {
		if n.ID != localPeerID {
			others = append(others, n)
		}
	}
	prefer := []nodeDef{}
	fallback := []nodeDef{}
	for _, n := range others {
		if len(n.IP) > 0 && n.Type == roleServer {
			prefer = append(prefer, n)
		} else if len(n.IP) > 0 {
			fallback = append(fallback, n)
		}
	}
	for _, n := range pickKNodes(prefer, peeringRandom) {
		chosen[n.ID] = n
	}
	if len(chosen) < peeringRing*2+peeringRandom {
		for _, n := range pickKNodes(fallback, peeringRandom) {
			chosen[n.ID] = n
		}
	}
	peers := []map[string]any{}
	for _, n := range chosen {
		p := nodePort(&n)
		addrs := []string{}
		for _, ip := range n.IP {
			addrs = append(addrs, normalizeNoP2p(ip, p)...)
		}
		addrs = dedupeStrings(addrs)
		if len(addrs) > 0 {
			peers = append(peers, map[string]any{"ID": n.ID, "Addrs": addrs})
		}
	}
	return peers
}

// 合并当前配置与计算结果、角色模板（数组保守、对象递归、覆盖基本类型）
func mergeBaseWithExtras(baseCfg map[string]any, extras map[string]any) map[string]any {
	cfg := deepCloneMap(baseCfg)
	announce, _ := extras["announceAddrs"].([]string)
	bootstrap, _ := extras["bootstrapAddrs"].([]string)
	peering, _ := extras["peeringPeers"].([]map[string]any)
	roleCfg, _ := extras["roleCfg"].(map[string]any)
	defaultCfg, _ := extras["defaultCfg"].(map[string]any)

	if defaultCfg != nil {
		if dAPI, ok := defaultCfg["API"].(map[string]any); ok {
			cfg["API"] = mergeObjects(asMap(cfg["API"]), dAPI)
		}
		if dAddr, ok := defaultCfg["Addresses"].(map[string]any); ok {
			cfg["Addresses"] = mergeObjects(asMap(cfg["Addresses"]), dAddr)
		}
		if dSwarm, ok := defaultCfg["Swarm"].(map[string]any); ok {
			cfg["Swarm"] = mergeObjects(asMap(cfg["Swarm"]), dSwarm)
		}
		if dPubsub, ok := defaultCfg["Pubsub"].(map[string]any); ok {
			cfg["Pubsub"] = mergeObjects(asMap(cfg["Pubsub"]), dPubsub)
		}
		if dIpns, ok := defaultCfg["Ipns"].(map[string]any); ok {
			cfg["Ipns"] = mergeObjects(asMap(cfg["Ipns"]), dIpns)
		}
		if dProvide, ok := defaultCfg["Provide"].(map[string]any); ok {
			cfg["Provide"] = mergeObjects(asMap(cfg["Provide"]), dProvide)
		}
	}

	addr, _ := cfg["Addresses"].(map[string]any)
	if addr == nil {
		addr = map[string]any{}
	}
	addr["Announce"] = announce
	cfg["Addresses"] = addr
	cfg["Bootstrap"] = bootstrap
	cfg["Peering"] = map[string]any{"Peers": peering}

	routing, _ := cfg["Routing"].(map[string]any)
	if routing == nil {
		routing = map[string]any{}
	}
	if roleCfg != nil {
		if r, ok := roleCfg["Routing"].(map[string]any); ok {
			if t, ok2 := r["Type"].(string); ok2 {
				routing["Type"] = t
			}
		}
	}
	cfg["Routing"] = routing

	if roleCfg != nil {
		if s, ok := roleCfg["Swarm"].(map[string]any); ok {
			cfg["Swarm"] = mergeObjects(asMap(cfg["Swarm"]), s)
		}
		if p, ok := roleCfg["Pubsub"].(map[string]any); ok {
			cfg["Pubsub"] = mergeObjects(asMap(cfg["Pubsub"]), p)
		}
		if i, ok := roleCfg["Ipns"].(map[string]any); ok {
			cfg["Ipns"] = mergeObjects(asMap(cfg["Ipns"]), i)
		}
		if prv, ok := roleCfg["Provide"].(map[string]any); ok {
			cfg["Provide"] = mergeObjects(asMap(cfg["Provide"]), prv)
		}
	}
	delete(cfg, "Reprovider")
	return cfg
}

// 递归合并对象；数组仅在目标不存在时复制模板
func mergeObjects(target map[string]any, source map[string]any) map[string]any {
	if source == nil {
		return target
	}
	if target == nil {
		target = map[string]any{}
	}
	for k, sv := range source {
		tv, exists := target[k]
		if isSlice(sv) {
			if !exists {
				target[k] = deepCopyAny(sv)
			}
			continue
		}
		if sm, ok := sv.(map[string]any); ok {
			target[k] = mergeObjects(asMap(tv), sm)
			continue
		}
		target[k] = sv
	}
	return target
}

// 深拷贝 map
func deepCloneMap(m map[string]any) map[string]any { return asMap(deepCopyAny(m)) }

// 安全转换为 map[string]any
func asMap(v any) map[string]any {
	if v == nil {
		return map[string]any{}
	}
	if m, ok := v.(map[string]any); ok {
		return m
	}
	return map[string]any{}
}

// 判断是否为切片类型
func isSlice(v any) bool {
	if v == nil {
		return false
	}
	return reflect.ValueOf(v).Kind() == reflect.Slice
}

// 使用 JSON 编解码进行深拷贝
func deepCopyAny(v any) any {
	switch x := v.(type) {
	case map[string]any:
		out := make(map[string]any, len(x))
		for k, vv := range x {
			out[k] = deepCopyAny(vv)
		}
		return out
	case []any:
		out := make([]any, len(x))
		for i := range x {
			out[i] = deepCopyAny(x[i])
		}
		return out
	case []string:
		out := make([]string, len(x))
		copy(out, x)
		return out
	default:
		return x
	}
}

// 取匹配节点的 IP 列表
func matchedIP(n *nodeDef) []string {
	if n == nil {
		return []string{}
	}
	return n.IP
}

// 根据 PeerID 查找节点
func findByPeer(nodes []nodeDef, peerID string) *nodeDef {
	for i := range nodes {
		if nodes[i].ID == peerID {
			return &nodes[i]
		}
	}
	return nil
}

// 随机选择 K 个节点
func pickKNodes(arr []nodeDef, k int) []nodeDef {
	if k <= 0 || len(arr) == 0 {
		return []nodeDef{}
	}
	r := make([]nodeDef, len(arr))
	copy(r, arr)
	rand.Shuffle(len(r), func(i, j int) { r[i], r[j] = r[j], r[i] })
	if k > len(r) {
		k = len(r)
	}
	return r[:k]
}

// 去重字符串列表
func dedupeStrings(list []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(list))
	for _, v := range list {
		if _, ok := seen[v]; !ok {
			seen[v] = struct{}{}
			out = append(out, v)
		}
	}
	return out
}

// 调用 IPFS HTTP API /api/v0/config/replace 替换配置
func applyConfigViaHTTP(base string, cfg map[string]any) error {
	buf := &bytes.Buffer{}
	w := multipart.NewWriter(buf)
	part, err := w.CreateFormFile("file", "config")
	if err != nil {
		return err
	}
	b, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	if _, err = part.Write(append(b, '\n')); err != nil {
		return err
	}
	if err = w.Close(); err != nil {
		return err
	}
	req, err := http.NewRequest("POST", base+"/api/v0/config/replace", buf)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())
	resp, err := httpClientApply.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode/100 != 2 {
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	return nil
}

// 条件选择
func ifThen(cond bool, a, b string) string {
	if cond {
		return a
	}
	return b
}
