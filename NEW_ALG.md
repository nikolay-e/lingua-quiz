# Adaptive Learning Algorithm Specification

Позиционная очередь + уровни с простым адаптивом под ученика. Без лишней математики, всё реализуемо "в лоб".

---

## 1. Структуры данных

### Card (Карточка)

```typescript
interface Card {
  level: 0..5;                    // Уровень мастерства
  position: number;               // Место в очереди (0 — ближайшая)
  streak: number;                 // Подряд правильные ответы
  last10: boolean[];              // Последние ответы (max 10)
  total_errors: number;           // Всего ошибок за всё время
  sessions_since_seen: number;    // Сессий с последнего показа
}
```

### Student (Профиль ученика)

```typescript
interface Student {
  pace: number; // Скорость обучения [-1..+1]: <0 осторожно, >0 ускоряем
  new_today: number; // Количество новых слов сегодня
}
```

---

## 2. Константы (дефолтные значения)

```typescript
// Размер фокуса
const F_BASE = 5;
const F_MIN = 4;
const F_MAX = 12;
const K = 2; // Коэффициент продвижения

// Лимиты новых слов
const MAX_NEW_BASE = 10; // Базовое количество новых за сессию
const MAX_NEW_MAX = 25; // Максимум для мотивированных

// Правило повышения уровня
const PROMOTE_RULE = {
  streak: 3, // >= 3 подряд правильных
  correctInLast5: 4, // >= 4 из последних 5
};

// Штрафные позиции по уровням (при ошибке)
const PENALTY_POS_BY_LEVEL = {
  1: 4,
  2: 4,
  3: 8,
  4: 8,
  5: 15,
};

// Пороги деградации (количество ошибок в last10)
const DEGRADE_THRESHOLD_BY_LEVEL = {
  1: 3,
  2: 3,
  3: 4,
  4: 4,
  5: 3,
};

// Порог "пиявок"
const LEECH_THRESHOLD = 12; // total_errors
```

---

## 3. Адаптация под ученика

Раз в каждые **20 ответов** (или в конце сессии) считаем точность `acc` за последние 20 ответов:

```typescript
function updatePace(recentAnswers: boolean[], currentPace: number): number {
  const correct = recentAnswers.filter((a) => a === true).length;
  const acc = correct / recentAnswers.length;

  let pace = currentPace;

  if (acc >= 0.9) {
    pace += 0.2;
  } else if (acc <= 0.75) {
    pace -= 0.2;
  }

  return clamp(pace, -1, 1);
}
```

**Никаких таймеров, только качество ответов.**

---

## 4. Адаптивный размер фокуса F

Считаем ошибочность в фокусе (по всем ответам за последние ~50, либо просто "за сессию"):

```typescript
function adjustFocusSize(focusError: number, currentF: number): number {
  let F = currentF;

  if (focusError > 0.25) {
    F = Math.min(F + 1, F_MAX);
  } else if (focusError < 0.12) {
    F = Math.max(F - 1, F_MIN);
  }

  return F;
}

// focusError = errorsInFocus / attemptsInFocus
```

Стартуем с `F = F_BASE` в начале обучения.

---

## 5. Новые карточки (адаптивный лимит)

```typescript
function calculateNewLimit(pace: number, cardsInFocus: number, F: number): number {
  let newLimit = MAX_NEW_BASE + Math.round(10 * Math.max(pace, 0));
  newLimit = Math.min(newLimit, MAX_NEW_MAX);

  // Блокируем новые слова при перегрузке
  if (cardsInFocus > 1.5 * F) {
    newLimit = 0;
  }

  return newLimit;
}
```

---

## 6. Межсессионный возврат

В начале сессии **возвращаем ближе к фокусу только ограниченное число карточек**, а не все сразу.

```typescript
function applyInterSessionReturn(cards: Card[], F: number): void {
  const M = Math.round(2 * F); // Сколько "просроченных" подтянуть

  // Выбираем M карточек с position > F с максимальным sessions_since_seen
  const overdue = cards
    .filter((c) => c.position > F)
    .sort((a, b) => b.sessions_since_seen - a.sessions_since_seen)
    .slice(0, M);

  for (const card of overdue) {
    const shift = Math.min(3 * card.sessions_since_seen, Math.round(0.35 * card.position));
    card.position = Math.max(F + 1, card.position - shift);
    card.sessions_since_seen = 0;
  }

  // Остальным просто увеличиваем счетчик
  const others = cards.filter((c) => !overdue.includes(c));
  for (const card of others) {
    card.sessions_since_seen += 1;
  }
}
```

---

## 7. Обработка ответа (главный цикл)

### 7.1 Правильный ответ

```typescript
function handleCorrectAnswer(card: Card, pace: number, F: number): void {
  card.streak += 1;
  let jump = Math.round(F * K * card.streak);

  // Адаптация под pace
  if (pace > 0) {
    jump += Math.round(0.25 * jump); // Ускорение для мотивированных
  } else if (pace < 0) {
    jump -= Math.round(0.15 * jump); // Осторожнее для слабых
  }

  jump = Math.max(jump, F); // Минимум
  card.position += jump;

  // Проверка на повышение уровня
  if (shouldPromote(card)) {
    card.level = Math.min(5, card.level + 1);
    card.streak = 0;
  }
}

function shouldPromote(card: Card): boolean {
  if (card.streak < PROMOTE_RULE.streak) return false;

  const last5 = card.last10.slice(-5);
  const correctInLast5 = last5.filter((a) => a === true).length;

  return correctInLast5 >= PROMOTE_RULE.correctInLast5;
}
```

### 7.2 Неправильный ответ

```typescript
function handleIncorrectAnswer(card: Card, pace: number): void {
  card.streak = 0;
  card.total_errors += 1;

  let basePenalty = PENALTY_POS_BY_LEVEL[card.level];

  // Мотивированным не даём "сразу же", меньше раздражения
  if (pace > 0) {
    basePenalty += 2;
  }

  card.position = basePenalty;

  // Проверка на понижение уровня
  if (shouldDegrade(card)) {
    card.level = Math.max(1, card.level - 1);
  }

  // Проверка на "пиявку"
  if (isLeech(card)) {
    // Пометить как leech (вынести в отдельный режим: подсказка/разбивка/пауза)
    markAsLeech(card);
  }
}

function shouldDegrade(card: Card): boolean {
  const errorsInLast10 = card.last10.filter((a) => a === false).length;
  return errorsInLast10 >= DEGRADE_THRESHOLD_BY_LEVEL[card.level];
}

function isLeech(card: Card): boolean {
  return card.total_errors >= LEECH_THRESHOLD && card.level < 3;
}
```

---

## 8. Выбор следующей карточки

Всегда берём карточку с минимальной `position` (самую "близкую").

```typescript
function pickNextCard(cards: Card[]): Card | null {
  if (cards.length === 0) return null;

  return cards.reduce((closest, card) => (card.position < closest.position ? card : closest));
}
```

После показа карточки можно уменьшать `position` у остальных на 1 (или просто использовать очередь, где позиция — индекс).

---

## Ожидаемое поведение

### Слабый/неуверенный ученик

- `pace` падает
- → Меньше новых слов
- → Мягче рост интервалов
- → Фокус расширяется при избытке ошибок

### Мотивированный/сильный ученик

- `pace` растёт
- → Больше новых слов
- → Карточки "уезжают" дальше при успехе
- → Меньше ощущения "заелся на одном"

### Нерегулярный ученик

- При возвращении не получает лавину
- → Возврат дозирован (M = 2×F карточек)
- → Постепенное восстановление

---

## Дополнительное улучшение (опционально)

Раздельные уровни/пороги для "прямого" и "обратного" направления (source→target vs target→source).
Это реально повышает качество обучения, но требует усложнения структуры данных.

---

## Сравнение с текущей реализацией lingua-quiz

### Текущая архитектура

- ✅ Позиционная очередь
- ✅ 6 уровней мастерства (LEVEL_0..LEVEL_5)
- ✅ Константы: F=5, K=2, T_PROMO=3
- ❌ **НЕадаптивный** - фиксированные параметры для всех пользователей

### Проблемы текущего алгоритма

#### 1. Отсутствие адаптации под пользователя

- Одни и те же параметры для всех (новичок = эксперт)
- Нет учета точности ответов пользователя
- Нет регулировки нагрузки

#### 2. Проблема "лавины" при возвращении

- При пропуске сессий все слова остаются на старых позициях
- Нет механизма дозированного возврата
- `sessions_since_seen` не отслеживается

#### 3. Жесткий размер фокуса

- F=5 для всех пользователей
- Не учитывает успешность обучения
- Может быть слишком мало для мотивированных или слишком много для слабых

#### 4. Отсутствие защиты от "пиявок" (leeches)

- Нет отдельного режима для проблемных слов
- `total_errors` не отслеживается в БД

#### 5. Неоптимальное управление новыми словами

- Фиксированное пополнение focus pool (30 слов)
- Не адаптируется под успешность пользователя

---

## Преимущества предложенного алгоритма

### 1. Адаптация под ученика (`pace: -1..+1`)

- Автоматическая регулировка на основе точности (acc)
- Простая формула без переусложнения
- ✅ Соответствует research: [Personalized adaptive learning](https://pmc.ncbi.nlm.nih.gov/articles/PMC11544060/)

### 2. Адаптивный размер фокуса (F_min=4, F_max=12)

- Динамическая регулировка нагрузки
- Базируется на `focus_error` (ошибочность в фокусе)
- ✅ Соответствует [FSRS подходу](https://github.com/open-spaced-repetition/fsrs4anki) к оптимизации

### 3. Межсессионный возврат

- Дозированное возвращение слов (M = 2×F)
- Градиентный shift на основе `sessions_since_seen`
- Предотвращает "лавину" после пропуска

### 4. Leech detection

- `total_errors >= 12` для слов уровня <3
- Отдельный режим обработки проблемных слов

### 5. Дифференцированные penalty/thresholds

- Разные пороги для разных уровней
- Более мягкие критерии для сложных уровней

---

## Сравнение с современными алгоритмами

### FSRS (2024)

- ✅ Использует ML для подбора параметров
- ✅ Сокращает количество повторений на 20-30%
- Предложенный подход проще и не требует ML, но достигает похожей цели

### SuperMemo SM-15

- ✅ Адаптивность на основе данных пользователя
- ✅ Memory stability и difficulty tracking
- Предложенный подход использует `pace` вместо сложной модели памяти

### Reinforcement Learning подходы

- [Personalized Dynamic Difficulty Adjustment](https://arxiv.org/html/2408.06818v1) использует RL для адаптации
- Предложенный подход проще (rule-based), но эффективнее для реального использования

---

## Детальное сравнение структур данных

| Поле                  | Текущая БД                   | Предложенное         | Статус            |
| --------------------- | ---------------------------- | -------------------- | ----------------- |
| `level`               | ✅ 0-5                       | ✅ 0-5               | Совместимо        |
| `position`            | ✅ `queue_position`          | ✅ `position`        | Совместимо        |
| `streak`              | ✅ `consecutive_correct`     | ✅ `streak`          | Совместимо        |
| `last10`              | ⚠️ `recent_history` (bool[]) | ✅ `last10` (bool[]) | Нужна адаптация   |
| `total_errors`        | ❌ НЕТ                       | ✅ НУЖНО             | **Добавить в БД** |
| `sessions_since_seen` | ❌ НЕТ                       | ✅ НУЖНО             | **Добавить в БД** |
| `pace` (Student)      | ❌ НЕТ                       | ✅ НУЖНО             | **Новая таблица** |
| `new_today` (Student) | ❌ НЕТ                       | ✅ НУЖНО             | **Новая таблица** |

---

## План реализации

### Phase 1: Расширение данных (Foundation)

#### 1. Добавить миграцию БД

```sql
-- Расширение user_progress
ALTER TABLE user_progress
ADD COLUMN total_errors INTEGER DEFAULT 0,
ADD COLUMN sessions_since_seen INTEGER DEFAULT 0;

-- Новая таблица user_learning_profile
CREATE TABLE user_learning_profile (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  pace FLOAT DEFAULT 0.0 CHECK (pace BETWEEN -1.0 AND 1.0),
  focus_size SMALLINT DEFAULT 5 CHECK (focus_size BETWEEN 4 AND 12),
  total_answers INTEGER DEFAULT 0,
  recent_answers BOOLEAN[] DEFAULT '{}',  -- последние 20
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. Обновить TypeScript types (`packages/domain/`)

#### 3. Обновить OpenAPI schema

### Phase 2: Core Algorithm (Adaptive Logic)

#### 1. Добавить `AdaptiveConfig` в `packages/core/src/constants.ts`

```typescript
export const ADAPTIVE_CONFIG = {
  F_BASE: 5,
  F_MIN: 4,
  F_MAX: 12,
  PACE_ADJUSTMENT_INTERVAL: 20, // каждые 20 ответов
  PACE_HIGH_THRESHOLD: 0.9, // acc >= 90%
  PACE_LOW_THRESHOLD: 0.75, // acc <= 75%
  PACE_INCREMENT: 0.2,
  MAX_NEW_BASE: 10,
  MAX_NEW_MAX: 25,
  LEECH_THRESHOLD: 12,
  PENALTY_POS_BY_LEVEL: { 1: 4, 2: 4, 3: 8, 4: 8, 5: 15 },
  DEGRADE_THRESHOLD_BY_LEVEL: { 1: 3, 2: 3, 3: 4, 4: 4, 5: 3 },
};
```

#### 2. Создать `AdaptiveEngine` (`packages/core/src/AdaptiveEngine.ts`)

```typescript
export class AdaptiveEngine {
  updatePace(recentAnswers: boolean[]): number;
  calculateFocusSize(focusError: number, currentF: number): number;
  calculateNewLimit(pace: number, cardsInFocus: number, F: number): number;
  applyInterSessionReturn(cards: CardState[], F: number): void;
  detectLeech(totalErrors: number, level: number): boolean;
}
```

#### 3. Интегрировать в `QuizManager`

### Phase 3: Backend API (Persistence)

#### 1. Создать эндпоинты

- `GET /api/user/learning-profile`
- `PUT /api/user/learning-profile`
- Обновить `POST /api/user/progress/bulk` для новых полей

#### 2. Добавить логику сессий

- При старте сессии: `sessions_since_seen += 1` для всех слов
- Вызов `applyInterSessionReturn()` при инициализации

### Phase 4: Frontend Integration (UX)

#### 1. Загрузка `LearningProfile` при старте сессии

#### 2. Обновление `pace` каждые 20 ответов

#### 3. UI индикация

- Текущий `pace` (visual gauge: -1 .. +1)
- Adaptive focus size (F)
- Leech warnings

#### 4. Settings

Возможность сбросить профиль (opt-in)

### Phase 5: Testing (Validation)

#### 1. Интеграционные тесты

- `AdaptiveEngine.test.ts` (property-based с fast-check)
- Сценарии: новичок (pace снижается), эксперт (pace растет)
- Edge cases: leech detection, inter-session return

#### 2. E2E тесты

- Полный цикл сессии с адаптацией
- Persistence профиля между сессиями

---

## Быстрая имплементация (MVP)

Если нужно быстро проверить концепцию, можно начать только с **Phase 2** (Core Algorithm):

- Временно хранить `pace` и `total_errors` в памяти (localStorage)
- Не менять БД
- Тестировать локально

**Оценка времени:** ~2-3 часа работы

**Результат:** Понимание, насколько алгоритм эффективнее текущего

---

## Источники и исследования

### Spaced Repetition Research

- [Enhancing human learning via spaced repetition optimization (PNAS)](https://www.pnas.org/doi/10.1073/pnas.1815156116)
- [LECTOR: Adaptive Spaced Learning (2024)](https://arxiv.org/abs/2508.03275)

### Adaptive Learning

- [Personalized adaptive learning review](https://pmc.ncbi.nlm.nih.gov/articles/PMC11544060/)
- [Adaptive Learning Using AI](https://www.mdpi.com/2227-7102/13/12/1216)
- [Personalized task difficulty adaptation](https://link.springer.com/article/10.1007/s11257-021-09292-w)

### Modern Algorithms

- [SuperMemo SM-15 Algorithm](https://super-memory.com/help/AlgSM15.htm)
- [SuperMemo SM-2 Algorithm](https://super-memory.com/english/ol/sm2.htm)
- [FSRS GitHub Repository](https://github.com/open-spaced-repetition/fsrs4anki)
- [FSRS Algorithm Details](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm)

### Implementation References

- [LeitnerQ queueing network model](https://github.com/rddy/leitnerq)
- [Adaptive Learning Algorithms Overview](https://www.meegle.com/en_us/topics/algorithm/adaptive-learning-algorithms)
- [Personalized Dynamic Difficulty Adjustment](https://arxiv.org/html/2408.06818v1)
