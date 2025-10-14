# [IPFS Cluster 集群](https://ipfscluster.io)

健康检查：http://localhost:9094/health/graph

集群密钥生成：（所有节点必须使用相同密钥）

```powershell
$b = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
($b | ForEach-Object { $_.ToString('x2') }) -join ''
```

IPFS 集群 API 文档：
https://ipfscluster.io/documentation/reference/api/

1. 上传文件到某个节点获取 CID
2. IPFS 集群 PIN 该 CID 以保持文件在集群中
3. 取消 PIN 该 CID 以释放节点
