Confirm signup

```html
<h2
  style="color:#333;font-family:Arial,sans-serif;font-size:24px;margin:0 0 20px 0;text-align:center"
>
  验证码 {{ .Token }}
</h2>
<p
  style="color:#666;font-family:Arial,sans-serif;font-size:16px;line-height:1.5;margin:0 0 20px 0;text-align:center"
>
  或使用下方链接完成账户激活
</p>
<div
  class="url-box"
  role="textbox"
  aria-label="确认链接"
  style="background-color:#f8f9fa;border:1px solid #dee2e6;border-radius:5px;padding:15px;margin:20px auto;font-family:monospace;font-size:14px;color:#495057;word-break:break-all;text-align:center;max-width:600px"
>
  {{ .ConfirmationURL }}
</div>
<div style="text-align:center;margin:20px 0">
  <a
    href="{{ .ConfirmationURL }}"
    target="_blank"
    style="background-color:#007bff;color:#fff;padding:8px 16px;text-decoration:none;border-radius:5px;font-family:Arial,sans-serif;font-size:16px;display:inline-block"
    >直接打开</a
  >
</div>
```

HTML 压缩
https://tool.lu/html/
