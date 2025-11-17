// Package apis 提供 HTTP API 路由注册与相关处理逻辑。
package apis

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"

	"context"
	"dotmostbox/internal/mp"
	"dotmostbox/internal/update"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	shell "github.com/ipfs/go-ipfs-api"
)

// Register 注册所有 API 路由到给定 mux，使用 IPFS 客户端 sh。
func Register(mux *http.ServeMux, sh *shell.Shell) {
	// /api.dot 返回节点名称以及可用的 API 与 CID 列表
	mux.HandleFunc("/api.dot", func(w http.ResponseWriter, r *http.Request) {
		out, err := sh.ID()
		if err != nil {
			http.Error(w, "IPFS 未启动，请联系管理员。", http.StatusServiceUnavailable)
			return
		}
		peer := out.ID
		name := strings.TrimSpace(getEnv("DOT_NAME", "Unknown")) + "-" + peer
		net := mp.Network()
		apis := make([]string, 0, len(net.IPv6))
		if len(net.IPv6) > 1 {
			apis = append(apis, net.IPv6[1:]...)
		}
		if v := getEnv("API_URLS", ""); v != "" {
			parts := strings.Split(v, ",")
			// 先添加环境变量中的 API，再追加发现的 IPv6 地址
			apis = append(parts, apis...)
		}
		cids := []string{}
		if v := getEnv("CID_URLS", ""); v != "" {
			cids = append(strings.Split(v, ","), cids...)
		}
		json.NewEncoder(w).Encode(map[string]any{"name": name, "APIs": apis, "CIDs": cids})
	})

	// /api.TRNG 返回 8 字节真随机数（十六进制字符串）
	mux.HandleFunc("/api.TRNG", func(w http.ResponseWriter, r *http.Request) {
		var b [8]byte
		if _, err := rand.Read(b[:]); err != nil {
			http.Error(w, "随机数生成失败", http.StatusInternalServerError)
			return
		}
		iohex := hex.EncodeToString(b[:])
		w.Write([]byte(iohex))
	})

	// /api.git 返回 git remote -v 的输出
	mux.HandleFunc("/api.git", func(w http.ResponseWriter, r *http.Request) {
		out, err := exec.Command("git", "remote", "-v").CombinedOutput()
		if err != nil {
			w.Write(out)
			return
		}
		w.Write(out)
	})

	mux.HandleFunc("/app.version", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		v := strings.TrimSpace(update.Version)
		if v == "" {
			v = "dev"
		}
		json.NewEncoder(w).Encode(map[string]any{"version": v, "timestamp": time.Now().Format(time.RFC3339)})
	})

	mux.HandleFunc("/app.update", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		if !mp.IsLocalRequest(r) && !mp.IsOwner(r.Header.Get("Authorization")) {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]any{"ok": false, "message": "管理员 token 无效"})
			return
		}
		downloaded, err := update.CheckAndDownload(r.Context())
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]any{"ok": false, "message": err.Error(), "timestamp": time.Now().Format(time.RFC3339)})
			return
		}
		if downloaded {
			json.NewEncoder(w).Encode(map[string]any{"ok": true, "message": "更新已下载，重启后生效", "timestamp": time.Now().Format(time.RFC3339)})
			return
		}
		json.NewEncoder(w).Encode(map[string]any{"ok": true, "message": "当前已是最新，无需更新", "timestamp": time.Now().Format(time.RFC3339)})
	})
	mux.HandleFunc("/app.restart", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		if !mp.IsLocalRequest(r) && !mp.IsOwner(r.Header.Get("Authorization")) {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]any{"ok": false, "message": "管理员 token 无效"})
			return
		}
		json.NewEncoder(w).Encode(map[string]any{"ok": true, "message": "服务即将重启", "timestamp": time.Now().Format(time.RFC3339)})
		go func() {
			time.Sleep(500 * time.Millisecond)
			os.Exit(0)
		}()
	})

	// /api.testnet.gas 向指定地址发送少量 Base Sepolia Gas
	mux.HandleFunc("/api.testnet.gas", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		pk := strings.TrimSpace(os.Getenv("PRIVATE_KEY"))
		if pk == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]any{"ok": false, "message": "请在 .env 文件设置 PRIVATE_KEY"})
			return
		}
		address := mp.GetAddress(r.Header.Get("Authorization"))
		if address == "" {
			http.Error(w, "token 无效", http.StatusBadRequest)
			return
		}

		RPC := "https://sepolia.base.org"
		client, err := ethclient.Dial(RPC)
		if err != nil {
			http.Error(w, "连接 RPC 失败 "+err.Error(), http.StatusInternalServerError)
			return
		}
		balance, err := client.BalanceAt(r.Context(), common.HexToAddress(address), nil)
		if err != nil {
			http.Error(w, "查询余额失败 "+err.Error(), http.StatusInternalServerError)
			return
		}
		if balance.Sign() > 0 {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]any{"ok": false, "message": fmt.Sprintf("余额 %s 大于 0, 无需领取 Gas", weiToEther(balance))})
			return
		}
		privateKey, err := crypto.HexToECDSA(strings.TrimPrefix(pk, "0x"))
		if err != nil {
			http.Error(w, "私钥解析失败 "+err.Error(), http.StatusInternalServerError)
			return
		}
		fromAddress := crypto.PubkeyToAddress(privateKey.PublicKey)
		nonce, err := client.PendingNonceAt(r.Context(), fromAddress)
		if err != nil {
			http.Error(w, "查询 nonce 失败 "+err.Error(), http.StatusInternalServerError)
			return
		}
		gasPrice, err := client.SuggestGasPrice(r.Context())
		if err != nil {
			http.Error(w, "查询 gasPrice 失败 "+err.Error(), http.StatusInternalServerError)
			return
		}
		chainID, err := client.NetworkID(r.Context())
		if err != nil {
			http.Error(w, "查询 chainID 失败 "+err.Error(), http.StatusInternalServerError)
			return
		}
		// 转账金额：0.00001976 ETH
		value := etherToWei("0.00001976")
		to := common.HexToAddress(address)
		tx := types.NewTransaction(nonce, to, value, 21000, gasPrice, nil)
		signer := types.LatestSignerForChainID(chainID)
		signedTx, err := types.SignTx(tx, signer, privateKey)
		if err != nil {
			http.Error(w, "签名交易失败 "+err.Error(), http.StatusInternalServerError)
			return
		}
		if err = client.SendTransaction(r.Context(), signedTx); err != nil {
			http.Error(w, "发送交易失败 "+err.Error(), http.StatusInternalServerError)
			return
		}
		receipt, err := waitReceipt(r.Context(), client, signedTx.Hash())
		if err != nil {
			http.Error(w, "等待交易失败 "+err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(map[string]any{"ok": true, "message": "Gas 领取成功", "txHash": signedTx.Hash().Hex(), "status": receipt.Status})
	})
}

// getEnv 读取环境变量，若为空则返回默认值。
func getEnv(key, def string) string {
	v := strings.TrimSpace(os.Getenv(key))
	if v != "" {
		return v
	}
	return def
}

// /api.testnet.gas 辅助函数
// weiToEther 将 Wei 转换为 Ether 字符串（保留 18 位小数）。
func weiToEther(wei *big.Int) string {
	f := new(big.Float).SetInt(wei)
	eth := new(big.Float).Quo(f, big.NewFloat(1e18))
	return eth.Text('f', 18)
}

// etherToWei 将字符串形式的 Ether 转换为 Wei。
func etherToWei(s string) *big.Int {
	f, _, err := big.ParseFloat(s, 10, 256, big.ToNearestEven)
	if err != nil {
		return big.NewInt(0)
	}
	f.Mul(f, big.NewFloat(1e18))
	out, _ := f.Int(nil)
	return out
}

// waitReceipt 轮询等待交易回执，最多 60 秒。
func waitReceipt(ctx context.Context, c *ethclient.Client, h common.Hash) (*types.Receipt, error) {
	for i := 0; i < 60; i++ {
		rc, err := c.TransactionReceipt(ctx, h)
		if rc != nil {
			return rc, nil
		}
		if err != nil && err.Error() != "not found" {
			return nil, err
		}
		time.Sleep(1 * time.Second)
	}
	return nil, fmt.Errorf("receipt timeout")
}
