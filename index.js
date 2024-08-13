const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const unzipper = require('unzipper');
const Datastore = require('nedb');
const cors = require('cors');
// const bodyParser = require('body-parser');

const dftResponse = {
  code: 200,
  message: 'success',
  data: null
}

const dftError = {
  code: 500,
  message: 'error',
  data: null
}

const app = express();
app.use(cors());
// 对于 Express 4.16.0 或更高版本，可以直接使用内置的 express.json() 和 express.urlencoded()
app.use(express.json()); // 用于解析 application/json
app.use(express.urlencoded({ extended: true })); // 用于解析 application/x-www-form-urlencoded


// 创建并加载数据库
const db = new Datastore({ filename: 'gis_data.db', autoload: true });

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


app.get('/list', (req, res) => {
  const token = req.headers['access-token'];
  if(!token){
    const errRes = {...dftError};
    errRes.code = 401;
    errRes.message = 'token is required';
    res.send('token is required');
    return 
  }
  const response = {...dftResponse};
  db.find({}, (err, docs) => {
    if (err) {
      console.error('Error getting file list:', err);
      res.send('Error getting file list');
    } else {
      response.data = docs;
      res.send(response);
    }
  });
});

app.post('/page/:page', (req, res) => {

// {
//      companyName: 'test',
//      projectName: '',
//      fileName: '',
//      createDate: '',
//      createUser: '',
//      url: '',
// }


  const page = req.params.page;
  // filter by createUser 
  const body = req.body || {};
  const createUser = body.createUser;
  const pageSize = body.pageSize || 10;
  const limit = pageSize;
  if(!createUser){
    res.send('user info ');
    return
  }
  db.find({createUser: createUser}).skip((page - 1) * limit).limit(limit).exec((err, docs) => {
    if (err) {
      console.error('Error getting file list:', err);
      res.send('Error getting file list');
    } else {

      const response = {...dftResponse};
      response.data = docs;
      res.send(response);
    }
  });
});


// 文件上传接口
app.post('/upload', upload.array('files'), (req, res) => {
  res.send('Files uploaded successfully');
  // 如果文件是 zip 格式，解压缩，并且删除原文件
  const files = req.files;
  // const name = req.body.name || 'unknown';
  const token = req.headers['access-token'];
  // const files = req.body.file;
  const companyName = req.body.companyName || 'unknown';
  const projectName = req.body.projectName || 'unknown';
  // const createDate = new Date().toLocaleDateString().replace(/\//g, '-');
  const options = { year: 'numeric', month: 'numeric', day: 'numeric' };
  const formattedDate = new Date().toLocaleDateString('zh-CN', options).replace(/\//g, '-');
  const createDate = formattedDate;

  const createUser = req.body.createUser;
  const body = {
    companyName,
    projectName,
    createDate,
    createUser,
  }


  const response = {...dftResponse};
  const errRes = {...dftError};
  const responseAry = []

  files.forEach((file) => {
    if (isFileZip(file)) {
      const filePath = path.join(absoluteUploadPath, file.originalname);
      const folderName = file.originalname.split('.')[0] + '_' + Date.now();
      const unzipPath = path.join(absoluteUploadPath, folderName)
      try {
        fs.mkdirSync(unzipPath);
        fs.createReadStream(filePath).pipe(unzipper.Extract({ path: unzipPath }))
          .on('close', () => {
            // 解压完成后删除原文件
            // fs.unlinkSync(filePath);
            console.log(`Unzipped and deleted: ${file.originalname}`);

            // 保存文件信息到数据库
            db.insert({ 
              ...body, 
              fileName: file.originalname,
              filePath: folderName,
            }, 
              (err, newDoc) => {
              if (err) {
                console.error('Error saving file info:', err);
              } else {
                console.log('File info saved:', newDoc);
              }
            });

          })
          .on('error', (err) => {
            console.error(`Error unzipping file ${file.originalname}:`, err);
          });

      } catch (error) {
        console.error(`Error unzipping file ${file.originalname}:`, error);
      }
    } else{
      // 保存文件信息到数据库
      db.insert({ 
        ...body, 
        fileName: file.originalname,
        filePath: file.originalname, 
      }, (err, newDoc) => {
        if (err) {
          console.error('Error saving file info:', err);
        } else {
          console.log('File info saved:', newDoc);
        }
      });
    }
  });
});

app.listen(port, () => {
  console.log(`
		Server is running on http://localhost:${port}
		upload file through http://public_ip:${port}
		`);
});
