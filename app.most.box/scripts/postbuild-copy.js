// Copy app.most.box/out -> dot.most.box/cmd/server/out after build
// Cross-platform Node script using fs.rm and fs.cp (Node >=16.7)

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

async function main() {
  const srcDir = path.resolve(__dirname, "..", "out");
  const destDir = path.resolve(
    __dirname,
    "..",
    "..",
    "dot.most.box",
    "cmd",
    "server",
    "out"
  );

  if (!fs.existsSync(srcDir)) {
    console.error(`[postbuild-copy] 源目录不存在: ${srcDir}`);
    process.exit(1);
  }

  try {
    console.log(`[postbuild-copy] 清理目标目录: ${destDir}`);
    await fsp.rm(destDir, { recursive: true, force: true });
  } catch (err) {
    // ignore
  }

  await fsp.mkdir(destDir, { recursive: true });

  console.log(`[postbuild-copy] 复制内容: ${srcDir} -> ${destDir}`);
  await fsp.cp(srcDir, destDir, { recursive: true, force: true });

  console.log(`[postbuild-copy] 完成`);
}

main().catch((err) => {
  console.error("[postbuild-copy] 出错:", err);
  process.exit(1);
});

