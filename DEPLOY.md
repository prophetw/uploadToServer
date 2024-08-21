# 部署

## 环境

> nodejs 16.20.2 版本

```bash
# install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# install nodejs
nvm install 16.20.2

```

## 部署

```bash
node -v 
# 16.20.2

# install pm2
npm install pm2 -g

# 使用 pm2 配置自启动
# -p 端口号
# -f 上传的文件夹路径
pm2 start index.js --name GisUploadService -- -p 3022 -f /root/code/uploadToServer/uploads/
```

### 以上示例中的 3022 或者 代理之后的端口需要暴露在外网，用于接收上传文件。