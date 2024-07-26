const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const unzipper = require('unzipper');


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
const absoluteUploadPath = argv.folderToUpload || path.join(__dirname, 'uploads');

// 设置存储方式
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(absoluteUploadPath);
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

// 把 uploads 目录设置为静态文件目录 用户访问 /uploads 可以访问到 uploads 目录下的文件
app.use('/uploads', express.static(path.join(absoluteUploadPath)));


const isFileZip = (file) => {
  return file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed';
}
// 文件上传接口
app.post('/upload', upload.array('files'), (req, res) => {
  res.send('Files uploaded successfully');
  // 如果文件是 zip 格式，解压缩，并且删除原文件
  const files = req.files;
  files.forEach((file) => {
    if (isFileZip(file)) {
      const filePath = path.join(absoluteUploadPath, file.originalname);
      const unzipPath = path.join(absoluteUploadPath, file.originalname.split('.')[0]);
      try {
        fs.mkdirSync(unzipPath);
        fs.createReadStream(filePath).pipe(unzipper.Extract({ path: unzipPath }))
          .on('close', () => {
            // 解压完成后删除原文件
            fs.unlinkSync(filePath);
            console.log(`Unzipped and deleted: ${file.originalname}`);
          })
          .on('error', (err) => {
            console.error(`Error unzipping file ${file.originalname}:`, err);
          });

      } catch (error) {
        console.error(`Error unzipping file ${file.originalname}:`, error);
      }
    }
  });
});

app.listen(port, () => {
  console.log(`
		Server is running on http://localhost:${port}
		upload file through http://public_ip:${port}
		`);
});
