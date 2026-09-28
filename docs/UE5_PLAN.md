# План переезда «СМОГ · Алматы, 2049» на Unreal Engine 5

Исследование от 28.09.2026. Номера в квадратных скобках — источники в конце файла.
«не проверено» — не нашёл подтверждения в первоисточнике; «оценка» — мой расчёт, а не факт.
Часть страниц (Fab, Adobe, unrealengine.com) отдавала 403, для них данные взяты из поисковой выдачи — это отмечено.

## 0. Главное (решения)

1. **Версия — UE 5.8.x** (последний хотфикс 5.8.3 вышел 22.09.2026) [1][2]. 5.8 — последний крупный релиз UE5, ранний доступ UE6 ожидают в конце 2027 [3]. Весь проект делаем на 5.8, про UE6 пока не думаем.
2. **Компилятор — Visual Studio 2026 Community.** Для 5.8 Epic пишет «Use Visual Studio 2026 for general development» [5][6]. Build Tools без IDE тоже подходят (см. 1.4).
3. **16 ГБ ОЗУ — ниже рекомендации Epic (32 ГБ)** [6]. Работать можно при условиях: не открывать полный City Sample, собирать MetaHuman в «UE Optimized», брать программный Lumen или Lumen Lite, ограничить число процессов компиляции шейдеров. Самый полезный апгрейд потом — 2×16 ГБ.
4. **MetaHuman** с 5.6 создаётся прямо в редакторе. Для авто-рига и текстур нужны облачные сервисы Epic [18][19]. Лицензия — EULA Unreal: в коммерческой игре можно, бесплатно при выручке до $1 млн [26].
5. **City Sample целиком не открываем:** минимум 64 ГБ ОЗУ и 12 ядер [29]. Берём отдельные паки (Buildings — 1,6 ГБ; Vehicles; Crowds). Лицензия у них «только для продуктов на Unreal» [30][31][32].
6. **В UE 5.8 есть экспериментальный плагин Unreal MCP.** Через него Claude Code управляет редактором напрямую [4][63]. Вместе с Python-скриптами и RunUAT это снимает с владельца большую часть кликов.
7. **Звук.** Эффекты: Sonniss GDC, Freesound (фильтр CC0), Kenney. Музыка: Pixabay (есть риск претензий Content ID на стримах) или CC-BY с титрами. **Озвучка:** платный ElevenLabs (коммерческая лицензия, русский язык есть). Silero и XTTS-v2 в коммерческой игре использовать нельзя.
8. **Контроль версий.** Git + LFS локально. Удалённая копия — Azure DevOps (LFS бесплатно) плюс бэкап на внешний диск. 10 GiB бесплатного LFS на GitHub быстро закончатся [66].
9. **Вертикальный срез** (глава ~15 минут: квартира + улица) — примерно 9 недель (оценка), график в разделе 8.

---

## 1. Версия, установка, диск, Visual Studio

### 1.1 Версия
- UE 5.8 вышел 17.06.2026 [1][3]. Хотфиксы: 5.8.1 (июль), 5.8.2 (август), 5.8.3 (22.09.2026) [2].
- Что в 5.8 полезно нам [4]:
  - MegaLights получил статус Production Ready;
  - **Lumen Lite** — средний уровень качества, «twice as fast as Lumen high quality»;
  - MetaHuman: захват тела с одной камеры (экспериментально);
  - экспериментальный MCP-плагин для AI-агентов.
- Epic называет 5.8 «final major release ahead of Unreal Engine 6», ранний доступ UE6 — «late-2027» (по wccftech) [3].

### 1.2 Установка через Epic Games Launcher (делает владелец, 15 минут кликов)
Официальный порядок [7]:
1. Установить Launcher и **войти в учётку Epic** (обязательно). Пароль вводит владелец, не Claude.
2. Раздел Unreal Engine → Library → «+» у ENGINE VERSIONS → выбрать 5.8.x.
3. Принять EULA → выбрать папку (по умолчанию `C:\Program Files\Epic Games\UE_5.8`) → **Options** → Install.

| Опция в Options [7] | Что делаем | Почему |
|---|---|---|
| Core Components | оставить | обязательна |
| Starter Content | оставить | мелкие тестовые ассеты |
| Templates and Feature Packs | оставить | шаблон Third Person (C++) |
| Engine Source | снять | для игрового C++ не нужен |
| **Editor symbols for debugging** | **снять** | нужны только для разбора падений; по сообщениям пользователей, занимают десятки ГБ (не проверено) |
| **Target Platforms: Android, iOS, Linux, TVOS** | **снять все** | собираем только Win64 |
| MetaHuman Creator Core Data | **оставить** | без неё не работает MetaHuman Creator в редакторе [19] |

Опции можно поменять позже без полной перекачки [7]. Точный объём Launcher показывает в окне Options перед установкой [7].

### 1.3 Сколько займёт диск (оценка, не проверено)
| Что | Оценка |
|---|---|
| UE 5.8 с опциями выше | 45–70 ГБ |
| VS 2026 Community с нужными нагрузками | 15–35 ГБ |
| DDC / Zen-кэш (`C:\ProgramData\Epic\Zen\Data` [10]) | 10–40 ГБ, растёт |
| Проект: 2–3 MetaHuman, паки Fab, City Sample Buildings | 20–60 ГБ |
| **Итого** | **~90–200 ГБ при ~170 ГБ свободных** |

Вывод: места впритык. Не качаем полный City Sample, в Launcher держим только одну версию движка. Когда станет тесно, берём внешний SSD и переносим туда DDC через `UE-LocalDataCachePath` [10].

### 1.4 Visual Studio / MSVC для UE 5.8
Из документации Epic [5]:
- **Версии VS:** VS 2022 17.14 или новее, либо VS 2026 18.0 или новее. Совет Epic: «Use Visual Studio 2026 for general development».
- **MSVC:** минимум 14.38, рекомендуется 14.50.
- **Windows SDK:** минимум 10.0.22621.0, рекомендуется 10.0.26100 или новее.
- **.NET:** 10.0 (для VS 2026).
- **LLVM** (18.1.8–20.1.8) нужен только для сборки через clang, нам не нужен.
- **Нагрузки (workloads):** «.NET desktop development», «Desktop development with C++», «.NET Multi-platform App UI development», «Game development with C++».
- **Компоненты внутри «Game development with C++»:** «C++ profiling tools», «C++ AddressSanitizer», «Windows 10 or 11 SDK», «Unreal Engine installer».

**Хватит ли Build Tools без IDE?**
- В документации Epic Build Tools не упоминаются [5].
- Документация JetBrains Rider прямо говорит, что Build Tools достаточно: «Without Visual Studio, you need to install Visual Studio Build Tools separately». Пример компонентов у них — для UE 5.6: Windows 11 SDK 10.0.26100.3916+, .NET Framework SDK 4.8.1+, MSVC v143 14.38 [8].
- Лицензия: Build Tools лицензируются как дополнение к лицензии VS [9]. VS Community бесплатен для индивидуального разработчика, в том числе для платных приложений [9]. Значит, владельцу Build Tools использовать можно.
- **Вывод:** ставим VS 2026 Community с нагрузками выше — это документированный путь, и в нём есть отладчик. Build Tools 2026 — запасной вариант, если не хватит места; для 5.8 он **не проверен**.
- Claude подготовит файл `.vsconfig`, владелец импортирует его в Visual Studio Installer (Import configuration) и нажимает «Установить».

---

## 2. Как запустить UE5 на 16 ГБ ОЗУ и 8 ГБ VRAM

### 2.1 Факты
- **Рекомендации Epic для 5.8:** Windows 11, 32 ГБ ОЗУ, от 8 ГБ видеопамяти, DX12-видеокарта [6]. По VRAM (8 ГБ) мы на уровне рекомендации, по ОЗУ — вдвое ниже.
- **Память MetaHuman при сборке:** «UE Cine» занимает в среднем 1–2 ГБ на персонажа, «UE Optimized» — меньше 100 МБ [20]. Для нас это главный ограничитель.

### 2.2 Настройки редактора
- **Вьюпорт → Settings → Engine Scalability Settings.**
  - Во время работы: Medium/High.
  - Для просмотра кадров: Epic.
  - Разрешение вьюпорта (Screen Percentage) снижать: UI не масштабируется, а цена апскейла небольшая [13].
- **Не держать Realtime во вьюпорте без нужды.** Для GPU Lightmass это официально ускоряет запекание [17]. Общий эффект на ОЗУ — не проверено.
- **Файл подкачки Windows** — системный размер или ≥32 ГБ на SSD. Это общая практика при нехватке ОЗУ (не проверено для UE 5.8).
- **Пока открыт редактор,** закрыть браузер с десятками вкладок и другие тяжёлые приложения.

### 2.3 Свет: Lumen или запечка
- **Lumen.**
  - Software Ray Tracing — «the fastest tracing method in Lumen». Hardware RT качественнее, но дороже [11].
  - Уровень **High** рассчитан на 60 fps на консолях, **Epic** — на 30 fps [11].
  - **Lumen Lite** (Medium GI, Irradiance Field Gather) рассчитан на «low-end PC» и примерно вдвое быстрее по GI и отражениям [4][11][12].
- **MegaLights** в 5.8 готов к продакшену: много источников с тенями при меньшей цене [4][12]. Это неон, лампы, фары в смоге.
- **Запечённый свет (GPU Lightmass).** Нужен DX12 и достаточно VRAM, чтобы вся сцена поместилась в память [17].
  - Хорош для статичной квартиры.
  - Минусы: теряем динамику (включить/выключить свет в сюжете), и персонажам всё равно нужен динамический свет.
- **Решение для среза:**
  - по умолчанию Lumen SW: High в кинокадрах, Lumen Lite в свободном движении;
  - если в квартире меньше 30 fps при 1080p с TSR, запекаем её через GPU Lightmass;
  - улицу оставляем на Lumen: там смог, фары, дроны.

### 2.4 Nanite, тени VSM, текстуры
- **Nanite** — для всей статики: здания, мебель, пропсы. City Sample Buildings уже рассчитаны на Nanite. В 5.8 ускорена растеризация Nanite на слабом железе [12].
- **Virtual Shadow Maps (VSM).**
  - Скелетные меши и материалы с WPO/PDO сбрасывают кэш теней каждый кадр [14]. Поэтому одновременно в кадре держим немного анимированных персонажей и мало «качающейся» растительности.
  - Для травы хватает Contact Shadows [14].
  - В 5.8 появились экспериментальные упрощённые дальние тени VSM («prefiltered distant») [12].
- **Пул текстурного стриминга** (`r.Streaming.PoolSize`).
  - По умолчанию размер зависит от объёма VRAM [15].
  - Ставить 0 нельзя: это означает «бесконечная VRAM» [15b].
  - Поднимать постепенно, не выше половины VRAM (~4000 МБ) [15b].
- **Паки с 8K-текстурами** (у City Sample Buildings 2K–8K [32]) ограничить до 2K через Texture Group / Max Texture Size. Иначе 8 ГБ VRAM кончатся.

### 2.5 Шейдеры и DDC
- **Число процессов компиляции.** В `[DevOptions.Shaders]` параметр `NumUnusedShaderCompilingThreads` задаёт, сколько потоков оставить свободными. Чем меньше число, тем больше процессов ShaderCompileWorker [16].
- **Сколько ставить.** На форуме сообщают, что один ShaderCompileWorker может занимать 2+ ГБ ОЗУ [16b]. Поэтому на 16 ГБ поток не «отпускаем»: начинаем с `NumUnusedShaderCompilingThreads=8` и подбираем значение (оценка).
- **DDC.**
  - С 5.4 по умолчанию используется Unreal Zen Storage в `C:\ProgramData\Epic\Zen\Data\` [10].
  - Перенос кэша: `setx UE-LocalDataCachePath D:\DDC` или Editor Preferences → «Global Local DDC Path» [10].
  - Сэмплы Epic приходят с Pak DDC (`.ddp`), поэтому первая компиляция у них короче [10].
- **Первый запуск проекта с MetaHuman** компилирует шейдеры десятки минут (оценка). Запускать на зарядке, на ночь.

Черновик `Config/DefaultEngine.ini` (Claude допишет и подберёт числа):
```ini
[/Script/Engine.RendererSettings]
; r.Streaming.PoolSize=3000   ; включать, только если есть предупреждение "over budget"
[DevOptions.Shaders]
NumUnusedShaderCompilingThreads=8
```

### 2.6 Чего избегать
- **Полный проект City Sample**, особенно карту Big City (~4×4 км). Минимальные требования: 64 ГБ ОЗУ, 12 ядер [29].
- **MetaHuman в сборке «UE Cine»** для игровых сцен (1–2 ГБ на персонажа [20]) и волосы-пряди (strands) у всех сразу [22].
- **Hardware RT Lumen и Path Tracer** — разве что для рекламных скриншотов.
- **Экспериментальные системы** в срезе: Nanite Foliage [4], MetaHuman Crowd [23], тяжёлый PCG.

---

## 3. MetaHuman

### 3.1 Как создавать сейчас
- **С UE 5.6 веб-приложение MetaHuman Creator больше не используется** для новых персонажей: они создаются в редакторе как ассет MetaHuman Character. Веб — только для UE 5.5 и старше [18][18b].
- **Что нужно:**
  - опция установки «MetaHuman Creator Core Data» и включённый плагин MetaHuman Creator [19];
  - интернет и облачные сервисы Epic: «uses cloud services for auto rigging and texture synthesis» [19]. При нестабильной сети это место отказа: делать в спокойное время, при сбое повторять.
- **Сборка (Assembly)** [20]:
  - **UE Cine** — полные текстуры, пряди волос на LOD0, 1–2 ГБ;
  - **UE Optimized** — уровни High/Medium/Low, меньше 100 МБ;
  - **UEFN**;
  - **DCC Export** — в 5.8 перенесён в Export.
- **Что нового в 5.8** [23]:
  - превращение готового меша тела в полноценного MetaHuman (conforming);
  - незапечённые текстуры для своего стиля;
  - предпросмотр в своём освещении.
- **У MetaHuman Creator есть Python API** (авто-риг, текстуры, сборка по всем пайплайнам) [28]. Claude может автоматизировать всё, кроме творческой лепки лица.

### 3.2 Лицензия
- С 04.06.2025 MetaHuman подпадает под стандартную EULA Unreal Engine [26]:
  - можно использовать в коммерческих проектах, в других движках, продавать на маркетплейсах;
  - бесплатно для тех, у кого выручка меньше $1 млн в год, выше — seat-лицензия ($1 850 в год);
  - запрещено одно: «to train or enhance the AI models».
- Сама игра на UE платит 5% роялти с пожизненной выручки продукта сверх $1 млн. Продажи в Epic Games Store роялти не облагаются [70] (по выдаче поиска).

### 3.3 Производительность на ноутбуке
- **Спецификация голов** [21]:
  - LOD0: 24 000 вершин, 669 blendshape, 713 суставов;
  - LOD7: 130 вершин.
- **Волосы** [21]: пряди (strands) — только LOD0–1, «карточки» (cards) — до LOD4, меш — LOD5–7.
- **Управление LOD** [22]:
  - компонент LODSync (Forced LOD, Min LOD);
  - для производительности `r.HairStrands.UseCardsInsteadOfStrands 1`;
  - предупреждение Epic: принудительный LOD 0–1 у многих персонажей бьёт по производительности.
- **Сколько персонажей тянет RTX 4060 Laptop** — официальной цифры нет (**не проверено**). Сторонняя оценка: 3–6 мс GPU на персонажа с LOD0 и прядями на RTX 3070/4070 в 1080p [71].
- **Наш бюджет (оценка):**
  - в кадре до 2–3 героев в UE Optimized High;
  - пряди — только в крупных планах Sequencer;
  - остальные NPC — Optimized Medium/Low или City Sample Crowds.

### 3.4 Лицевая анимация: что есть в текущей версии
| Способ | Статус | Источник |
|---|---|---|
| iPhone с TrueDepth через Live Link Face (запись глубины) | официально поддерживаются iPhone 12 и новее | [27] |
| Моно-видео и веб-камера | с 5.6 | [26] |
| Анимация по звуку (audio-driven), офлайн с настройкой движения головы, морганий и настроения; есть и real-time | с 5.5, требуется 5.6+ для текущего процесса | [25] |
| Real-time с Android/iPad и внешней камеры через Live Link Face | 5.7 | [24] |
| Тело с одной камеры | экспериментально, 5.8, тело только на Windows | [23] |

Результат экспортируется как Animation Sequence или Level Sequence [25]. Epic пишет, что анимация по звуку «supports various languages» [25b], но **русский язык отдельно не проверен**.

**План:** реплики (живые или TTS) → анимация по звуку → правка ключей в Sequencer. Если у владельца есть iPhone 12+, крупные эмоциональные сцены снимаем через Live Link Face.

### 3.5 Волосы и одежда
Пряди — самая дорогая часть. В игровых сценах используем cards [21][22]. Одежда в 5.6+ — Outfit Asset, который подгоняется под фигуру [26].

---

## 4. City Sample и City Sample Buildings

- **Полный City Sample.**
  - Требует UE 5.8 [29]. По анонсу Epic, город в обновлении заново собран на PCG и показаны MCP-процессы [29b] (страница отдала 403, данные из выдачи поиска).
  - Минимум: Win10 DX12, 12 ядер по 3,4 ГГц, **64 ГБ ОЗУ**, RTX 2080 или Radeon 6000, ≥8 ГБ VRAM, SSD [29].
  - Две карты: Big City (~4×4 км) и Small City [29].
  - Размер скачивания официально не нашёл (**не проверено**). На форуме пишут о ~100 ГБ данных [34].
- **Лицензия.** «licensed for use only in Unreal Engine-based products, including commercial projects» [30]. На Fab City Sample помечен как «UE-Only Content» [31]. Со страницы City Buildings в ASSETS.md то же самое.
- **Отдельные паки** (можно использовать независимо от проекта):
  - **City Sample Buildings:** 1,6 ГБ, UE 5.0–5.8, 24 модульных кита + 44 готовых здания, 2000+ мешей, текстуры 2K–8K [32] (по выдаче поиска со страницы Fab);
  - **Vehicles:** 13 машин [30] (по выдаче поиска), пак существует отдельно [30b];
  - **Crowds:** риггованные головы и тела на основе MetaHuman, гардероб на 6 типов фигуры [33].
- **Как перенести в наш маленький проект:**
  1. Предпочтительно: на Fab «Add to My Library» → в Launcher у пака **Add to Project** → наш проект на 5.8. Полный City Sample при этом не нужен.
  2. Если нужно что-то только из полного проекта: открыть его на время (на 16 ГБ — с риском), в Content Browser выбрать ассеты → **Migrate**, снять галочки со всего вне папки Game [34]. В целевом проекте должны быть включены те же плагины [34].
  3. Здания в паке собраны как Blueprint из частей. Если превратить их в один Static Mesh, раскладка теряется [34b]. Оставляем BP или используем Merge Actors на готовой сцене.
  4. Сразу после импорта ограничиваем текстуры до 2K (см. 2.4).

---

## 5. Другие источники ассетов
| Источник | Условия | Для нас |
|---|---|---|
| **Fab — Standard License** | Personal: выручка покупателя ≤ $100 000 за 12 месяцев; Professional — выше. Есть CC-BY (нужна атрибуция) и наследная «UE Marketplace License» [35] | основной магазин; лицензию каждого листинга проверять (UE-only или нет) |
| **Fab — Limited-Time Free** | новые бесплатные товары раз в две недели, бесплатны только две недели [36] | забирать в библиотеку в окно раздачи. Что лицензия остаётся навсегда — по практике, не проверено |
| **Quixel Megascans** | бесплатно было до конца 2024 (вечная лицензия для тех, кто забрал). С 2025 платно: от $0,99 за ассет, наборы от $24,99, бесплатный стартовый набор 1500+ ассетов [37][37b] | мелочь для квартиры и улицы из стартового набора |
| **Mixamo** | бесплатно, royalty-free, в том числе в коммерческих играх; нельзя распространять как отдельные ассеты; нельзя обучать ML [38] (страница Adobe отдала 403, данные из выдачи) | бытовые анимации; ретаргет на Manny или MetaHuman |
| **Game Animation Sample (Epic)** | 500+ анимаций, обновлён под 5.8, ассеты и системы можно мигрировать в свой проект [40]. Есть ли пометка UE-only — не проверено | ходьба и повороты героев (Motion Matching) |
| **Poly Haven** | CC0, в том числе коммерческое использование без атрибуции [41] | HDRI и материалы |

**Ретаргет Mixamo → Manny/MetaHuman.** В редакторе есть IK Retargeter и Auto Retarget Chains / Auto Align [39]. Ретаргетеры можно создавать из Python [39b], так что Claude настроит это скриптом. Платный плагин не обязателен.

---

## 6. Звук и озвучка

### 6.1 Музыка и SFX
| Источник | Лицензия | Нюансы |
|---|---|---|
| **Sonniss #GameAudioGDC** (2026: ~7,5 ГБ) [43b] | royalty-free, коммерческое использование, без атрибуции; нельзя распространять как звуки, нельзя обучать ИИ [43] | лучший бесплатный набор SFX: город, машины, интерфейсы |
| **Freesound** [42] | у каждого звука своя лицензия: CC0 (без условий), CC-BY (титры), CC-BY-NC (**нельзя** в коммерции) | фильтр «Creative Commons 0» |
| **Kenney audio** [45] | CC0 | звуки интерфейса |
| **Pixabay Music/SFX** [44] | без атрибуции и оплаты; нельзя продавать как отдельный контент. FAQ предупреждает: часть авторов регистрирует треки в Content ID, поэтому на YouTube возможны претензии [44b] | для музыки — риск для летсплеев; брать проверенные треки или SFX |
| **OpenGameArt** [46] | лицензия у каждого файла: CC0 / OGA-BY / CC-BY / CC-BY-SA / GPL. CC-BY-SA и GPL в закрытой игре рискованны | фильтр CC0 + OGA-BY |
| **Free Music Archive** [47] | лицензия у каждого трека (часто NC) | только треки с разрешённым коммерческим использованием |
| **Incompetech (Kevin MacLeod)** [48] | CC BY 4.0 (обязательны титры) или платная лицензия без атрибуции | запасной вариант для фона |

Лейтмотивы трёх героев (как у Detroit, см. раздел 7) лучше заказать композитору: в библиотеках такого не будет.

### 6.2 Русская озвучка через TTS
| Вариант | Качество (оценка) | Лицензия для игры |
|---|---|---|
| **ElevenLabs** | высокое; Eleven v3 поддерживает русский [49b] | бесплатный план: без коммерческого использования и с атрибуцией. Все платные планы включают коммерческую лицензию (кроме бета-функций) [49]. Цена плана и оплата из Казахстана — не проверено |
| **Azure AI Speech** | хорошее, нейроголоса | русские голоса и условия для игр — **не проверено** |
| **Yandex SpeechKit** | хорошее для русского | платный, пробный период и стартовый грант [53]; права на синтез в играх — **не проверено** |
| **Silero TTS** | среднее | большинство моделей, включая русские, — CC BY-NC → **нельзя** в коммерции [50] |
| **Coqui XTTS-v2** | хорошее, клонирование | CPML — только некоммерческое использование, а Coqui закрылась, лицензию купить не у кого [51] |
| **Piper** (ru_RU: denis, dmitri, irina, ruslan) | среднее | у голоса irina лицензия датасета «Unknown» → риск [52] |

**Рекомендация:** в срезе — платный ElevenLabs. Главных героев в релизе — по возможности живые актёры, TTS для второстепенных. Условия озвучки перепроверить перед релизом.

---

## 7. Почему Detroit: Become Human выглядит так, и как это повторить в UE5

Факты из первоисточников и Википедии, приёмы — наши. Ассеты Detroit не используем.

| Что у Detroit | Источник | Как сделать в UE5 |
|---|---|---|
| У каждого героя свой операторский стиль. Кара — «thick grain and shaky long lens», Коннор — мелкое зерно и синяя гамма, Маркус — оранжевый и белый (оператор-постановщик Aymeric Montouchet) | [54] | три «профиля героя» в DataAsset: Film Grain, цветокоррекция/LUT, Camera Shake «с рук», типичные объективы. Профиль включается вместе со сменой героя |
| Свет в фотометрических единицах, калибровка, контроль экспозиции, объёмный свет | [55] (GDC 2018, G. Caurant) | физические единицы света в UE, ручная экспозиция (EV100) по сценам, Exponential Height Fog + Volumetric Fog — это и есть наш смог |
| Свет в двух слоях: свет площадки для общих планов и отдельный кинематографический свет для крупных планов; цветокоррекция в конце | [58] | Rect Light на лица на отдельном Lighting Channel (только персонажи), включаются треком Sequencer в нужных кадрах |
| Forward clustered rendering + TAA; DoF и motion blur высокого качества | [56][57] | CineCamera: Filmback Super 35, объективы 35–85 мм (крупные планы 85–135), f/1.4–2.8, фокус на глаза [60]; TSR; умеренный motion blur |
| ~35 000 кадров-планов, 74 000 анимаций, 324 дня перф-капчура, 250+ актёров | [54] | соло не повторить. Компенсируем малым числом локаций и множеством крупных планов; камеры и склейки ставит Claude в Sequencer по раскадровке в JSON [61] |
| Схема ветвлений после главы и возврат к точкам выбора | [54][59] | UMG-экран, строится из JSON-графа сюжета (пройденные / закрытые узлы); «перемотка» — загрузка чекпойнта |
| Выборы с обратным отсчётом, QTE, ветвящиеся диалоги | [54] | UMG-виджет выбора с таймером, Enhanced Input, замедление через Global Time Dilation в QTE |
| Реконструкция событий у Коннора (перемотка вперёд и назад) | [54] | Level Sequence с ручной перемоткой по времени; улики подсвечиваются через Custom Depth/Stencil + пост-эффект «режим анализа» |
| У каждого героя свой композитор и тема | [54] | три лейтмотива (см. 6.1) |

**Интерфейс (наблюдение по игре; официальных докладов по UI не нашёл — не проверено):**
- варианты реплик — одно-два слова, привязанные к кнопкам;
- таймер — полоса вокруг вариантов;
- всплывающие «отношения ▲/▼» и «цель обновлена»;
- в переговорах — «вероятность успеха, %»;
- после главы — схема с процентами выборов других игроков.

В UE это UMG + CommonUI (геймпад и клавиатура). Все виджеты Claude пишет в C++.

---

## 8. Дорожная карта вертикального среза

### 8.1 Кто что делает
**Владелец (только руками, по пошаговым инструкциям Claude):**
- вход в Epic (Launcher, Fab, облако MetaHuman) и в другие сервисы; пароли никогда не передаются Claude;
- установки с окнами UAC, принятие EULA;
- кнопки «Add to My Library» и «Add to Project» на Fab;
- творческая лепка MetaHuman;
- плейтест и решения по вкусу; запись голоса или съёмка лица, если будут.

**Claude Code:**
- C++ (модули игры, UI на UMG/CommonUI, сюжетный рантайм);
- конфиги `.ini`;
- Python-скрипты редактора [62]: импорт сюжета из JSON в DataTable [64][64b], расстановка по планам уровней, ретаргет, сборка MetaHuman [28];
- управление редактором через Unreal MCP (экспериментально, только localhost, без авторизации) [63];
- сборка через UBT и RunUAT [65];
- git, документация.

Проект: `C:\Users\thebo\code\smog-ue` (сейчас пусто). Сюжет — JSON в репозитории, это единственный источник правды; ассеты DataTable генерируются из него.

### 8.2 По неделям (оценка; неделя ≈ 10–15 часов участия владельца)
| Нед. | Цель | Владелец | Claude Code | Готово, когда |
|---|---|---|---|---|
| 0 | Окружение | установить UE 5.8 (1.2) и VS по `.vsconfig`; включить плагины Python и Unreal MCP (5 кликов) | `.vsconfig`, `.gitignore`/`.gitattributes`, C++-проект Smog, `tools/*.ps1` (сборка, запуск Python, упаковка), DefaultEngine.ini под 16 ГБ, `.mcp.json` [63] | пустой уровень открывается, `Build.bat` собирает |
| 1 | Сюжетный движок | проверить тестовую сцену (Play) | JSON-схема: сцены, реплики, выборы с таймерами, флаги, отношения, узлы схемы; импорт в DataTable; `UStorySubsystem`, сохранения | тестовая глава проходится текстом с выбором |
| 2 | Интерфейс | оценить вид, выбрать шрифт | виджеты: выбор с таймером, субтитры, «отношения», цели, подсказки QTE, схема главы; поддержка геймпада | все виджеты работают на заглушках |
| 3 | Персонажи | вылепить 2–3 MetaHuman, собрать UE Optimized High | Python для сборки и LOD, ретаргет GASP/Mixamo, контроллер от 3-го лица, взаимодействие «посмотреть / нажать» | герой ходит по пустой сцене с анимациями |
| 4 | Квартира | забрать на Fab и в Megascans мебель по списку Claude | расстановка по JSON-плану (Python/MCP), свет (Lumen или запечка), интерактивные предметы | утро героя в квартире играется, ≥30 fps |
| 5 | Улица | добавить в проект City Sample Buildings и Vehicles | кусок улицы 100–150 м, смог (volumetric fog), дроны, 5–10 NPC, бюджет VRAM и ОЗУ | улица проходится, ≥30 fps, нет «over budget» |
| 6 | Кино и голос | утвердить голоса (TTS или запись) | 6–10 планов в Sequencer, камеры, анимация лиц по звуку, профили героев (раздел 7) | ключевой диалог выглядит «как кино» |
| 7 | Геймплей главы | плейтест | улики и реконструкция, QTE, выбор с отложенным последствием, схема после главы | глава ~15 мин от начала до схемы |
| 8 | Звук и сборка | финальный плейтест | музыка, SFX, эмбиент, оптимизация, Shipping-сборка через RunUAT, инструкция запуска | `.exe` запускается на ноутбуке владельца |

Команды, которые запускает Claude:
```powershell
# сборка редакторного модуля
& "C:\Program Files\Epic Games\UE_5.8\Engine\Build\BatchFiles\Build.bat" SmogEditor Win64 Development -Project="C:\Users\thebo\code\smog-ue\Smog.uproject" -WaitMutex
# Python без интерфейса [62]
& "...\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe" "C:\Users\thebo\code\smog-ue\Smog.uproject" -run=pythonscript -script="C:\Users\thebo\code\smog-ue\tools\import_story.py"
# упаковка [65]
& "...\UE_5.8\Engine\Build\BatchFiles\RunUAT.bat" BuildCookRun -project="C:\Users\thebo\code\smog-ue\Smog.uproject" -platform=Win64 -clientconfig=Shipping -build -cook -stage -pak -archive -archivedirectory="C:\Users\thebo\code\smog-ue\dist"
```

### 8.3 Контроль версий при нестабильной выгрузке
| Вариант | Лимиты | Вывод |
|---|---|---|
| **GitHub + LFS (Free)** | 10 GiB хранения и 10 GiB трафика LFS в месяц; файл до 2 ГБ. Без способа оплаты при превышении хранения новые LFS-файлы не пушатся, при превышении трафика LFS отключается до следующего месяца [66][66b] | проект UE с MetaHuman быстро упрётся в лимит. GitHub оставляем для веб-прототипа и, при желании, для текстовой части |
| **Azure DevOps Repos + LFS** | «fully supports Git LFS and offers it for free»; репозиторий до 250 ГБ (лучше <10 ГБ без учёта LFS); push обычных файлов до 5 ГБ; у больших выгрузок есть «one-hour upload limit» [67][67b]. Квота на объём LFS не указана — не проверено | **основной удалённый репозиторий** |
| **Perforce P4** | бесплатно до 5 пользователей и 20 рабочих пространств [68] | стандарт для UE, но сервер на том же ноутбуке не даёт копии вне дома; для соло пока лишнее |

Как работаем:
1. Вся история хранится в локальном Git + LFS: коммиты не требуют сети.
2. Пушим небольшими порциями. Git LFS повторяет передачу каждого объекта отдельно (`lfs.transfer.maxretries`, экспоненциальная пауза `lfs.transfer.maxretrydelay`) [69], поэтому уже загруженные объекты при обрыве не теряются.
3. Настройки: `git config lfs.concurrenttransfers 2`, `lfs.transfer.maxretries 10`, `lfs.activitytimeout 60` [69]. Возобновляемые загрузки через tus (`lfs.tustransfers`) есть в клиенте [69], но их поддержка на Azure и GitHub — не проверено.
4. Раз в неделю — бэкап на внешний диск (`git bundle` или копия папки). Это страховка от проблем с сетью.
5. В Git не кладём `Binaries/`, `Intermediate/`, `Saved/`, `DerivedDataCache/`. В LFS идут `*.uasset`, `*.umap`, `*.wav`, `*.fbx`, `*.png`.

---

## 9. Риски и открытые вопросы
- **ОЗУ 16 ГБ.** Если редактор падает при компиляции шейдеров или сборке MetaHuman, сначала уменьшаем число процессов компиляции (2.5), потом ставим 2×16 ГБ. Epic рекомендует 32 ГБ [6].
- **Сеть.** Скачивание движка и паков (десятки ГБ) и облачный авто-риг MetaHuman [19] зависят от связи. Докачивает ли Launcher после обрыва — не проверено.
- **Экспериментальное:** Unreal MCP [63], тело с одной камеры [23], MetaHuman Crowd [23]. В срезе на них не опираемся, только как на ускорители.
- **Лицензии перед релизом:** пометка UE-only у каждого пака Fab, условия TTS, треки Pixabay (Content ID). Титры (CREDITS) собираем с первого дня.
- **Размер сборки и выкладка** при плохой выгрузке — отдельный вопрос к неделе 8 (не исследован).

---

## Источники
1. Unreal Engine 5 — Wikipedia (стабильный релиз 5.8, 17.06.2026): https://en.wikipedia.org/wiki/Unreal_Engine_5
2. 5.8.3 Hotfix Released (22.09.2026): https://forums.unrealengine.com/t/5-8-3-hotfix-released/2833315 ; 5.8.1: https://forums.unrealengine.com/t/5-8-1-hotfix-released/2738864 ; 5.8.2: https://forums.unrealengine.com/t/5-8-2-hotfix-released/2746335
3. Wccftech, UE 5.8 / Lumen Lite / UE6: https://wccftech.com/unreal-engine-5-8-lumen-lite-60-fps-switch-2/
4. Unreal Engine 5.8 Release Notes: https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-8-release-notes
5. Setting Up Visual Studio for C++ Projects (UE 5.8): https://dev.epicgames.com/documentation/en-us/unreal-engine/setting-up-visual-studio-development-environment-for-cplusplus-projects-in-unreal-engine
6. Hardware and Software Specifications (UE 5.8): https://dev.epicgames.com/documentation/en-us/unreal-engine/hardware-and-software-specifications-for-unreal-engine
7. Install Unreal Engine: https://dev.epicgames.com/documentation/unreal-engine/install-unreal-engine
8. JetBrains Rider, Unreal Engine — Before you start: https://www.jetbrains.com/help/rider/Unreal_Engine__Before_You_Start.html
9. Visual Studio Community: https://visualstudio.microsoft.com/vs/community/ ; лицензия Build Tools (Microsoft Q&A): https://learn.microsoft.com/en-us/answers/questions/757310/will-it-require-visual-studio-license-for-build-to
10. Using Derived Data Cache: https://dev.epicgames.com/documentation/en-us/unreal-engine/using-derived-data-cache-in-unreal-engine
11. Lumen Performance Guide: https://dev.epicgames.com/documentation/en-us/unreal-engine/lumen-performance-guide-for-unreal-engine
12. Tom Looman, UE 5.8 Performance Highlights: https://tomlooman.com/unreal-engine-5-8-performance-highlights/
13. Scalability Reference: https://dev.epicgames.com/documentation/en-us/unreal-engine/scalability-reference-for-unreal-engine
14. Virtual Shadow Maps: https://dev.epicgames.com/documentation/en-us/unreal-engine/virtual-shadow-maps-in-unreal-engine
15. Texture Streaming Configuration: https://dev.epicgames.com/documentation/unreal-engine/texture-streaming-configuration-in-unreal-engine ; 15b. techarthub: https://techarthub.com/fixing-texture-streaming-pool-over-budget-in-unreal/
16. Rambod, shader compile settings: https://rambod.net/tutorial/speed-up-ue-shader-compiles ; 16b. форум о памяти ShaderCompileWorker: https://forums.unrealengine.com/t/how-to-decrease-memory-usage-for-shader-compile-workers/2334295
17. GPU Lightmass: https://dev.epicgames.com/documentation/en-us/unreal-engine/gpu-lightmass-global-illumination-in-unreal-engine
18. MetaHuman Creator in Unreal Engine: https://dev.epicgames.com/documentation/metahuman/metahuman-creator-in-unreal-engine ; 18b. Workflow Changes: https://dev.epicgames.com/documentation/metahuman/metahuman-workflow-changes
19. Getting Started with MetaHuman Creator in UE (облачные сервисы): https://dev.epicgames.com/documentation/metahuman/getting-started-with-metahuman-creator-in-unreal-engine
20. MetaHuman Assembly: https://dev.epicgames.com/documentation/metahuman/assembly
21. Platform Support and LOD Specifications: https://dev.epicgames.com/documentation/metahuman/platform-support-and-lod-specifications-for-metahumans
22. Controlling MetaHuman LODs: https://dev.epicgames.com/documentation/metahuman/controlling-metahuman-levels-of-detail-lods-in-unreal-engine
23. MetaHuman 5.8 Release Notes: https://dev.epicgames.com/documentation/metahuman/metahuman-5-8-release-notes-in-unreal-engine
24. MetaHuman 5.7 Release Notes: https://dev.epicgames.com/documentation/metahuman/metahuman-5-7-release-notes
25. Audio Driven Animation: https://dev.epicgames.com/documentation/metahuman/audio-driven-animation ; 25b. MetaHuman UE5.5 Preview (языки): https://forums.unrealengine.com/t/metahuman-ue5-5-preview-release/2048486
26. CG Channel, лицензия MetaHuman и 5.6 (04.06.2025): https://www.cgchannel.com/2025/06/you-can-now-sell-metahumans-or-use-them-in-unity-or-godot/
27. Unreal Engine в X о поддержке iPhone 12+: https://x.com/UnrealEngine/status/1669726520166735873 ; требования к устройствам: https://dev.epicgames.com/documentation/metahuman/capture-device-requirements
28. Python Scripting for MetaHuman Creator: https://dev.epicgames.com/documentation/metahuman/python-scripting-for-metahuman-creator
29. City Sample Project (UE 5.8): https://dev.epicgames.com/documentation/unreal-engine/city-sample-project-unreal-engine-demonstration ; 29b. анонс обновления City Sample: https://www.unrealengine.com/learning/city-sample-gets-a-major-update-with-pcg-and-unreal-mcp-workflows
30. CG Channel, City Sample (2022, лицензия UE-only): https://www.cgchannel.com/2022/04/download-epic-games-free-city-sample-assets-for-ue5/ ; 30b. 80.lv о паках: https://80.lv/articles/city-sample-from-the-matrix-demo-released-for-ue5
31. Форум, UE-only content на Fab: https://forums.unrealengine.com/t/fab-ue-only-content-licensing/2082870
32. City Sample Buildings на Fab (данные из выдачи поиска): https://www.fab.com/listings/008fe959-5511-428e-93bd-f99b1179f6d5
33. City Sample Crowds на Fab (из выдачи поиска): https://www.fab.com/listings/903037e9-e1ac-4f41-96e8-1683c6fa7ad4
34. Форум, миграция из City Sample: https://forums.unrealengine.com/t/migrating-assets-from-ue5-city-sample/582530 ; 34b. здания-Blueprint: https://forums.unrealengine.com/t/ue5-city-sample-buildings/1563411
35. Licenses and Pricing in Fab: https://dev.epicgames.com/documentation/en-us/fab/licenses-and-pricing-in-fab
36. Fab Limited-Time Free Content: https://forums.unrealengine.com/t/fab-limited-time-free-content/2738884
37. CG Channel, Megascans после 2024: https://www.cgchannel.com/2024/10/epic-games-has-made-megascans-free-to-all-but-only-until-the-end-of-2024/ ; 37b. Megascans starter content on Fab: https://forums.unrealengine.com/t/megascans-starter-content-on-fab/2255322
38. Mixamo FAQ (Adobe): https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html
39. Auto Retargeting: https://dev.epicgames.com/documentation/en-us/unreal-engine/auto-retargeting-in-unreal-engine ; 39b. IK Retargeter через Python: https://dev.epicgames.com/documentation/unreal-engine/using-python-to-create-and-edit-ik-retargeter-assets-in-unreal-engine
40. Game Animation Sample (5.8): https://dev.epicgames.com/documentation/unreal-engine/game-animation-sample-project-in-unreal-engine ; блог Epic: https://www.unrealengine.com/blog/game-animation-sample
41. Poly Haven License: https://polyhaven.com/license
42. Freesound FAQ: https://freesound.org/help/faq/
43. Лицензия Sonniss #GameAudioGDC: https://sonniss.com/gdc-bundle-license/ ; 43b. GDC 2026 bundle: https://gdc.sonniss.com/ , https://rekkerd.org/sonniss-releases-gdc-2026-game-audio-bundle/
44. Pixabay Content License Summary: https://pixabay.com/service/license-summary/ ; 44b. Pixabay FAQ (Content ID): https://pixabay.com/service/faq/
45. Kenney, аудио-ассеты (CC0): https://kenney.nl/assets/category:Audio
46. OpenGameArt FAQ: https://opengameart.org/content/faq
47. Free Music Archive FAQ: https://freemusicarchive.org/faq/
48. Incompetech Music FAQ: https://incompetech.com/music/royalty-free/faq.html
49. ElevenLabs, публикация сгенерированного контента: https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform ; 49b. поддерживаемые языки: https://elevenlabs.io/docs/help-center/other/what-languages-do-you-support
50. Silero Models: https://github.com/snakers4/silero-models
51. XTTS-v2, лицензия CPML: https://huggingface.co/coqui/XTTS-v2/blob/main/LICENSE.txt
52. Piper voices ru_RU: https://huggingface.co/rhasspy/piper-voices/tree/v1.0.0/ru/ru_RU
53. Yandex SpeechKit, синтез речи: https://aistudio.yandex.ru/docs/ru/speechkit/tts/
54. Detroit: Become Human — Wikipedia: https://en.wikipedia.org/wiki/Detroit:_Become_Human
55. GDC 2018, The Lighting Technology of Detroit: Become Human: https://gdcvault.com/play/1025339/The-Lighting-Technology-of-Detroit
56. GDC 2018, Cluster Forward Rendering and Anti-Aliasing in Detroit: https://gdcvault.com/play/1025420/Cluster-Forward-Rendering-and-Anti
57. AMD GPUOpen, Porting Detroit (часть 1): https://gpuopen.com/learn/porting-detroit-1/
58. Quantic Dream, интервью с Aymeric Montouchet: https://blog.quanticdream.com/quantic-dream-me-interview-with-aymeric-director-of-photography/
59. PlayStation LifeStyle, Кейдж о схеме ветвлений: https://www.playstationlifestyle.net/2019/07/15/detroit-become-human-flowchart/
60. Cinematic Cameras: https://dev.epicgames.com/documentation/en-us/unreal-engine/cinematic-cameras-in-unreal-engine ; Cinematic Depth of Field: https://dev.epicgames.com/documentation/en-us/unreal-engine/cinematic-depth-of-field-in-unreal-engine
61. Camera Cuts в Sequencer: https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-camera-cuts-using-sequencer-in-unreal-engine
62. Scripting the Unreal Editor Using Python: https://dev.epicgames.com/documentation/en-us/unreal-engine/scripting-the-unreal-editor-using-python
63. Unreal MCP in Unreal Editor: https://dev.epicgames.com/documentation/unreal-engine/unreal-mcp-in-unreal-editor
64. Data Driven Gameplay Elements: https://dev.epicgames.com/documentation/en-us/unreal-engine/data-driven-gameplay-elements-in-unreal-engine ; 64b. Fill Data Table from JSON File: https://dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI/EditorScripting/DataTable/FillDataTablefromJSONFile
65. Build Operations (BuildCookRun): https://dev.epicgames.com/documentation/unreal-engine/build-operations-cooking-packaging-deploying-and-running-projects-in-unreal-engine
66. GitHub, Git LFS billing: https://docs.github.com/billing/managing-billing-for-git-large-file-storage/about-billing-for-git-large-file-storage ; 66b. About Git LFS (лимиты размера): https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage
67. Azure Repos, Manage large files: https://learn.microsoft.com/en-us/azure/devops/repos/git/manage-large-files ; 67b. Git limits: https://learn.microsoft.com/en-us/azure/devops/repos/git/limits
68. Perforce P4, бесплатная версия: https://www.perforce.com/products/helix-core/free-version-control
69. git-lfs-config: https://github.com/git-lfs/git-lfs/blob/main/docs/man/git-lfs-config.adoc
70. Лицензия Unreal Engine (из выдачи поиска): https://www.unrealengine.com/license
71. Medium, MetaHuman 5.6/5.7 Pipeline Reference (сторонний источник): https://medium.com/@Jamesroha/metahuman-5-6-5-7-pipeline-reference-170d302b078e
