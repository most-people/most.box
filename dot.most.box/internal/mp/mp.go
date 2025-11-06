package mp

import (
	"encoding/hex"
	"net"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/crypto"
)

const PORT = "1976"

type NetInfo struct {
	IPv4 []string
	IPv6 []string
}

var (
	networkMu sync.RWMutex
	network   = NetInfo{}
)

// ListenAddress returns the server listen address.
func ListenAddress() string { return ":" + PORT }

// InitIP discovers local IP addresses and populates network endpoints.
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
					// skip link-local fe80::
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

	// 将当前节点信息上链（Base Sepolia 与 Base Mainnet）
	go PostIP("https://sepolia.base.org")
	go PostIP("https://mainnet.base.org")
}

func Network() NetInfo { networkMu.RLock(); defer networkMu.RUnlock(); return network }

// GetAddress validates token and returns address in lowercase if valid.
// Token format: "address.message.signature" and expires after 4 hours.
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
	// expiry 4 hours
	// t is a millisecond timestamp string
	if ms, err := parseInt64(message); err == nil {
		if nowMillis()-ms > 1000*60*60*4 {
			return ""
		}
	} else {
		return ""
	}
	// recover signer address from signature of t
	msg := []byte(message)
	hash := accounts.TextHash(msg)
	signature, err := hex.DecodeString(strings.TrimPrefix(signatureHex, "0x"))
	if err != nil || len(signature) != 65 {
		return ""
	}
	// adjust recovery id if 27/28
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

// IsOwner checks if token belongs to PRIVATE_KEY address.
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

// helpers
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

func nowMillis() int64 { return time.Now().UnixMilli() }
