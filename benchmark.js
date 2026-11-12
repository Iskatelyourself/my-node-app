const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const DIR = './benchmark-data';
const FILE_COUNT = 200;
const ROUNDS = 5;

const names = Array.from({ length: FILE_COUNT }, (_, i) => `file${i}.txt`);
const content = 'Тестовые данные для замера производительности. '.repeat(20);
const full = (name) => path.join(DIR, name);

function prepareDir() {
  fs.rmSync(DIR, { recursive: true, force: true });
  fs.mkdirSync(DIR, { recursive: true });
}

function runSync() {
  for (const name of names) fs.writeFileSync(full(name), content);
  for (const name of names) fs.readFileSync(full(name), 'utf8');
  for (const name of names) fs.unlinkSync(full(name));
}

function runCallbacksSequential() {
  return new Promise((resolve, reject) => {
    let i = 0;
    const step = (action, next) => {
      if (i >= names.length) { i = 0; return next(); }
      action(names[i], (err) => {
        if (err) return reject(err);
        i++;
        step(action, next);
      });
    };
    const write = (n, cb) => fs.writeFile(full(n), content, cb);
    const read = (n, cb) => fs.readFile(full(n), 'utf8', cb);
    const del = (n, cb) => fs.unlink(full(n), cb);
    step(write, () => step(read, () => step(del, resolve)));
  });
}

function runCallbacksParallel() {
  const parallel = (action) => new Promise((resolve, reject) => {
    let left = names.length;
    for (const name of names) {
      action(name, (err) => {
        if (err) return reject(err);
        if (--left === 0) resolve();
      });
    }
  });
  return parallel((n, cb) => fs.writeFile(full(n), content, cb))
    .then(() => parallel((n, cb) => fs.readFile(full(n), 'utf8', cb)))
    .then(() => parallel((n, cb) => fs.unlink(full(n), cb)));
}

async function runPromisesSequential() {
  for (const name of names) await fs.promises.writeFile(full(name), content);
  for (const name of names) await fs.promises.readFile(full(name), 'utf8');
  for (const name of names) await fs.promises.unlink(full(name));
}

async function runPromisesParallel() {
  await Promise.all(names.map(n => fs.promises.writeFile(full(n), content)));
  await Promise.all(names.map(n => fs.promises.readFile(full(n), 'utf8')));
  await Promise.all(names.map(n => fs.promises.unlink(full(n))));
}

async function measure(label, fn) {
  const times = [];
  for (let r = 0; r < ROUNDS; r++) {
    prepareDir();
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  return { label, avg, min: Math.min(...times), max: Math.max(...times) };
}

async function main() {
  console.log(`Файлов: ${FILE_COUNT}, повторов: ${ROUNDS}\n`);

  prepareDir();
  runSync();
  await runPromisesParallel();

  const results = [];
  results.push(await measure('Синхронно (Sync)', async () => runSync()));
  results.push(await measure('Колбэки, последовательно', runCallbacksSequential));
  results.push(await measure('Колбэки, параллельно', runCallbacksParallel));
  results.push(await measure('Промисы, последовательно', runPromisesSequential));
  results.push(await measure('Промисы, параллельно (Promise.all)', runPromisesParallel));

  fs.rmSync(DIR, { recursive: true, force: true });

  const best = Math.min(...results.map(r => r.avg));
  console.log('Вариант'.padEnd(38) + 'Среднее'.padStart(12) + 'Мин'.padStart(12) + 'Макс'.padStart(12) + '  Отн.');
  console.log('-'.repeat(82));
  for (const r of results) {
    console.log(
      r.label.padEnd(38) +
      `${r.avg.toFixed(1)} мс`.padStart(12) +
      `${r.min.toFixed(1)} мс`.padStart(12) +
      `${r.max.toFixed(1)} мс`.padStart(12) +
      `  x${(r.avg / best).toFixed(2)}`
    );
  }
}

main().catch(err => { console.error(err); process.exit(1); });
