```txt
npm install
npm run dev
```

```txt
npm run deploy
```

[运行以下命令以根据您的 Worker 配置生成/同步类型](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

在实例化 `Hono` 时将 `CloudflareBindings` 作为泛型传递：

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>();
```
