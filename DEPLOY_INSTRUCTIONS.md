# Инструкция по деплою в GitHub

## Подготовка проекта

Проект уже настроен для деплоя на GitHub Pages:
- ✅ `.gitignore` настроен (исключает `dist/`, `node_modules/`, документацию)
- ✅ `vite.config.ts` настроен с `base: '/breathable/'`
- ✅ GitHub Actions workflow создан (`.github/workflows/deploy.yml`)

## Команды для первого коммита

```bash
# Добавить все файлы (кроме исключенных в .gitignore)
git add .

# Создать первый коммит
git commit -m "Initial commit: Breathable Telegram Mini App"

# Добавить remote репозиторий
git remote add origin https://github.com/mrdudekowski/breathable.git

# Переименовать ветку в main (если нужно)
git branch -M main

# Запушить в GitHub
git push -u origin main
```

## После пуша

1. GitHub Actions автоматически соберёт и задеплоит приложение
2. Проверь статус деплоя: `https://github.com/mrdudekowski/breathable/actions`
3. После успешного деплоя приложение будет доступно по адресу:
   `https://mrdudekowski.github.io/breathable/`

## Подключение к Telegram Mini App

1. Открой [`@BotFather`](https://t.me/BotFather) в Telegram
2. Отправь `/newapp`
3. Укажи URL: `https://mrdudekowski.github.io/breathable/`
4. Получи ссылку для открытия Mini App

## Что исключено из репозитория

Следующие файлы/папки **не коммитятся** (в `.gitignore`):
- `dist/` - собранные файлы (генерируются при сборке)
- `node_modules/` - зависимости
- Все файлы анализа (`.md` файлы с анализом)
- `psy/` - папка с документацией
- `index.html` в корне (дубликат)
- `Ysabeau_SC/` - локальные шрифты (используются Google Fonts)

