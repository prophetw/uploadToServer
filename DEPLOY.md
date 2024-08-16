# Deploy

> Env
* NodeJS 16.20.2
* geoserver 2.25.3
* pm2 
  
> Port
* 


```bash

# install docker
sudo yum install docker -y

# install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# install nodejs
nvm install 16.20.2

# install pm2
npm install pm2 -g

# 使用 pm2 配置自启动
pm2 start index.js

```