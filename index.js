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
  if (!token) {
    const errRes = { ...dftError };
    errRes.code = 401;
    errRes.message = 'token is required';
    res.send('token is required');
    return
  }
  const response = { ...dftResponse };
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
  const searchVal = body.searchVal || "";
  const regExp = new RegExp(searchVal, 'i');
  if (!createUser) {
    res.send('user info ');
    return
  }
  const findObj = {
    createUser: createUser,
  }
  if (searchVal) {
    findObj.$or = [
      { companyName: { $regex: regExp } },
      { projectName: { $regex: regExp } },
      { fileName: { $regex: regExp } },
    ]
  }
  db.count(findObj, (err, count) => {
    if (err) {
      const errRes = { ...dftError };
      errRes.code = 900003;
      errRes.message = 'Error getting file list count';
      res.send(errRes);
    } else {
      db.find(findObj).skip((page - 1) * limit).limit(limit).exec((err, docs) => {
        if (err) {
          console.error('Error getting file list:', err);
          res.send('Error getting file list');
        } else {
          const response = { ...dftResponse };
          response.data = {
            list: docs,
            count,
          };
          res.send(response);
        }
      });
    }
  });
});

app.delete('/delete/:id', (req, res) => {
  const id = req.params.id;
  const token = req.headers['access-token'];
  const response = { ...dftResponse };
  const errRes = { ...dftError };
  if (!token) {
    errRes.code = 401;
    errRes.message = 'token is required';
    res.send('token is required');
    return
  }

  try {
    // need to delete the file from the disk
    db.findOne({ _id: id }, (err, doc) => {
      if (err) {
        console.error('Error getting file info:', err);
        errRes.message = 'Error getting file info';
        errRes.code = 900000;
        // res.send(errRes);
        // return;
      }
      if (!doc) {
        console.error('File not found');
        errRes.message = 'File not found';
        errRes.code = 900002;
        // res.send(errRes);
        // return;
      }
      const folderAbsPath = doc.folderAbsPath;
      if (folderAbsPath) {
        fs.rmSync(folderAbsPath, { recursive: true });
        console.log('Folder deleted successfully');
      }
    })
  } catch (error) {
    console.log(' ', error);
  }

  // delete from db
  db.remove({ _id: id }, {}, (err, numRemoved) => {
    if (err) {
      console.error('Error deleting file:', err);
      errRes.message = 'Error deleting file';
      errRes.code = 900001;
      res.send(errRes);
    } else {
      // console.log('File deleted successfully');
      response.message = 'Deleted successfully';
      res.send(response);
    }
  });
})


// 文件上传接口
app.post('/upload', upload.array('files'), (req, res) => {
  // 如果文件是 zip 格式，解压缩，并且删除原文件
  const files = req.files;
  const token = req.headers['access-token'];
  const companyName = req.body.companyName || 'unknown';
  const projectName = req.body.projectName || 'unknown';
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


  const response = { ...dftResponse };
  const errRes = { ...dftError };
  const responseAry = []
  // 创建 Promise 数组来跟踪所有文件的处理状态
  let promises = files.map(file => {
    return new Promise((resolve, reject) => {
      if (isFileZip(file)) { // 假设有一个 isFileZip 函数来检测是否为zip文件
        const filePath = path.join(absoluteUploadPath, file.originalname);
        const folderName = file.originalname.split('.')[0] + '_' + Date.now();
        const unzipPath = path.join(absoluteUploadPath, folderName);
        const absoluteFolderPath = path.resolve(absoluteUploadPath, folderName);
        const fileAbsPath = path.resolve(absoluteUploadPath, file.originalname);

        try {
          fs.mkdirSync(unzipPath);
          fs.createReadStream(filePath).pipe(unzipper.Extract({ path: unzipPath }))
            .on('close', () => {
              db.insert({
                ...body,
                fileName: file.originalname,
                filePath: folderName,
                fileAbsPath: fileAbsPath,
                folderAbsPath: absoluteFolderPath
              }, (err, newDoc) => {
                if (err) {
                  console.error('Error saving file info:', err);
                  reject(err);
                } else {
                  console.log('File info saved:', newDoc);
                  resolve();
                }
              });
            })
            .on('error', (err) => {
              console.error(`Error unzipping file ${file.originalname}:`, err);
              reject(err);
            });
        } catch (error) {
          console.error(`Error unzipping file ${file.originalname}:`, error);
          reject(error);
        }
      } else {
        db.insert({
          ...body,
          fileName: file.originalname,
          filePath: file.originalname,
        }, (err, newDoc) => {
          if (err) {
            console.error('Error saving file info:', err);
            reject(err);
          } else {
            console.log('File info saved:', newDoc);
            resolve();
          }
        });
      }
    });
  });

  // 等待所有文件处理完毕
  Promise.all(promises)
    .then(() => {
      res.send({ message: "所有文件上传和处理成功" });
    })
    .catch(error => {
      res.status(500).send({ error: "处理文件时发生错误" });
    });
});

app.listen(port, () => {
  console.log(`
		Server is running on http://localhost:${port}
		upload file through http://public_ip:${port}
		`);
});
