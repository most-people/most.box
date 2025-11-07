// Package abi 提供合约 ABI 的嵌入与访问。
package abi

import _ "embed"

//go:embed DotContractABI.json
var DotContractABI []byte // Dot 合约 ABI 的 JSON 数据（嵌入）
