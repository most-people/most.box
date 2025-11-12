package mp

import (
	"context"
	"fmt"
	"math/big"
	"os"
	"strings"
	"time"

	contractabi "dotmostbox/internal/abi"

	ethabi "github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	shell "github.com/ipfs/go-ipfs-api"
)

// dotContractAddress Dot 合约地址（Base 网络）。
const dotContractAddress = "0xB67662F0d2BB106B055503062e1dba4f072f5781"

// Dot 表示链上记录的节点信息。
type Dot struct {
	Address    string   `json:"address"`
	Name       string   `json:"name"`
	APIs       []string `json:"APIs"`
	CIDs       []string `json:"CIDs"`
	LastUpdate uint64   `json:"lastUpdate"`
}

// GetIP 使用 IPFS 节点与已发现的接口构建当前节点信息。
func GetIP() (name string, apis []string, cids []string, err error) {
	ipfsShell := shell.NewShell("http://127.0.0.1:5001")
	idInfo, ipfsErr := ipfsShell.ID()
	if ipfsErr != nil {
		err = ipfsErr
		return
	}
	peer := idInfo.ID
	dotName := strings.TrimSpace(os.Getenv("DOT_NAME"))
	if dotName == "" {
		dotName = "Unknown"
	}
	name = dotName + "-" + peer
	// API 列表：先添加环境变量中的地址，再追加已发现的 IPv6（跳过 ::1）
	netInfo := Network()
	apis = []string{}
	if v := strings.TrimSpace(os.Getenv("API_URLS")); v != "" {
		apis = append(apis, splitNonEmpty(v)...)
	}
	if len(netInfo.IPv6) > 1 {
		apis = append(apis, netInfo.IPv6[1:]...)
	}
	cids = []string{}
	if v := strings.TrimSpace(os.Getenv("CID_URLS")); v != "" {
		cids = append(cids, splitNonEmpty(v)...)
	}
	return
}

func splitNonEmpty(c string) []string {
	parts := strings.Split(c, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			out = append(out, part)
		}
	}
	return out
}

// PostIP 在信息发生变化且余额充足时，向指定 RPC 的合约上链当前节点信息。
func PostIP(rpc string) error {
	privateKeyHex := strings.TrimSpace(os.Getenv("PRIVATE_KEY"))
	dotName := strings.TrimSpace(os.Getenv("DOT_NAME"))
	apiUrls := strings.TrimSpace(os.Getenv("API_URLS"))
	if privateKeyHex == "" || dotName == "" || apiUrls == "" {
		return fmt.Errorf("请在 .env 文件设置 PRIVATE_KEY, DOT_NAME 和 API_URLS")
	}
	name, apis, cids, err := GetIP()
	if err != nil {
		return fmt.Errorf("获取节点信息失败: %w", err)
	}

	client, err := ethclient.Dial(rpc)
	if err != nil {
		return fmt.Errorf("连接 RPC 失败: %w", err)
	}
	defer client.Close()

	abiDef, err := ethabi.JSON(strings.NewReader(string(contractabi.DotContractABI)))
	if err != nil {
		return fmt.Errorf("解析 ABI 失败: %w", err)
	}
	contractAddress := common.HexToAddress(dotContractAddress)
	contract := bind.NewBoundContract(contractAddress, abiDef, client, client, client)

	// 钱包初始化
	privateKey, err := crypto.HexToECDSA(strings.TrimPrefix(privateKeyHex, "0x"))
	if err != nil {
		return fmt.Errorf("私钥解析失败: %w", err)
	}
	fromAddress := crypto.PubkeyToAddress(privateKey.PublicKey)

	// 读取当前链上记录
	var callOutput []any
	call := &bind.CallOpts{Pending: false, From: fromAddress}
	if err = contract.Call(call, &callOutput, "getDot", fromAddress); err != nil {
		return fmt.Errorf("读取合约失败: %w", err)
	}
	var curName string
	var curAPIs, curCIDs []string
	if len(callOutput) >= 3 {
		if v, ok := callOutput[0].(string); ok {
			curName = v
		}
		if v, ok := callOutput[1].([]string); ok {
			curAPIs = v
		}
		if v, ok := callOutput[2].([]string); ok {
			curCIDs = v
		}
	}
	if curName == name && equalStrings(curAPIs, apis) && equalStrings(curCIDs, cids) {
		return nil // 无变化
	}

	// 通过 bind 发送交易（内部进行 Gas 估算）
	ctx := context.Background()
	chainID, err := client.NetworkID(ctx)
	if err != nil {
		return fmt.Errorf("查询 chainID 失败: %w", err)
	}
	transactOptions, err := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	if err != nil {
		return fmt.Errorf("创建交易选项失败: %w", err)
	}
	transaction, err := contract.Transact(transactOptions, "setDot", name, apis, cids)
	if err != nil {
		return fmt.Errorf("发送交易失败: %w", err)
	}
	// 等待交易回执
	for i := 0; i < 60; i++ {
		receipt, err := client.TransactionReceipt(ctx, transaction.Hash())
		if receipt != nil {
			return nil
		}
		if err != nil && !strings.Contains(strings.ToLower(err.Error()), "not found") {
			return err
		}
		time.Sleep(time.Second)
	}
	return fmt.Errorf("等待交易回执超时")
}

func equalStrings(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

// GetAllDots 从 Base 主网读取所有节点信息。
func GetAllDots() ([]Dot, error) {
	rpc := "https://mainnet.base.org"
	client, err := ethclient.Dial(rpc)
	if err != nil {
		return nil, err
	}
	defer client.Close()
	abiDef, err := ethabi.JSON(strings.NewReader(string(contractabi.DotContractABI)))
	if err != nil {
		return nil, err
	}
	contractAddress := common.HexToAddress(dotContractAddress)
	contract := bind.NewBoundContract(contractAddress, abiDef, client, client, client)
	var result []interface{}
	if err := contract.Call(&bind.CallOpts{}, &result, "getAllDots"); err != nil {
		return nil, err
	}
	var addresses []common.Address
	var names []string
	var apiLists [][]string
	var cidLists [][]string
	var updates []*big.Int
	if len(result) >= 5 {
		if v, ok := result[0].([]common.Address); ok {
			addresses = v
		}
		if v, ok := result[1].([]string); ok {
			names = v
		}
		if v, ok := result[2].([][]string); ok {
			apiLists = v
		}
		if v, ok := result[3].([][]string); ok {
			cidLists = v
		}
		if v, ok := result[4].([]*big.Int); ok {
			updates = v
		}
	}
	dots := make([]Dot, 0, len(addresses))
	for i := range addresses {
		dots = append(dots, Dot{
			Address:    addresses[i].Hex(),
			Name:       firstOrEmpty(names, i),
			APIs:       firstOrEmptySlice(apiLists, i),
			CIDs:       firstOrEmptySlice(cidLists, i),
			LastUpdate: toUint64(firstOrZero(updates, i)),
		})
	}
	return dots, nil
}

func firstOrEmpty(values []string, index int) string {
	if index < len(values) {
		return values[index]
	}
	return ""
}
func firstOrEmptySlice(values [][]string, index int) []string {
	if index < len(values) {
		return values[index]
	}
	return []string{}
}
func firstOrZero(values []*big.Int, index int) *big.Int {
	if index < len(values) && values[index] != nil {
		return values[index]
	}
	return big.NewInt(0)
}
func toUint64(value *big.Int) uint64 {
	if value == nil {
		return 0
	}
	return value.Uint64()
}
