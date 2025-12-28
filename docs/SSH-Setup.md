# GitHub SSH 连接说明 (443 端口)

本项目已将远程地址切换为 SSH，并通过 443 端口访问：

- 主机：`ssh.github.com`
- 端口：`443`
- 配置文件：用户目录 `~/.ssh/config`

示例配置：

```
Host github.com
  HostName ssh.github.com
  User git
  Port 443
```

## 公钥保存
- 你的当前公钥已另存为本地文件：`docs/github-ssh-key.pub`，仅作说明与备份。
- 为避免误提交，`docs/.gitignore` 已忽略 `*.pub`。
- 请仍以 GitHub 账户设置中的 SSH Keys 为准：https://github.com/settings/keys

## 使用步骤
1. 将 `docs/github-ssh-key.pub` 内容粘贴到 GitHub 的 SSH Keys（Title 任意）。
2. 终端验证：
   ```powershell
   ssh -T git@github.com
   ```
   若返回 `Hi <username>! You've successfully authenticated...` 即成功。
3. 拉取代码：
   ```powershell
   git pull --tags origin main
   ```

## 常见问题
- 若 `Permission denied (publickey)`：说明还未将公钥添加到 GitHub 或添加的不是当前密钥。
- 若 HTTPS 443 拉取失败：使用上述 SSH 配置，即可通过 443 端口连通。
