# Аудит ECS-ядра: недоработки и план улучшений

> Статус: выполнено, архив

Общий вердикт: база правильная — запросы создаются один раз в фабриках систем
(miniplex кеширует их по ключу), системы — чистые функции над запросами, AI
пишет `velocity`, а `movement` интегрирует, теги (`stationTag`, `playerTag`,
`animated`) идиоматичны для miniplex. Ниже — отступления от ECS-way по убыванию
важности.

## 1. Событийные мутации вне тика

`src/systems/cook-commands.ts:64` — «система» с пустым телом, вся работа в
обработчике `GameEngine.on`. `src/systems/dev-spawn.ts:189` (`onActivity`) тоже
мутирует мир из события. Запрос из чата может прийти посреди кадра и изменить
состояние между системами.

**ECS-way:** событие складывает команду в данные (inbox-компонент на сущности
повара или event-entities в мире), система в начале кадра их разбирает и
уничтожает. Событийная шина остаётся только на границе (twitch → игра).

## 2. Жизненный цикл view/badge размазан и дырявый

`src/systems/render.ts:12` уничтожает `view` при удалении сущности, но `badge` —
только вручную в `src/systems/dev-spawn.ts:77` (`removeCook`). При
`bootstrap.reset()` → `world.clear()` бейджи утекают в ui-слое. Плюс в
`removeCook` двойной `destroy` (ручной + подписка рендера).

**ECS-way:** одна cleanup-система, подписанная на `onEntityRemoved`, уничтожает
все визуальные ресурсы сущности (`view`, `badge.root`), а `removeCook` делает
только `world.remove(cook)`.

## 3. `instanceof` вместо данных

`src/systems/animation.ts:12` проверяет `view instanceof AnimatedSprite`.

**ECS-way:** компонент `animation` (кадры по направлениям, текущее направление),
система работает с данными и не знает про классы Pixi.

## 4. `order-ai` — бог-система

`src/systems/order-ai.ts` — выбор цели + steering + wander + idle-таймеры в
одном цикле, steering продублирован (`navigation.moveToward` и локальный
`walkTo`, order-ai.ts:75).

**ECS-way:** разбить на `targeting` (пишет `target`), `steering` (target →
velocity, общий для auto/chat), `wander`. Тогда chat-режим переиспользует
steering вместо дубля.

## 5. Аллокации и потеря ссылки в target

`src/systems/order-ai.ts:136` каждый кадр создаёт
`{ type, position: { ...station.approach } }`.

**ECS-way:** `targetStation: Entity` (ссылка на станцию), `approach` читать у
неё — меньше GC и arrival-проверка не рассинхронится при ресайзе.

## 6. Линейные поиски

`stationFinder.byType` (`src/core/stations.ts:14`) и `ensureCook`
(`src/systems/cook-commands.ts:20`) сканируют запросы каждый тик на каждого
повара — при ботах O(n²). В miniplex индексов нет.

**Решение:** `Map<StationType, Entity>` / `Map<cookId, Entity>`, обновляемые
через `onEntityAdded` / `onEntityRemoved`.

## 7. Состояние вне мира, которое reset не сбрасывает

Очередь ботов, `spawned`, `worstFrameMs` — в замыканиях систем;
`bootstrap.reset()` чистит только `world`. После рестарта очередь ботов «оживёт»
в новой игре.

**Решение:** пересоздавать системы на reset, либо хранить состояние в
сущности-синглтоне (как `GlobalConfig`).

## 8. Мелочи

- ~~`ctx.eventBus` объявлен в `BaseContext`, но системы импортируют синглтон
  `GameEngine` напрямую~~ — **сделано**: `cook-commands`, `dev-spawn` и
  `bootstrap` используют `ctx.eventBus`; синглтон `GameEngine` трогает только
  граница (`main.ts`, twitch).
- Общие query-типы: после рефакторинга системы полагаются на вывод типов из
  `world.with(...)`, явные `With<>` почти не нужны; `CookEntity` используется в
  `spawn`/`cook-commands`. Отдельной работы не требует.
- `floor` живёт вне ECS (TilingSprite в замыкании bootstrap + ручной resize) —
  **осознанное исключение**: это единственный фон viewport'а, у него нет игровой
  логики, а `spawnFloor` идемпотентно заменяет спрайт по label.
