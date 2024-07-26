## Upload to server
> http upload file to server(with public ip)
> multiple file upload supported


### Usage
```bash
node index.js -h
```

### Start server
```bash
node index.js


#  启动 8092 端口，并且上传文件到 C:\Users\ 目录
node "index.js" -p 8092 -f "/root/code/uploadToServer"
```

### Upload file from client browser
> open browser and type `http://{server_public_ip}:3000`
