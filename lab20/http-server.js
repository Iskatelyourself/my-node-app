const http = require('http');

const PORT = 3000;
const GROUP = '478';
const VARIANT = '16-20';
const MAX_BODY = 1024 * 1024; // 1 МБ

// Текущее время для логов
function now() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// Отправка HTML
function sendHtml(res, status, html) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
}

// Отправка JSON
function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data, null, 2));
}

// Чтение тела запроса по кускам (chunks)
function readBody(req, res, callback) {
  const chunks = [];
  let size = 0;
  let tooLarge = false;

  // Если клиент сразу заявил большой размер, отказываем не читая
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > MAX_BODY) {
    res.setHeader('Connection', 'close');
    sendHtml(res, 413, '<h1>413 Payload Too Large</h1>');
    req.resume();
    return;
  }

  req.on('data', (chunk) => {
    if (tooLarge) return;
    size += chunk.length;
    if (size > MAX_BODY) {
      tooLarge = true;
      chunks.length = 0;
      res.setHeader('Connection', 'close');
      sendHtml(res, 413, '<h1>413 Payload Too Large</h1>');
      return;
    }
    chunks.push(chunk);
  });

  req.on('end', () => {
    if (tooLarge) return;
    res.bodySize = size;
    callback(Buffer.concat(chunks));
  });

  req.on('error', (err) => {
    console.log(`[${now()}] Ошибка чтения тела: ${err.message}`);
    if (!res.headersSent) {
      sendJson(res, 400, { error: 'Ошибка чтения тела запроса' });
    }
  });
}

// Задание 1: страницы
function handleMain(req, res) {
  sendHtml(res, 200, `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>ЛР 20</title></head>
<body>
<h1>Лабораторная работа №20</h1>
<p>Группа: ${GROUP}</p>
<p>Метод: ${req.method}</p>
<p>URL: ${req.url}</p>
</body></html>`);
}

function handleAbout(req, res) {
  sendHtml(res, 200, `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>О студенте</title></head>
<body>
<h1>О студенте</h1>
<p>Группа: ${GROUP}</p>
<p>Студент: Юреня Даниил</p>
</body></html>`);
}

function handleNotFound(req, res) {
  sendHtml(res, 404, `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>404</title></head>
<body>
<h1>404 Not Found</h1>
<p>Путь ${req.url} не найден</p>
</body></html>`);
}

// Задание 2: заголовки
function handleHeaders(req, res) {
  sendJson(res, 200, {
    headers: req.headers,
    method: req.method,
    url: req.url,
    httpVersion: req.httpVersion
  });
}

function handleHeadersSet(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Powered-By', 'Node.js');
  res.setHeader('X-Group', GROUP);
  res.setHeader('Cache-Control', 'no-cache');
  // Временный заголовок, чтобы показать removeHeader
  res.setHeader('X-Temp', '1');
  res.removeHeader('X-Temp');
  res.end('<h1>Заголовки установлены</h1>');
}

function handleHeadersCheck(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Group', GROUP);
  const result = {
    hasContentType: res.hasHeader('Content-Type'),
    hasXGroup: res.hasHeader('X-Group'),
    hasUnknown: res.hasHeader('X-Unknown')
  };
  res.end(JSON.stringify(result, null, 2));
}

// Задание 3: тело запроса
function handleEcho(req, res) {
  readBody(req, res, (body) => {
    const type = (req.headers['content-type'] || 'text/plain').split(';')[0].trim();

    if (type === 'application/json') {
      let data;
      try {
        data = JSON.parse(body.toString('utf-8'));
      } catch (e) {
        return sendJson(res, 400, { error: 'Некорректный JSON' });
      }
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        data.group = GROUP;
      }
      return sendJson(res, 200, data);
    }

    // text/plain, octet-stream и остальное возвращаем как есть
    res.statusCode = 200;
    res.setHeader('Content-Type', req.headers['content-type'] || 'text/plain');
    res.end(body);
  });
}

function handleForm(req, res) {
  readBody(req, res, (body) => {
    const type = (req.headers['content-type'] || '').split(';')[0].trim();
    if (type !== 'application/x-www-form-urlencoded') {
      return sendJson(res, 415, { error: 'Нужен Content-Type application/x-www-form-urlencoded' });
    }
    const data = Object.fromEntries(new URLSearchParams(body.toString('utf-8')));
    sendJson(res, 200, data);
  });
}

const server = http.createServer((req, res) => {
  // Заголовки для всех ответов
  res.setHeader('X-Powered-By', 'Node.js');
  res.setHeader('X-Group', GROUP);
  res.setHeader('Cache-Control', 'no-cache');

  // Лог после отправки ответа
  res.on('finish', () => {
    let line = `[${now()}] ${req.method} ${req.url} ${res.statusCode}`;
    if (res.bodySize !== undefined) {
      line += ` размер тела: ${res.bodySize} байт`;
    }
    console.log(line);
  });

  const path = req.url.split('?')[0];

  if (path === '/' && req.method === 'GET') return handleMain(req, res);
  if (path === '/about' && req.method === 'GET') return handleAbout(req, res);
  if (path === '/headers' && req.method === 'GET') return handleHeaders(req, res);
  // curl -I шлёт HEAD, поэтому разрешаем и его
  if (path === '/headers/set' && (req.method === 'GET' || req.method === 'HEAD')) return handleHeadersSet(req, res);
  if (path === '/headers/check' && req.method === 'GET') return handleHeadersCheck(req, res);
  if (path === '/echo' && req.method === 'POST') return handleEcho(req, res);
  if (path === '/form' && req.method === 'POST') return handleForm(req, res);

  handleNotFound(req, res);
});

server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
