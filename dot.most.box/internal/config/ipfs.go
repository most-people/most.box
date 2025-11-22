package config

import (
	"dotmostbox/internal/update"

	shell "github.com/ipfs/go-ipfs-api"
)

func IPFSAPIBase() string {
	return "http://127.0.0.1:5001"
}

func NewIPFSShell() *shell.Shell {
	return shell.NewShell(IPFSAPIBase())
}
