const fs = require('fs');
const path = require('path');
const util = require('util');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const unlink = util.promisify(fs.unlink);
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);

class FileManagerPromises {
  constructor(baseDir = './data-promises') {
    this.baseDir = baseDir;
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
      console.log(`Создана директория: ${baseDir}`);
    }
  }

  async createFile(filename, content) {
    const filePath = path.join(this.baseDir, filename);
    await writeFile(filePath, content, 'utf8');
    return filePath;
  }

  async readFile(filename) {
    const filePath = path.join(this.baseDir, filename);
    return await readFile(filePath, 'utf8');
  }

  async getFileStats(filename) {
    const filePath = path.join(this.baseDir, filename);
    const stats = await stat(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isFile: stats.isFile()
    };
  }

  async deleteFile(filename) {
    const filePath = path.join(this.baseDir, filename);
    await unlink(filePath);
  }

  async listFiles() {
    const files = await readdir(this.baseDir);
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const stats = await stat(path.join(this.baseDir, file));
        return { name: file, isFile: stats.isFile() };
      })
    );
    return fileStats.filter(f => f.isFile).map(f => f.name);
  }

  async createMultipleFiles(files) {
    return await Promise.all(
      files.map(({ filename, content }) => this.createFile(filename, content))
    );
  }

  async readMultipleFiles(filenames) {
    const results = await Promise.all(
      filenames.map(async (filename) => ({ [filename]: await this.readFile(filename) }))
    );
    return Object.assign({}, ...results);
  }
}

module.exports = FileManagerPromises;
