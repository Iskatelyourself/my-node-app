const fs = require('fs');
const path = require('path');

class FileOperationError extends Error {
  constructor(message, operation, filename, originalError = null) {
    super(message);
    this.name = 'FileOperationError';
    this.operation = operation;
    this.filename = filename;
    this.code = originalError ? originalError.code : undefined;
    this.originalError = originalError;
  }
}

// Если последний аргумент - функция, результат идёт в колбэк, иначе возвращается промис
class FileManagerHybrid {
  constructor(baseDir = './data-hybrid') {
    this.baseDir = path.resolve(baseDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
      console.log(`Создана директория: ${this.baseDir}`);
    }
  }

  resolvePath(filename, operation) {
    if (typeof filename !== 'string' || filename.trim() === '') {
      throw new FileOperationError('Имя файла должно быть непустой строкой', operation, String(filename));
    }
    const filePath = path.resolve(this.baseDir, filename);
    if (!filePath.startsWith(this.baseDir + path.sep)) {
      throw new FileOperationError('Выход за пределы рабочей директории запрещён', operation, filename);
    }
    return filePath;
  }

  wrapError(err, operation, filename) {
    if (err instanceof FileOperationError) return err;
    const messages = {
      ENOENT: 'Файл не найден',
      EACCES: 'Нет прав доступа',
      EISDIR: 'Указан каталог, а не файл'
    };
    const text = messages[err.code] || `Ошибка файловой системы (${err.code})`;
    return new FileOperationError(`${text}: ${filename}`, operation, filename, err);
  }

  run(operation, filename, callback, task) {
    const promise = (async () => {
      try {
        return await task();
      } catch (err) {
        throw this.wrapError(err, operation, filename);
      }
    })();

    if (typeof callback === 'function') {
      promise.then(
        (result) => callback(null, result),
        (err) => callback(err)
      );
      return undefined;
    }
    return promise;
  }

  createFile(filename, content, callback) {
    return this.run('createFile', filename, callback, async () => {
      const filePath = this.resolvePath(filename, 'createFile');
      await fs.promises.writeFile(filePath, content, 'utf8');
      return filePath;
    });
  }

  readFile(filename, callback) {
    return this.run('readFile', filename, callback, async () => {
      const filePath = this.resolvePath(filename, 'readFile');
      return await fs.promises.readFile(filePath, 'utf8');
    });
  }

  getFileStats(filename, callback) {
    return this.run('getFileStats', filename, callback, async () => {
      const filePath = this.resolvePath(filename, 'getFileStats');
      const stats = await fs.promises.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile()
      };
    });
  }

  deleteFile(filename, callback) {
    return this.run('deleteFile', filename, callback, async () => {
      const filePath = this.resolvePath(filename, 'deleteFile');
      await fs.promises.unlink(filePath);
    });
  }

  listFiles(callback) {
    return this.run('listFiles', this.baseDir, callback, async () => {
      const entries = await fs.promises.readdir(this.baseDir, { withFileTypes: true });
      return entries.filter(e => e.isFile()).map(e => e.name);
    });
  }
}

module.exports = FileManagerHybrid;
module.exports.FileOperationError = FileOperationError;
