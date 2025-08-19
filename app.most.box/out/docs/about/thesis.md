# 技术架构 - 顶层设计

Most People 是基于数学和密码学的密码朋克精神指引下的去中心化应用。

## 基于数学和密码学实现无法破解的，军用级别加密算法

目前已经实现第一版 mp://1. 加密算法，具体代码如下

```ts
// password 推荐使用较长的中文、甚至 Emoji 来大幅度增加破解难度
const mp = {
  // 本地私钥
  async key(username: string, password: string) {
    const p = toUtf8Bytes(password);
    const salt = toUtf8Bytes("/mp/" + username);
    const kdf = pbkdf2(p, salt, 1, 256 / 8, "sha512");
    const privateKey = sha256(kdf);
    // x25519 key
    await sodium.ready;
    const seed = sodium.from_string(privateKey);
    const keyData = sodium.crypto_generichash(32, seed);
    const keyPair = sodium.crypto_box_seed_keypair(keyData);

    const public_key = sodium.to_hex(keyPair.publicKey);
    const private_key = sodium.to_hex(keyPair.privateKey);

    // AES-GCM key
    const keydata = toUtf8Bytes(privateKey).slice(-32);
    // https://gist.github.com/pedrouid/b4056fd1f754918ddae86b32cf7d803e#aes-gcm
    const key = await window.crypto.subtle.importKey(
      "raw",
      keydata,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );

    // wallet all in one
    const mnemonic = Mnemonic.entropyToPhrase(
      toUtf8Bytes(privateKey).slice(-16)
    );
    const wallet = HDNodeWallet.fromPhrase(mnemonic);
    const address = wallet.address;

    // token
    const message = String(dayjs().unix());
    const sig = await wallet.signMessage(message);
    const token = [message, sig].join();

    return { key, address, token, mnemonic, public_key, private_key };
  },
};
```

复杂密码的一些关键点：

如：**狼虫虎豹+-\*/🐺🐛🐯🐆**
或是一段话：**打得那狼虫虎豹，无处躲！**

密码的复杂性：结合中文字符、特殊符号和 Emoji，显著增加了潜在的字符集大小。这意味着破解所需尝试的可能组合数量巨大。

攻击方法：

**暴力破解**：这种方法涉及尝试所有可能的密码组合，直到找到正确的那一个。考虑到您的密码的长度和字符集复杂性，暴力破解此密码几乎是不可行的，即使使用强大的计算资源。

**字典攻击**：由于密码使用了非常规字符和组合，标准的字典攻击方法不太可能成功。

**社会工程**：如果攻击者采用社会工程技巧或通过其他途径获取密码提示或部分信息，这可能是破解的薄弱环节。

**计算资源**：即使对于拥有大量计算资源的攻击者（例如，使用专门的硬件），破解这样的密码也可能需要不切实际的长时间，可能是数十年甚至更长。

综上所述，破解出的这样一个复杂的密码需要极其长的时间，在实际情况下是不可行的。然而，密码的安全性最重要的还是将秘钥【**只保存大脑中，不记录在任何地方**】。

SEA

2024 年 9 月 25 日 拂晓 4 点 29 分
