# СМОГ · Алматы, 2049 — заметки для Claude Code

Интерактивная драма на **three.js r128**. Три героя, шесть глав, шесть концовок, прогулки от третьего лица, вождение, настоящая карта центра Алматы (OpenStreetMap).
**Основная форма — приложение для Windows** (Electron, `desktop/`): владелец хочет игру на компьютере, а не в браузере (28.09.2026). Браузерная версия остаётся: https://watchout2121.github.io/smog-almaty/ (GitHub Pages, ветка `main`, корень репозитория). Код игры общий, приложение грузит те же `index.html`, `src/`, `lib/`, `assets/`.

## Память проекта
Всё, что решалось в чате, где игра создавалась (пожелания владельца, история версий, принципы, баги, бэклог):
@docs/MEMORY.md

Сюжетная библия — `docs/STORY.md` (читать перед правками сюжета); ассеты, лицензии и кандидаты на замену (Fab, KitBash3D, Sketchfab, City Sample) — `docs/ASSETS.md`.

## Команды
На Windows вместо `python3` — `python` (npm-скрипты `build`/`serve` написаны под `python3`).
- `npm run desktop` — запустить приложение из исходников (Electron; окно, F12 — DevTools). `npm run dist:win` — собрать `dist/desktop/SMOG-Setup-<версия>.exe` (NSIS) и `SMOG-<версия>-portable.exe`; подписи нет, SmartScreen предупредит о неизвестном издателе.
- `npm run test:desktop [сцена]` — приложение стартует, игра грузится через `smog://`, кнопка «Выйти», WebGL на видеокарте, 0 ошибок. `SMOG_EXE=dist\desktop\win-unpacked\SMOG.exe` — проверить собранный exe. Если песочница не даёт писать в `%APPDATA%`, задать `SMOG_USERDATA=%TEMP%\smogud` (путь короткий: длинный Chromium не создаёт).
- `python3 tools/build.py` — пересобрать `index.html` после **любой** правки `src/` (в ссылках на скрипты меняется `?v=<хэш>`) и после правки `src/head.html`.
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
Без сборщика и ES-модулей: скрипты подключаются по порядку в `index.html` (`lib/*.js`, затем `src/art.js`, `looks.js`, `orchard.js`, `core.js`, `city.js`, `play.js`, `story.js`, `engine.js`); общаются через глобальные `THREE`, `ART`, `LOOKS`, `DRIVE`, `PLAY`.
- `src/art.js` — рендер и сцены. Конвейер: MSAA (HalfFloat) → **Sanitize** → SSAO → Bokeh → **Sanitize** → Bloom → Grade (ACES) → FXAA. Сцены — функции `S.name=()=>ctx` (`newCtx` → меши → `finalize`). Персонажи: `makeChar(ctx, key|look, opts)` → X Bot (андроиды), Ready Player Me (люди), Vanguard (охрана); `LOOK` — таблица внешности. `ART.lib` отдаёт хелперы другим файлам, `ART.addScene`, `ART.onLoad` (доп. загрузчики), `ART.whenShown`.
  Андроиды на X Bot раскрашиваются шейдером `REGION` по позе привязки (метры, T-поза): глянцевые панели со швами и винтами, линзы глаз, диск на виске с кольцом-диодом; меш `Beta_Joints` — чёрная механика суставов (`charMat(L,true)`). `LOOK.*.shell:1` — корпус без одежды (цвета `top`/`bot` = цвета панелей, чёрный «пояс» с огоньками, чёрные кисти); `hair:null` — без «скальпа»; `eye` — цвет линз. Серийные модели: `unitLook('plain'|'eco'|'patrol'|'courier'|'cleaner'|'taxi')`. Облик — по референсу владельца «Humanoid robot AI» (Sketchfab), сама модель не используется.
- `src/city.js` — сцены `city` (гл. 4, прогулка Саши) и `city_drive` (гл. 5, погоня) из OSM: здания, дороги, трафик, пешеходы (≈¼ — серийные андроиды без масок), рабочие андроиды `androidWorkers` (дворник с тележкой, эко-инспектор, патруль, регулировщик, курьер), дроны-сканеры, `ctx.points` (именованные точки маршрута, в т. ч. `workers`), `window.DRIVE` (машина). Окна зданий — interior mapping (`ROOM`/`roomMap`: комнаты с параллаксом, мебель, лампы, офисы в стеклянных башнях).
- `desktop/main.js` — окно Electron (полный экран, `force_high_performance_gpu`), протокол `smog://` читает файлы игры с диска (MIME, CSP); `desktop/preload.js` — `window.SMOG_DESKTOP` (`quit`, `fullscreen`), по нему в меню появляется «Выйти».
- `src/play.js` — `PLAY.begin(cfg)`: третье лицо, коллизии (`ctx.colliders`, `ctx.queryColliders`, `ctx.walkArea`, `ctx.camBox`), точки взаимодействия, события, цель, мини-карта.
- `src/looks.js` — `LOOKS.dress`: Альтаир (`dina`: лохматые волосы, рубашка с фламинго, улыбка, часы), Никита-Х (`erl`: очки, бородка, красная водолазка, синий пиджак, диод), X2.
- `src/orchard.js` — сцены `orchard` / `orchard_storm` (интерфейс «Евы»).
- `src/core.js` — сцена `core` «Ядро Евы» (гл. 3 — мини-игра «ревью кода», гл. 6 — перед эфиром): проход между стойками (огни — `ShaderMaterial` на `InstancedMesh`, атрибут `aId`), мокрый пол-отражение, лучи, панели с кодом «Чистки», стеклянная колонна с голограммой Евы, «цифровой дождь».
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
- Перед коммитом: `npm run test:boot` и `npm run test:render`; после правок сюжета — `npm run test:play` с несколькими сидами; после правок `desktop/` — `npm run test:desktop`.
- Приложение: имя (`productName`) и всё, что попадает в HTTP-заголовки, — только латиницей (иначе User-Agent ломает загрузку `smog://`); русское имя — в заголовке окна и ярлыке NSIS. Внешние ссылки открываются в системном браузере.
- Деплой: push в `main` → GitHub Pages пересобирается сам (~1 мин). Git на этом компьютере — `%LOCALAPPDATA%\Programs\PortableGit\cmd\git.exe` (не в PATH), автор коммитов `watchout2121 <watchout2121@users.noreply.github.com>`; сообщение коммита с кириллицей передавать через файл с коротким путём (`-F %TEMP%\msg.txt`). Подробности входа — в docs/MEMORY.md. Установщик — `npm run dist:win`, файлы из `dist/desktop/` в git не входят (их можно выложить в GitHub Releases).
