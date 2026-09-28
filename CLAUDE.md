# СМОГ · Алматы, 2049 — заметки для Claude Code

Браузерная интерактивная драма на **three.js r128**. Три героя, шесть глав, пять концовок, прогулки от третьего лица, вождение, настоящая карта центра Алматы (OpenStreetMap).
Игра: https://watchout2121.github.io/smog-almaty/ (GitHub Pages, ветка `main`, корень репозитория).

## Команды
- `python3 tools/build.py` — пересобрать `index.html` (после добавления/переименования файлов в `src/` или правки `src/head.html`).
- `python3 tools/build.py --offline` — один самодостаточный файл `dist/smog-offline.html` (ассеты внутри как data:URI; в git не входит).
- `python3 -m http.server 8770` — локальный сервер → http://localhost:8770/ (`file://` для `index.html` не подходит, нужен сервер).
- Тесты (Playwright, headless Chromium с программным WebGL): `npm install` → `npx playwright install chromium`, затем при запущенном сервере:
  - `npm run test:boot` — загрузка, ассеты, сцены, 0 ошибок в консоли;
  - `npm run test:render` — регрессия «чёрных прямоугольников» (Inf/NaN не должны расползаться через свечение);
  - `npm run test:play -- 1 low` — автопрохождение всей игры с сидом 1 (случайные выборы, телепорт к точкам); ~8 минут;
  - `npm run test:shots` — скриншоты всех режимов управления в `tools/tests/out/`.
  - Другой адрес: переменная окружения `SMOG_URL`.
- `python3 tools/geo_build.py` — `assets/geo/source-city-local.json` (OSM, ODbL) → `assets/geo/almaty.json`.

## Устройство
Без сборщика и ES-модулей: скрипты подключаются по порядку в `index.html` (`lib/*.js`, затем `src/art.js`, `looks.js`, `orchard.js`, `city.js`, `play.js`, `story.js`, `engine.js`); общаются через глобальные `THREE`, `ART`, `LOOKS`, `DRIVE`, `PLAY`.
- `src/art.js` — рендер и сцены. Конвейер: MSAA (HalfFloat) → **Sanitize** → SSAO → Bokeh → **Sanitize** → Bloom → Grade (ACES) → FXAA. Сцены — функции `S.name=()=>ctx` (`newCtx` → меши → `finalize`). Персонажи: `makeChar(ctx, key|look, opts)` → X Bot (андроиды), Ready Player Me (люди), Vanguard (охрана); `LOOK` — таблица внешности. `ART.lib` отдаёт хелперы другим файлам, `ART.addScene`, `ART.onLoad` (доп. загрузчики), `ART.whenShown`.
- `src/city.js` — сцены `city` (гл. 4, прогулка Саши) и `city_drive` (гл. 5, погоня) из OSM: здания, дороги, трафик, пешеходы, дроны-сканеры, `ctx.points` (именованные точки маршрута), `window.DRIVE` (машина).
- `src/play.js` — `PLAY.begin(cfg)`: третье лицо, коллизии (`ctx.colliders`, `ctx.queryColliders`, `ctx.walkArea`, `ctx.camBox`), точки взаимодействия, события, цель, мини-карта.
- `src/looks.js` — `LOOKS.dress`: Альтаир (`dina`: лохматые волосы, рубашка с фламинго, улыбка, часы), Никита-Х (`erl`: очки, бородка, красная водолазка, синий пиджак, диод), X2.
- `src/orchard.js` — сцены `orchard` / `orchard_storm` (интерфейс «Евы»).
- `src/story.js` — `CHAPTERS`, `WHO`, `FLOW` (схема выборов), `ENDINGS`, узлы `N.*`, `computeEnding`, `endingText`.
- `src/engine.js` — проигрыватель узлов, звук (синтез), сохранения (`localStorage`: `smog_v1`, `smog_settings`), настройки, прогулки/вождение/реплики на ходу. Отладка: `window.__SMOG` (`play(id)`, `F()`, `startChapter(ch, fresh)`).
- `src/head.html` — CSS и DOM интерфейса (в `index.html` попадает через `tools/build.py`).

## Узел сюжета
`N.id = {ch, who, scene, stamp, lines, walk, drive, choices, timed, def, alarm, wall, qte, on(F), flow, go, flowEnd, ending}`
- `lines`: `[who, text]` или `F => [...]`; `who`: ключ из `WHO`, `'n'` (рассказчик), `'sys'` (системные строки).
- `choices`: `{t, go, flow, fx, if(F), lock}`; `fx` — числа прибавляются к флагам, остальное присваивается.
- Порядок в `play()`: реплики → `walk` → `drive` → `wall`/`qte`/`choices` → `go`.
- `walk`: `{hero, title, start:[x,z,ry]|'точка', spots:[{id, at:[x,y,z]|'точка', npc, r, label, lines, choices, fx, on, flow, end, cond, clue, song}], need, needCount, goal:{at, r, label}, events:[{id, at, r, lines}], after, fov, camDist, walkSpeed, runSpeed, hint}`; строковые точки берутся из `ctx.points` сцены.
- `drive`: `{hero, start, goal, time, hint, barks:[{id, at, r, lines}]}` → флаг `F.drive_fast`.

## Правила проекта
- Тексты и интерфейс — на русском. Без казахскоязычных названий; реальные улицы и места Алматы — можно. Компании и персонажи вымышлены, реальных брендов нет.
- «Мамбетство» звучит только как риторика антагонистов, которую сюжет опровергает; хамство на дорогах показывается как поведение, а не как группа людей.
- Ассеты грузить только через ключи `URLS` (офлайн-сборка подменяет их data:URI) и добавлять пути в `tools/assets.json`.
- Не удалять `SanitizeShader`: на реальных видеокартах блики переполняют half float (Inf), и без него свечение превращает их в огромные чёрные прямоугольники.
- Новые сцены — через `ART.addScene` в отдельных файлах; большие меши объединять (`BufferGeometryUtils`), следить за числом draw calls и качеством `low`.
- Перед коммитом: `npm run test:boot` и `npm run test:render`; после правок сюжета — `npm run test:play` с несколькими сидами.
- Деплой: push в `main` → GitHub Pages пересобирается сам (~1 мин).
