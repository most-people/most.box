// Package mp 提供网络探测、签名验证以及与合约交互功能。
package mp

import (
	"encoding/hex"
	"fmt"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/crypto"
)

// PORT 服务监听端口号。
const PORT = "1976"

// NetInfo 保存本机可访问的 IPv4/IPv6 地址列表。
type NetInfo struct {
	IPv4 []string
	IPv6 []string
}

var (
	networkMu sync.RWMutex
	network   = NetInfo{}
)

// InitIP 探测本地 IP 并填充网络端点信息。
func InitIP() {
	ipv4List := []string{"http://127.0.0.1:" + PORT}
	ipv6List := []string{"http://[::1]:" + PORT}

	ifaces, _ := net.Interfaces()
	for _, iface := range ifaces {
		addresses, _ := iface.Addrs()
		for _, ifaceAddress := range addresses {
			switch ipNet := ifaceAddress.(type) {
			case *net.IPNet:
				ip := ipNet.IP
				if ip == nil || ip.IsLoopback() {
					continue
				}
				if ip.To4() != nil {
					ipv4List = append(ipv4List, "http://"+ip.String()+":"+PORT)
				} else {
					// 跳过链路本地地址（fe80::）
					ipString := ip.String()
					if strings.HasPrefix(ipString, "fe80:") {
						continue
					}
					ipv6List = append(ipv6List, "http://["+ipString+"]:"+PORT)
				}
			}
		}
	}
	networkMu.Lock()
	network.IPv4 = ipv4List
	network.IPv6 = ipv6List
	networkMu.Unlock()

	go postIP("https://sepolia.base.org")
	go postIP("https://mainnet.base.org")
}

func postIP(rpc string) {
	if err := PostIP(rpc); err != nil {
		fmt.Println(rpc, err)
	}
}

func Network() NetInfo { networkMu.RLock(); defer networkMu.RUnlock(); return network }

// GetAddress 校验 token 并在有效时返回小写地址。
// token 格式为 "address.message.signature"，有效期为 4 小时。
func GetAddress(token string) string {
	if token == "" {
		return ""
	}
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return ""
	}
	address := strings.ToLower(parts[0])
	message := parts[1]
	signatureHex := parts[2]
	// 过期时间：4 小时；message 为毫秒时间戳字符串
	if ms, err := parseInt64(message); err == nil {
		if nowMillis()-ms > 1000*60*60*4 {
			return ""
		}
	} else {
		return ""
	}
	// 根据签名恢复签名者地址
	msg := []byte(message)
	hash := accounts.TextHash(msg)
	signature, err := hex.DecodeString(strings.TrimPrefix(signatureHex, "0x"))
	if err != nil || len(signature) != 65 {
		return ""
	}
	// 如果恢复 ID 为 27/28，则调整为 0/1
	if signature[64] >= 27 {
		signature[64] -= 27
	}
	publicKey, err := crypto.SigToPub(hash, signature)
	if err != nil {
		return ""
	}
	recoveredAddress := crypto.PubkeyToAddress(*publicKey).Hex()
	if strings.ToLower(recoveredAddress) == address {
		return address
	}
	return ""
}

// IsOwner 判断 token 是否属于环境变量 PRIVATE_KEY 对应的地址。
func IsOwner(token string) bool {
	privateKeyHex := os.Getenv("PRIVATE_KEY")
	if privateKeyHex == "" {
		return false
	}
	privateKey, err := crypto.HexToECDSA(strings.TrimPrefix(privateKeyHex, "0x"))
	if err != nil {
		return false
	}
	address := crypto.PubkeyToAddress(privateKey.PublicKey).Hex()
	userAddress := GetAddress(token)
	return userAddress != "" && strings.EqualFold(userAddress, address)
}

// 辅助函数
func parseInt64(text string) (int64, error) {
	var number int64
	var negative bool
	for i, ch := range text {
		if i == 0 && ch == '-' {
			negative = true
			continue
		}
		if ch < '0' || ch > '9' {
			return 0, os.ErrInvalid
		}
		number = number*10 + int64(ch-'0')
	}
	if negative {
		number = -number
	}
	return number, nil
}

// nowMillis 返回当前时间的毫秒时间戳。
func nowMillis() int64 { return time.Now().UnixMilli() }

func IsLocalRequest(r *http.Request) bool {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		ip := net.ParseIP(host)
		if ip != nil && (ip.IsLoopback() || ip.IsUnspecified()) {
			return true
		}
	}
	h := r.Host
	if h != "" {
		hh, _, err2 := net.SplitHostPort(h)
		if err2 != nil {
			hh = h
		}
		if hh == "localhost" || hh == "127.0.0.1" || hh == "::1" {
			return true
		}
	}
	xf := r.Header.Get("X-Forwarded-For")
	if xf != "" {
		p := strings.Split(xf, ",")
		first := strings.TrimSpace(p[0])
		ip := net.ParseIP(first)
		if ip != nil && ip.IsLoopback() {
			return true
		}
	}
	return false
}
