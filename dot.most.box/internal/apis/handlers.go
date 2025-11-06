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
	"path/filepath"
	"strings"
	"time"

	"context"
	"dotmostbox/internal/mp"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	shell "github.com/ipfs/go-ipfs-api"
)

func Register(mux *http.ServeMux, sh *shell.Shell) {
	// /api.dot
	mux.HandleFunc("/api.dot", func(w http.ResponseWriter, r *http.Request) {
		out, err := sh.ID()
		if err != nil {
			http.Error(w, "IPFS 未就绪: "+err.Error(), http.StatusServiceUnavailable)
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
			// prepend env APIs
			apis = append(parts, apis...)
		}
		cids := []string{}
		if v := getEnv("CID_URLS", ""); v != "" {
			cids = append(strings.Split(v, ","), cids...)
		}
		json.NewEncoder(w).Encode(map[string]any{"name": name, "APIs": apis, "CIDs": cids})
	})

	// /api.TRNG
	mux.HandleFunc("/api.TRNG", func(w http.ResponseWriter, r *http.Request) {
		var b [8]byte
		if _, err := rand.Read(b[:]); err != nil {
			http.Error(w, "随机数生成失败", http.StatusInternalServerError)
			return
		}
		iohex := hex.EncodeToString(b[:])
		w.Write([]byte(iohex))
	})

	// /api.git
	mux.HandleFunc("/api.git", func(w http.ResponseWriter, r *http.Request) {
		out, err := exec.Command("git", "remote", "-v").CombinedOutput()
		if err != nil {
			w.Write(out)
			return
		}
		w.Write(out)
	})

	// /api.deploy
	mux.HandleFunc("/api.deploy", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPut {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		log := []string{}
		isOwner := mp.IsOwner(r.Header.Get("Authorization"))
		if !isOwner {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]any{"ok": false, "message": "管理员 token 无效"})
			return
		}
		// repo root: parent of current working dir (expecting cwd at go)
		wd, _ := os.Getwd()
		root := filepath.Dir(wd)
		// 0. git checkout .
		log = append(log, "执行 git checkout . (忽略本地修改)")
		if out, err := exec.Command("git", "checkout", ".").CombinedOutput(); err == nil {
			log = append(log, fmt.Sprintf("Git checkout: %s", strings.TrimSpace(string(out))))
		} else {
			log = append(log, fmt.Sprintf("Git checkout ERR: %s", strings.TrimSpace(string(out))))
		}
		// 1. git pull
		log = append(log, "执行 git pull...")
		gitCmd := exec.Command("git", "pull")
		gitCmd.Dir = root
		gitOut, gitErr := gitCmd.CombinedOutput()
		if gitErr != nil {
			log = append(log, fmt.Sprintf("Git ERR: %s", gitErr.Error()))
		}
		log = append(log, fmt.Sprintf("Git: %s", strings.TrimSpace(string(gitOut))))
		if strings.Contains(string(gitOut), "Already up") {
			json.NewEncoder(w).Encode(map[string]any{"ok": true, "message": "无需部署", "log": log, "timestamp": time.Now().Format(time.RFC3339)})
			return
		}
		// 2. npm install
		log = append(log, "执行 npm install...")
		npm := exec.Command("npm", "i")
		npm.Dir = root
		npmOut, npmErr := npm.CombinedOutput()
		if npmErr != nil {
			log = append(log, fmt.Sprintf("NPM ERR: %s", npmErr.Error()))
		}
		log = append(log, fmt.Sprintf("NPM: %s", strings.TrimSpace(string(npmOut))))
		// 3. pm2 reload all
		log = append(log, "执行 pm2 reload all...")
		pm2 := exec.Command("pm2", "reload", "all")
		pm2Out, pm2Err := pm2.CombinedOutput()
		if pm2Err != nil {
			log = append(log, fmt.Sprintf("PM2 ERR: %s", pm2Err.Error()))
		}
		log = append(log, fmt.Sprintf("PM2: %s", strings.TrimSpace(string(pm2Out))))
		log = append(log, "部署完成！")
		json.NewEncoder(w).Encode(map[string]any{"ok": true, "message": "部署成功", "log": log, "timestamp": time.Now().Format(time.RFC3339)})
	})

	// /api.testnet.gas
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
		// 0.00001976 ETH
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

func getEnv(key, def string) string {
	v := strings.TrimSpace(os.Getenv(key))
	if v != "" {
		return v
	}
	return def
}

// helpers for /api.testnet.gas
func weiToEther(wei *big.Int) string {
	f := new(big.Float).SetInt(wei)
	eth := new(big.Float).Quo(f, big.NewFloat(1e18))
	return eth.Text('f', 18)
}

func etherToWei(s string) *big.Int {
	f, _, err := big.ParseFloat(s, 10, 256, big.ToNearestEven)
	if err != nil {
		return big.NewInt(0)
	}
	f.Mul(f, big.NewFloat(1e18))
	out, _ := f.Int(nil)
	return out
}

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
