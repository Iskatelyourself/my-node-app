// дата в виде 2026-11-13 14:30:25
function formatDate(date) {
  const p = (n) => String(n).padStart(2, '0');
  return date.getFullYear() + '-' + p(date.getMonth() + 1) + '-' + p(date.getDate()) + ' ' +
    p(date.getHours()) + ':' + p(date.getMinutes()) + ':' + p(date.getSeconds());
}

// размер в байтах, КБ или МБ
function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' МБ';
  if (bytes >= 1024) return Math.round(bytes / 1024) + ' КБ';
  return bytes + ' Б';
}

// правильное окончание: 1 файл, 2 файла, 5 файлов
function plural(n, forms) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
  return forms[2];
}

module.exports = { formatDate, formatSize, plural };
