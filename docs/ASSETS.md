# Ассеты: что уже есть и чем можно заменить

## Сейчас в игре
| Что | Откуда | Лицензия |
|---|---|---|
| Карта центра Алматы (`assets/geo/source-city-local.json` → `almaty.json`) | OpenStreetMap через проект farhat2222s/almaty60 | ODbL 1.0, нужна атрибуция |
| Андроиды — X Bot, охрана — Vanguard (`assets/models/xbot.glb`, `soldier.glb`) | Mixamo, из примеров three.js; облик андроидов (панели, швы, линзы, механика суставов) рисуется шейдером `REGION` в `src/art.js` | условия Mixamo / примеры three.js |
| Люди — аватар Ready Player Me (`rpm.glb`) | примеры three.js | как в примерах three.js |
| Машины (`assets/models/cars/*.glb`) | Kenney Car Kit | CC0 |
| HDRI-окружения (`assets/env/*.hdr`, уменьшены до 512×256) | Poly Haven | CC0 |
| Текстуры (`assets/tex/*`) | примеры three.js | MIT / как в репозитории three.js |

Все пути идут через ключи `URLS` в `src/art.js`, а `tools/assets.json` перечисляет, что встраивать в офлайн-файл. Новый ассет → ключ в `URLS` (или `ART.onLoad`) + строка в `tools/assets.json` + строка в CREDITS.md.

## Кандидаты, которые прислал владелец (28.09.2026)
Проверено по страницам Fab 28.09.2026; перед покупкой или скачиванием перепроверять лицензию на странице.

| Ассет | Что это | Формат | Лицензия / вывод |
|---|---|---|---|
| [City Sample](https://www.fab.com/listings/4898e707-7855-404b-af0e-a505ee690e68) ([документация](https://dev.epicgames.com/documentation/unreal-engine/city-sample-project-unreal-engine-demonstration)) | целый город из демо The Matrix Awakens: здания, машины, MetaHuman-толпа | проект Unreal Engine 5 | бесплатно, **только для продуктов на Unreal Engine** → в браузерную версию нельзя; вариант только при переходе на UE5 |
| [City Sample Buildings](https://www.fab.com/listings/008fe959-5511-428e-93bd-f99b1179f6d5) | 2000+ модульных частей зданий | Unreal | бесплатно, «Licensed for Use Only with Unreal Engine-based Products» → только UE5 |
| [Downtown – City Pack](https://www.fab.com/listings/bf3d8286-25e2-4cb5-a085-79312ea0c144) (PolySphere Studio) | реалистичный даунтаун, модульные здания, дороги, процедурные инструменты | Unreal, 3ds Max, **FBX** | платно; ~11,3 млн полигонов — для веба только выборочно: несколько зданий, децимация, запекание текстур; проверить, не помечена ли лицензия «UE-only» |
| [City Asset Pack](https://www.fab.com/listings/ba9843fd-bdf9-4473-8d9e-baac3b802584) (Joel Westman) | модули, пропсы, декали, материалы | только Unreal | для веба неудобно (нужен экспорт из UE) |
| [Futuristic City Assets](https://www.unrealengine.com/marketplace/en-US/product/futuristic-city-assets) | футуристичный город | Unreal | старая ссылка Marketplace, теперь на Fab; проверить лицензию и формат |
| [KitBash3D Mini Kit: Neo City](https://kitbash3d.com/products/mini-kit-neo-city) | небольшой киберпанк-кит | FBX/OBJ/Blender и др. | бесплатный; проверить условия использования в играх; тяжёлый — нужна оптимизация |
| [KitBash3D Modern Cities](https://kitbash3d.com/collections/modern-cities), [Neo Tokyo](https://kitbash3d.com/products/tokyo), [Neo Shanghai](https://kitbash3d.com/products/neo-shanghai) | кинематографичные наборы | FBX/OBJ/… | платно; по духу ближе к Detroit; очень тяжёлые |
| [Humanoid Robot AI (Sketchfab)](https://sketchfab.com/3d-models/humanoid-robot-ai-e5de866d076646be8f20c610fefbbbcf) | модель робота-андроида, автор 3dUVpro, сделана генератором Meshy | glTF с Sketchfab | по API Sketchfab (28.09.2026): **CC BY** (нужна атрибуция), скачивается, ~176 тыс. треугольников, **анимаций нет** (скелета, судя по всему, тоже). В игру не взята: облик повторён шейдером на X Bot (панели, швы, чёрные суставы, линзы), анимации Mixamo сохранились. Если брать саму модель — риг в Mixamo, упрощение до ~30 тыс., строка в CREDITS.md |

## Как добавлять тяжёлые модели в браузерную версию
1. Скачать под своим аккаунтом (Fab/Sketchfab/KitBash3D) и положить исходник вне репозитория.
2. Blender: импорт FBX → оставить нужное → Decimate (здания ≤ 20–50 тыс. треугольников, персонажи ≤ 30 тыс.) → запечь текстуры в 1–2K → экспорт glTF (.glb).
3. Сжать: `npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress webp` (для meshopt подключить `MeshoptDecoder` из примеров three.js r128 и вызвать `GLTFLoader.setMeshoptDecoder`).
4. Персонажей с Mixamo-скелетом анимировать как сейчас: клипы X Bot ретаргетятся функцией `retarget()` в `src/art.js`.
5. Одинаковые объекты (окна, фонари, машины) — `InstancedMesh`; следить за draw calls и режимом качества `low`.

## Настольное приложение и тяжёлые ассеты
С v3.1 игра — ещё и приложение Electron: файлы читаются с диска, поэтому ограничение «лёгкий вес для загрузки по сети» для приложения мягче (можно модели и текстуры тяжелее, 2–4K). Но лицензии не меняются: City Sample и City Sample Buildings разрешены только в продуктах на Unreal Engine, в Electron-версию их брать нельзя так же, как в браузерную.

## Если думать о переходе на Unreal Engine 5
- **Железо владельца (28.09.2026):** RTX 4060 Laptop (8 ГБ), i7-13620H, 16 ГБ ОЗУ, ~177 ГБ свободно. Epic для City Sample рекомендует 12 ядер, **64 ГБ ОЗУ**, RTX 2080+ с 8 ГБ, SSD → на этом ноутбуке редактор с City Sample работать не будет.
- **Плюсы:** можно использовать City Sample (целый город, MetaHuman, трафик), Lumen/Nanite, качество уровня Detroit.
- **Минусы:** игра перестаёт быть ссылкой в браузере (нужна сборка под Windows, гигабайты); всю логику сюжета (`story.js`, `engine.js`) и систему прогулок придётся переписать (Blueprints/C++); карта OSM переносится только через импорт.
- **Разумный путь:** браузерную версию развивать на glTF-ассетах, а UE5-прототип одной главы (например, гл. 4 в центре города) сделать отдельно и сравнить.
