// Задание 3: интерактивный режим через inquirer
import { Command } from 'commander';
import inquirer from 'inquirer';

const program = new Command();

program
  .name('my-cli')
  .description('CLI-приложение для лабораторной работы №17')
  .version('1.0.0');

// Названия типов проекта для вывода
const typeNames = {
  web: 'Web-приложение',
  cli: 'CLI-утилита',
  lib: 'Библиотека',
  service: 'Микросервис',
};

// Читаем первую строку из stdin (когда данные пришли через конвейер)
async function readStdin() {
  let text = '';
  for await (const chunk of process.stdin) {
    text += chunk;
  }
  return text.split('\n')[0].trim();
}

program
  .command('init')
  .description('инициализировать проект')
  .option('--name <name>', 'название проекта')
  .option('--type <type>', 'тип проекта: web, cli, lib, service')
  .option('--typescript', 'добавить TypeScript')
  .option('--eslint', 'добавить ESLint')
  .option('--prettier', 'добавить Prettier')
  .option('--jest', 'добавить Jest')
  .option('--git', 'использовать Git')
  .option('--no-interactive', 'отключить вопросы (для CI/CD)')
  .action(async (options) => {
    let name = options.name;
    let type = options.type;
    let tools = [];
    let useGit = Boolean(options.git);

    if (options.typescript) tools.push('TypeScript');
    if (options.eslint) tools.push('ESLint');
    if (options.prettier) tools.push('Prettier');
    if (options.jest) tools.push('Jest');

    // Если stdin не терминал, значит данные идут через конвейер
    const fromPipe = !process.stdin.isTTY;
    const interactive = options.interactive && !fromPipe;

    if (type && !typeNames[type]) {
      console.error(`Ошибка: недопустимый тип "${type}". Допустимо: web, cli, lib, service`);
      process.exit(1);
    }

    if (!interactive) {
      // Неинтерактивный режим: имя можно взять из stdin
      if (!name && fromPipe) {
        name = await readStdin();
      }

      if (!name && !type) {
        console.error('Ошибка: в неинтерактивном режиме необходимо указать --name и --type');
        process.exit(1);
      }
      if (!name) {
        console.error('Ошибка: недостаточно данных. Укажите --name');
        process.exit(1);
      }
      if (!type) {
        console.error('Ошибка: недостаточно данных. Укажите --type');
        process.exit(1);
      }
      if (!typeNames[type]) {
        console.error(`Ошибка: недопустимый тип "${type}". Допустимо: web, cli, lib, service`);
        process.exit(1);
      }
    } else if (!name || !type) {
      // Не хватает данных, задаем вопросы
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Введите название проекта:',
          when: !name,
          validate: (value) => (value.trim() ? true : 'Название не может быть пустым'),
        },
        {
          type: 'select',
          name: 'type',
          message: 'Выберите тип проекта:',
          when: !type,
          choices: [
            { name: 'Web-приложение', value: 'web' },
            { name: 'CLI-утилита', value: 'cli' },
            { name: 'Библиотека', value: 'lib' },
            { name: 'Микросервис', value: 'service' },
          ],
        },
        {
          type: 'checkbox',
          name: 'tools',
          message: 'Выберите дополнительные опции:',
          choices: ['TypeScript', 'ESLint', 'Prettier', 'Jest'],
        },
        {
          type: 'confirm',
          name: 'git',
          message: 'Использовать Git?',
          default: true,
        },
        {
          type: 'password',
          name: 'token',
          message: 'Введите токен доступа:',
          mask: '*',
        },
      ]);

      name = name || answers.name;
      type = type || answers.type;
      tools = [...new Set([...tools, ...answers.tools])];
      useGit = useGit || answers.git;
    }

    console.log(`Проект "${name}" успешно инициализирован!`);
    console.log(`Тип: ${typeNames[type]}`);
    console.log(`Опции: ${tools.length ? tools.join(', ') : 'нет'}`);
    console.log(`Git: ${useGit ? 'да' : 'нет'}`);
  });

await program.parseAsync();
