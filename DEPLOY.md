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

1. 把 GisUpload.zip 上传到服务器，解压
2. 进入 GisUpload 目录

```bash
node -v 
# 16.20.2

# install pm2
npm install pm2 -g

# 使用 pm2 配置自启动
# -p 端口号 需要开放的端口号
# -f 上传的文件夹路径 需要上传到对应的目录
pm2 start index.js --name GisUploadService -- -p 3022 -f /root/code/uploadToServer/uploads/
```

### 以上示例中的 3022 或者 代理之后的端口需要暴露在外网，用于接收上传文件。


## 前端页面 motor-center或center-new 的包

> 根目录有一个 config.js 

```js
const Config = (window.Config = {
  serviceUrl: 'http://192.168.2.59:8765/motor/v2', // Java 服务地址
  staticPath: '/rf/resource/read', // 静态资源路径
  // ...

  gisUploadBaseUrl: 'https://saas_url:3022', //  gis 上传服务地址基础路径
  geoServerBaseUrl: 'https://配置成对应的geoserver地址', // gis 地图服务地址基础路径

})

```