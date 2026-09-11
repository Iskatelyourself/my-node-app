const http = require('http');

const fio = "Юреня Даниил Александрович";
const group = "478";

function arctan(x, scale) {
  let sum = scale / BigInt(x);
  let term = sum;
  const x2 = BigInt(x * x);
  for (let k = 1n; term !== 0n; k++) {
    term /= x2;
    sum += (k % 2n === 0n ? 1n : -1n) * (term / (2n * k + 1n));
  }
  return sum;
}

function calcPi(digits) {
  const scale = 10n ** BigInt(digits + 10); // запас точности
  const pi = 4n * (4n * arctan(5, scale) - arctan(239, scale));
  const str = (pi / 10n ** 10n).toString();
  return `${str[0]}.${str.slice(1, 1 + digits)}`;
}

const piValue = calcPi(23);

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<p>${fio}</p><p>Группа: ${group}</p><p>Число Пи: ${piValue}</p>`);
});
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});