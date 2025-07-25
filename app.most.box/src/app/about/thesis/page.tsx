import { AppHeader } from "@/components/AppHeader";
import { Box, Image } from "@mantine/core";

export default function PageAbout() {
  return (
    <Box px={20} maw={1280}>
      <AppHeader title="论文" />

      <h2>
        论如何利用 IPFS + Fastify + Smart Contracts
        构建完全不需要后端的去中心化应用
      </h2>
      <p>作者：Most.Box</p>
      <p>为了跟大家讲清楚，需要了解一定基础知识， 若你已经了解，请跳过</p>
      <p>目录</p>
      <p>1. 去中心化密码朋克</p>
      <p>2. IPFS</p>
      <p>3. Most.Box</p>
      <p>4. 我们需要你一起添砖加瓦</p>

      <h3>去中心化</h3>
      <p>
        通俗地讲，就是每个人都是中心，每个人都可以连接并影响其他节点，这种扁平化、开源化、平等化的现象或结构。
        <br />
        去中心化代表的是言论自由，信息公开透明，保护个人隐私。你可以不相信任何个人或组织，但你可以永远相信数学。
        <br />
        因为不论在任何宇宙，任何表达方式，同等条件数学结果都是恒定不变的。
      </p>
      <h3>密码朋克</h3>
      <p>
        热衷于使用加密技术保护隐私的人们，他们相信通过技术而不是法律，才能真正保障个人信息的安全和自由。
        <br />
        最简单的例子就是中本聪，他无人不知无人不晓，却也无人知晓他是谁。
      </p>

      <h3>IPFS 星际文件系统</h3>

      <p>观察这个图片：</p>
      <p>
        https://cid.most.red/ipfs/QmNpwZFhWg1PqPu7TxgSshhYPpUXwSqj9PxSwXRegMaoGS
      </p>
      <p>
        <Image
          src="https://cid.most.red/ipfs/QmNpwZFhWg1PqPu7TxgSshhYPpUXwSqj9PxSwXRegMaoGS"
          alt="IPFS"
        />
      </p>
      <p>
        我们可以把任意文件（如图片、视频、网站…）想象成一本书。把 IPFS
        想象成一座图书馆。
        当我们把书在自己的图书馆后，当其它人得知你有这本书，就会把书复制一份带回自己的图书馆。
        如果大家都喜欢这本书，越来越多的人把这本书带会自己的图书馆，那么世界各地都会有这本书，你之前可能要去国外才能读到的书，现在只需要去一趟镇上就能拿到。
      </p>
      <p>
        IPFS 网络负责告诉离你最近的书在哪里。 IPFS 每个文件有一个 CID
        就是文件的身份证号，上文中 QmNpw...MaoGS 就是这个文件的
        CID，它的容量很大，大到足以给地球上的每一粒沙子发身份证号。
      </p>
    </Box>
  );
}
