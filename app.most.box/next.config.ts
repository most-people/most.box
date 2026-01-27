import type { NextConfig } from "next";
import TerserPlugin from "terser-webpack-plugin";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  devIndicators: false,
  // 必须：强制转译所有 polkadot 相关包
  // transpilePackages: [
  //   "@polkadot/api",
  //   "@polkadot/keyring",
  //   "@polkadot/util",
  //   "@polkadot/util-crypto",
  //   "@polkadot/networks",
  //   "@polkadot/types",
  // ],
  webpack(config, { isServer }) {
    // 处理 .mjs 的解析问题
    // config.module.rules.push({
    //   test: /\.mjs$/,
    //   include: /node_modules/,
    //   type: "javascript/auto",
    //   resolve: {
    //     fullySpecified: false,
    //   },
    // });
    // 生产环境下强制使用 Terser 替换 SWC 混淆
    if (!isServer && process.env.NODE_ENV === "production") {
      config.optimization.minimizer = [
        new TerserPlugin({
          terserOptions: {
            format: {
              ascii_only: true, // 解决 @polkadot 八进制转义报错的核心
            },
          },
        }),
      ];
    }

    config.module.rules.push({
      test: /\.md$/,
      type: "asset/source",
    });
    config.module.rules.push({
      test: /\.svg$/,
      use: [
        {
          loader: "@svgr/webpack",
          options: {
            icon: true,
          },
        },
      ],
    });
    return config;
  },
  turbopack: {
    rules: {
      "*.svg": {
        loaders: [
          {
            loader: "@svgr/webpack",
            options: {
              icon: true,
            },
          },
        ],
        as: "*.js",
      },
      "*.md": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
