const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');


const app = express();

const argv = yargs(hideBin(process.argv))
  .option('port', {
    alias: 'p',
    type: 'number',
    description: 'Server port',
    default: 3000
  })
  .option('folderToUpload', {
    alias: 'f',
    type: 'string',
    description: 'Folder to upload files to',
    default: 'uploads'
  })
  .help()
  .alias('help', 'h')
  .argv;


const port = argv.port;
const uploadPath = argv.folderToUpload;

// 设置存储方式
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
		const dir = path.join(__dirname, uploadPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir);
		}
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, `${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 文件上传接口
app.post('/upload', upload.single('file'), (req, res) => {
  res.send('File uploaded successfully');
});

app.listen(port, () => {
  console.log(`
		Server is running on http://localhost:${port}
		upload file through http://public_ip:${port}
		`);
});
