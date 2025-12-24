# Детальный анализ алгоритма работы анимаций круга дыхания

## Полная последовательность фаз от начала первого раунда до конца последнего

### Структура практики (beginner):
- 3 раунда
- Каждый раунд: 30 циклов
- Раунд 1: finalHoldDuration = 30 сек
- Раунд 2: finalHoldDuration = 60 сек  
- Раунд 3: finalHoldDuration = 90 сек
- globalInhaleHoldDuration = 15 сек
- pauseDuration = 4 сек

---

## РАУНД 1 (и аналогично для раундов 2-3)

### ФАЗА 1: Циклы внутри раунда (1-30 циклов)

#### 1.1. Вдох (inhale) - циклы 1-30
**Состояние:**
- `phase: 'inhale'`
- `holdType: undefined`
- `roundCycle: 1-30`
- `isRunning: true`

**Анимация круга:**
- `scale: activeScaleTarget` = `maxScale` (4.0) - статичное значение
- `background: linear-gradient(angle, blue → turquoise)`
  - Угол: `135deg + (progress * 90deg)` → от 135deg до 225deg
  - Цвета: `bluePrimaryColors.high` → `turquoiseColors.high`
- `boxShadow: динамический` (меняется с progress)
  - Размер: `20 + (progress * 20)` → от 20px до 40px
  - Интенсивность: `0.4 + (progress * 0.3)` → от 0.4 до 0.7
  - Blur: `${5 + progress * 10}px` → от 5px до 15px
- `transition: { duration: phaseDuration, ease: 'easeInOut' }`
  - phaseDuration = 2 сек (Ice Man) или 4 сек (Space Man)

**GlowLayer:**
- `scale: maxScale` (4.0)
- `filter: blur(динамический)` → от 5px до 15px
- `transition: { duration: phaseDuration, ease: 'easeInOut' }`

#### 1.2. Выдох (exhale) - циклы 1-30
**Состояние:**
- `phase: 'exhale'`
- `holdType: undefined`
- `roundCycle: 1-30`
- `isRunning: true`

**Анимация круга:**
- `scale: activeScaleTarget` = `minScale` (0.15) - статичное значение
- `background: linear-gradient(angle, turquoise → lavender)`
  - Угол: `225deg + (progress * 90deg)` → от 225deg до 315deg
  - Цвета: `turquoiseColors.high` → `lavenderColors.high`
- `boxShadow: динамический` (меняется с progress)
  - Размер: `40 - (progress * 20)` → от 40px до 20px
  - Интенсивность: `0.7 - (progress * 0.3)` → от 0.7 до 0.4
  - Blur: `${15 - progress * 10}px` → от 15px до 5px
- `transition: { duration: phaseDuration, ease: 'easeInOut' }`
  - phaseDuration = 2 сек (Ice Man) или 4 сек (Space Man)

**GlowLayer:**
- `scale: minScale` (0.15)
- `filter: blur(динамический)` → от 15px до 5px
- `transition: { duration: phaseDuration, ease: 'easeInOut' }`

**ПРОБЛЕМА:** При переходе от выдоха к задержке круг дергается, потому что:
- Выдох заканчивается с `scale: minScale` (0.15) и transition `duration: phaseDuration`
- Задержка начинается с `scale: [minScale, minScale * 5, ...]` и transition `duration: 1.2`
- Framer-motion пытается интерполировать от текущего значения (которое может быть промежуточным, если выдох не завершен) к первому элементу массива

---

### ФАЗА 2: После последнего выдоха раунда (30-й цикл завершен)

#### 2.1. Зеленая задержка (round-exhale)
**Состояние:**
- `phase: 'hold'`
- `holdType: 'round-exhale'`
- `roundCycle: 30`
- `isRunning: true`
- `isFirstMintHoldEntry.current: true` (первый раз)

**Анимация круга:**
- `scale: [minScale, minScale * 5, minScale * 5 * 1.3, minScale * 5]`
  - Значения: [0.15, 0.75, 0.975, 0.75]
  - Переход от выдоха (0.15) к пульсирующему кругу (0.75)
- `background: radial-gradient(circle, mint high → mint medium)`
  - Статичный мятный градиент
- `boxShadow: статичный`
  - `0 0 25px mintHigh, 0 0 37px mintLow`
- `transition.scale:`
  - `duration: 1.2` (первый раз)
  - `ease: ['easeOut', 'easeInOut', 'easeInOut']`
  - `times: [0, 0.35, 0.675, 1]`
  - `repeat: Infinity`
- `transition.background: { duration: 0 }` - мгновенное
- `transition.boxShadow: { duration: 0 }` - мгновенное

**GlowLayer:**
- `scale: [minScale, minScale * 5, minScale * 5 * 1.3, minScale * 5]`
- `filter: blur(8px)`
- `transition: { duration: 1.2, ease: ['easeOut', 'easeInOut', 'easeInOut'], times: [0, 0.35, 0.675, 1], repeat: Infinity }`

**ПРОБЛЕМА ДЕРГАНИЯ:**
1. Переход от выдоха (`scale: 0.15`, `transition: { duration: 2-4 сек }`) к задержке (`scale: [0.15, ...]`, `transition: { duration: 1.2 }`)
2. `background` и `boxShadow` меняются мгновенно (`duration: 0`), а `scale` начинает анимацию с `duration: 1.2`
3. Если выдох еще не завершен, текущее значение `scale` может быть промежуточным (не 0.15), что вызывает скачок

#### 2.2. Зеленая задержка (round-exhale) - продолжение (после первого цикла)
**Состояние:**
- `phase: 'hold'`
- `holdType: 'round-exhale'`
- `isFirstMintHoldEntry.current: false` (после 1.2 сек)

**Анимация круга:**
- `scale: [minScale * 5, minScale * 5 * 1.3, minScale * 5]`
  - Значения: [0.75, 0.975, 0.75]
  - Только пульсация без перехода
- `background: radial-gradient(circle, mint high → mint medium)` - статичный
- `boxShadow: статичный` - `0 0 25px mintHigh, 0 0 37px mintLow`
- `transition.scale:`
  - `duration: 1.5`
  - `ease: 'easeInOut'`
  - `repeat: Infinity`

**GlowLayer:**
- `scale: [minScale * 5, minScale * 5 * 1.3, minScale * 5]`
- `filter: blur(8px)`
- `transition: { duration: 1.5, ease: 'easeInOut', repeat: Infinity }`

---

### ФАЗА 3: После зеленой задержки

#### 3.1. Вдох после зеленой задержки
**Состояние:**
- `phase: 'inhale'`
- `holdType: undefined`
- `previousHoldType: 'round-exhale'`
- `roundCycle: 30`
- `isRunning: true`

**Анимация круга:**
- `scale: activeScaleTarget` = `maxScale` (4.0)
- `background: linear-gradient(angle, blue → turquoise)`
  - Угол: `135deg + (progress * 90deg)`
- `boxShadow: динамический` (как в обычном вдохе)
- `transition: { duration: phaseDuration, ease: 'easeInOut' }`
  - phaseDuration = специальная длительность (Ice Man: 4 сек, Space Man: 4 сек)

**GlowLayer:**
- `scale: maxScale` (4.0)
- `filter: blur(динамический)`
- `transition: { duration: phaseDuration, ease: 'easeInOut' }`

#### 3.2. Синяя задержка (round-inhale для раундов 1-2, global-inhale для раунда 3)
**Состояние:**
- `phase: 'hold'`
- `holdType: 'round-inhale'` (раунды 1-2) или `'global-inhale'` (раунд 3)
- `roundCycle: 30`
- `isRunning: true`

**Анимация круга:**
- `scale: maxScale` (4.0) - статичное, заполненный круг
- `background: linear-gradient(angle, turquoise → lavender)`
  - Угол: `225deg + (holdProgress * 90deg)` → от 225deg до 315deg
  - Вращающийся градиент выдоха
  - Цвета: `turquoiseColors.high` → `lavenderColors.high`
- `boxShadow: пульсирующий массив`
  - `[turquoiseHigh, lavenderHigh, turquoiseHigh]`
  - Пульсация каждые 2 секунды
- `transition.scale: { duration: 0.3, ease: 'easeInOut' }`
- `transition.background: { duration: phaseDuration (15 сек), ease: 'linear' }`
- `transition.boxShadow: { duration: 2, ease: 'easeInOut', repeat: Infinity }`

**GlowLayer:**
- `scale: maxScale` (4.0)
- `filter: blur(10px)`
- `transition: { duration: 2, ease: 'easeInOut', repeat: Infinity }`

#### 3.3. Выдох после синей задержки
**Состояние:**
- `phase: 'exhale'`
- `holdType: undefined`
- `previousHoldType: 'round-inhale'` или `'global-inhale'`
- `roundCycle: 30`
- `isRunning: true`

**Анимация круга:**
- `scale: activeScaleTarget` = `minScale` (0.15)
- `background: linear-gradient(angle, turquoise → lavender)`
  - Угол: `225deg + (progress * 90deg)`
- `boxShadow: динамический` (как в обычном выдохе)
- `transition: { duration: phaseDuration, ease: 'easeInOut' }`
  - phaseDuration = специальная длительность (Ice Man: 4 сек, Space Man: 4 сек)

**GlowLayer:**
- `scale: minScale` (0.15)
- `filter: blur(динамический)`
- `transition: { duration: phaseDuration, ease: 'easeInOut' }`

#### 3.4. Пауза (pause) - только для раундов 1-2
**Состояние:**
- `phase: 'pause'`
- `holdType: undefined`
- `roundCycle: 30`
- `isRunning: true`

**Анимация круга:**
- `scale: [minScale, minScale * 1.1, minScale]`
  - Значения: [0.15, 0.165, 0.15]
  - Легкое сердцебиение
- `background: radial-gradient(circle, blue medium → blue low)`
  - Статичный синий градиент
- `boxShadow: статичный`
  - `0 0 18px blueMedium, 0 0 28px blueVeryLow`
- `transition: { duration: 1, ease: 'easeInOut', repeat: Infinity }`

**GlowLayer:**
- `scale: minScale` (0.15)
- `filter: blur(5px)`
- `transition: { duration: phaseDuration (4 сек), ease: 'linear' }`

---

## ПЕРЕХОД К СЛЕДУЮЩЕМУ РАУНДУ (раунды 1→2, 2→3)

После паузы начинается следующий раунд с первого вдоха (как в ФАЗЕ 1.1).

---

## РАУНД 3 (последний)

### ФАЗА 4: После синей задержки последнего раунда

#### 4.1. Выдох после global-inhale
**Состояние:**
- `phase: 'exhale'`
- `holdType: undefined`
- `previousHoldType: 'global-inhale'`
- `roundCycle: 30`
- `isRunning: true`

**Анимация круга:**
- Аналогично 3.3, но после этого упражнение завершается (нет паузы)

---

## КРИТИЧЕСКИЕ ПРОБЛЕМЫ ПРИ ПЕРЕХОДАХ

### Проблема 1: Переход от выдоха к зеленой задержке (round-exhale)

**Текущее поведение:**
- Выдох: `scale: 0.15` (статичное), `transition: { duration: 2-4 сек }`
- Задержка: `scale: [0.15, 0.75, 0.975, 0.75]`, `transition: { duration: 1.2 }`

**Проблема:**
1. Если выдох еще не завершен, текущее значение `scale` может быть промежуточным (например, 0.16-0.20)
2. Framer-motion пытается интерполировать от промежуточного значения к первому элементу массива `0.15`
3. Это создает визуальный скачок/дергание
4. `background` и `boxShadow` меняются мгновенно (`duration: 0`), что усиливает ощущение скачка

**Решение:**
1. Использовать `key` prop для принудительного перезапуска анимации при переходе к задержке
2. Установить `initial={{ scale: minScale }}` для задержки, чтобы гарантировать правильное начальное значение
3. Добавить плавный transition для `background` и `boxShadow` (0.3-0.4 сек) для синхронизации

---

## ПОЛНАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ ФАЗ (пример для раунда 1)

1. **Вдох 1** (inhale) → `scale: 4.0`, градиент синий→бирюза, вращение 135-225deg
2. **Выдох 1** (exhale) → `scale: 0.15`, градиент бирюза→лаванда, вращение 225-315deg
3. **Вдох 2** (inhale) → повтор
4. **Выдох 2** (exhale) → повтор
5. ... (циклы 3-30)
6. **Выдох 30** (exhale) → `scale: 0.15`
7. **Зеленая задержка** (hold, round-exhale) → `scale: [0.15, 0.75, 0.975, 0.75]`, мятный цвет, пульсация
8. **Вдох после задержки** (inhale) → `scale: 4.0`, градиент синий→бирюза
9. **Синяя задержка** (hold, round-inhale) → `scale: 4.0`, градиент бирюза→лаванда (вращающийся)
10. **Выдох после задержки** (exhale) → `scale: 0.15`, градиент бирюза→лаванда
11. **Пауза** (pause) → `scale: [0.15, 0.165, 0.15]`, сердцебиение, синий градиент
12. **Вдох раунда 2** (inhale) → начало следующего раунда

---

## ВЫВОДЫ

1. **Дергание при переходе к зеленой задержке** вызвано конфликтом между:
   - Незавершенной анимацией выдоха (может быть промежуточное значение scale)
   - Началом анимации задержки (массив начинается с minScale)
   - Мгновенным изменением background/boxShadow при плавном изменении scale

2. **Решение требует:**
   - Принудительный перезапуск анимации через `key` prop
   - Правильное начальное значение через `initial` prop
   - Синхронизированные transitions для всех свойств

