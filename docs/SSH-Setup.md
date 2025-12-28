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

## 首次连接与主机指纹验证
首次使用 SSH 连接到 GitHub，可能会看到如下提示：

```
The authenticity of host 'github.com (..)' can't be established.
ED25519 key fingerprint is: SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

说明：这是安全确认，需核对主机指纹。GitHub 官方 ED25519 指纹为：`SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU`，与提示一致即可输入 `yes` 继续。

参考：GitHub 官方指纹文档（含 RSA/ECDSA/ED25519）
https://docs.github.com/zh/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints

### 避免交互提示：预置 known_hosts
如需避免每次首次连接的交互，可预置主机条目到 `~/.ssh/known_hosts`。

方法一（推荐）：自动拉取并写入

```powershell
$sshDir = Join-Path $env:USERPROFILE ".ssh"
$known = Join-Path $sshDir "known_hosts"
if (!(Test-Path $sshDir)) { New-Item -ItemType Directory -Path $sshDir | Out-Null }
if (!(Test-Path $known)) { New-Item -ItemType File -Path $known | Out-Null }
ssh-keyscan github.com | Out-File -Append -Encoding ASCII $known
ssh-keyscan -p 443 ssh.github.com | Out-File -Append -Encoding ASCII $known
```

方法二（手动）：将 GitHub 文档提供的公钥条目追加到 `known_hosts`（含 `github.com` 以及 `[ssh.github.com]:443`）。

## 仓库迁移与远程地址更新
若推送出现如下提示：

```
remote: This repository moved. Please use the new location:
remote:   git@github.com:<owner>/<new-repo>.git
```

请更新本地远程地址，避免重定向导致的弹窗或卡顿：

```powershell
cd "D:\ZYQQ仓库\English change"
git remote set-url origin git@github.com:zhengziyan-learner/English-to-audio-conversion.git
git remote -v
git push origin main
```

说明：本项目的旧远程为 `git@github.com:zhengziyan-learner/English-change.git`，已迁移至新仓库 `git@github.com:zhengziyan-learner/English-to-audio-conversion.git`。
//该行用于提交更改测试