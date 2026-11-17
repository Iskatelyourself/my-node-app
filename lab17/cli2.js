// Задание 2: опции и флаги через commander
import { Command, Option } from 'commander';
import fs from 'node:fs';

const program = new Command();

program
  .name('my-cli')
  .description('CLI-приложение для лабораторной работы №17')
  .version('1.0.0')
  .option('-v, --verbose', 'подробный вывод');

// Допустимые типы отчета
const reportTypes = ['html', 'pdf', 'json', 'csv'];

program
  .command('generate')
  .description('сгенерировать отчёт')
  .addOption(new Option('-t, --type <type>', 'тип отчёта (по умолчанию: "html")'))
  .option('-o, --output <path>', 'путь для сохранения')
  .option('-f, --force', 'перезаписать существующий файл')
  .option('--dry-run', 'показать что будет сделано без выполнения')
  .action((options) => {
    const verbose = program.opts().verbose;

    // Тип по умолчанию html
    options.type = options.type || 'html';

    // Проверяем тип отчета
    if (!reportTypes.includes(options.type)) {
      console.error(`Ошибка: недопустимый тип отчёта "${options.type}".`);
      console.error(`Допустимые значения: ${reportTypes.join(', ')}`);
      process.exit(1);
    }

    // Если путь не указан, берем по умолчанию
    const output = options.output || `./output.${options.type}`;

    if (options.dryRun) {
      console.log(`[DRY-RUN] Будет сгенерирован отчёт типа: ${options.type}`);
      console.log(`[DRY-RUN] Файл будет сохранён в: ${output}`);
      console.log('[DRY-RUN] Действия не выполнены (режим проверки)');
      return;
    }

    if (verbose) {
      console.log('[VERBOSE] Запуск генерации отчёта...');
      console.log(`[VERBOSE] Тип отчёта: ${options.type}`);
      console.log(`[VERBOSE] Путь сохранения: ${output}`);
    }

    // Не перезаписываем файл без --force
    if (fs.existsSync(output) && !options.force) {
      console.error(`Ошибка: файл ${output} уже существует. Используйте --force`);
      process.exit(1);
    }

    fs.writeFileSync(output, `Отчёт типа ${options.type}, группа 478\n`);
    console.log(`Отчёт успешно сгенерирован: ${output}`);
  });

program
  .command('convert')
  .description('конвертировать файл')
  .requiredOption('-i, --input <path>', 'входной файл')
  .addOption(new Option('-f, --format <format>', 'формат результата (по умолчанию: "json")'))
  .option('--dry-run', 'показать что будет сделано без выполнения')
  .action((options) => {
    const verbose = program.opts().verbose;
    options.format = options.format || 'json';
    const output = `${options.input}.${options.format}`;

    if (options.dryRun) {
      console.log(`[DRY-RUN] Файл ${options.input} будет сконвертирован в ${options.format}`);
      console.log(`[DRY-RUN] Результат: ${output}`);
      return;
    }

    if (!fs.existsSync(options.input)) {
      console.error(`Ошибка: файл ${options.input} не найден`);
      process.exit(1);
    }

    if (verbose) {
      console.log(`[VERBOSE] Конвертация ${options.input} в ${options.format}`);
    }

    // Простая "конвертация": копируем содержимое в новый файл
    fs.copyFileSync(options.input, output);
    console.log(`Файл сконвертирован: ${output}`);
  });

program.parse();
