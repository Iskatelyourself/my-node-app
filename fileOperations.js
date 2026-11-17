const fs = require('fs');
const path = require('path');

class FileManager {
  constructor(baseDir = './data') {
    this.baseDir = baseDir;
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
      console.log(`Создана директория: ${baseDir}`);
    }
  }

  createFile(filename, content, callback) {
    const filePath = path.join(this.baseDir, filename);
    fs.writeFile(filePath, content, 'utf8', (err) => {
      if (err) {
        callback(err, null);
        return;
      }
      callback(null, filePath);
    });
  }

  readFile(filename, callback) {
    const filePath = path.join(this.baseDir, filename);
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        callback(err, null);
        return;
      }
      callback(null, data);
    });
  }

  getFileStats(filename, callback) {
    const filePath = path.join(this.baseDir, filename);
    fs.stat(filePath, (err, stats) => {
      if (err) {
        callback(err, null);
        return;
      }
      callback(null, {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile()
      });
    });
  }

  deleteFile(filename, callback) {
    const filePath = path.join(this.baseDir, filename);
    fs.unlink(filePath, (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null);
    });
  }

  listFiles(callback) {
    fs.readdir(this.baseDir, (err, files) => {
      if (err) {
        callback(err, null);
        return;
      }
      const filePromises = files.map(file => {
        return new Promise((resolve) => {
          const filePath = path.join(this.baseDir, file);
          fs.stat(filePath, (err, stats) => {
            resolve({ name: file, isFile: !err && stats.isFile() });
          });
        });
      });

      Promise.all(filePromises)
        .then(results => {
          const onlyFiles = results.filter(r => r.isFile).map(r => r.name);
          callback(null, onlyFiles);
        })
        .catch(err => callback(err, null));
    });
  }
}

module.exports = FileManager;
