#!/usr/bin/env python3
"""СМОГ: сборка.
index.html            — для GitHub Pages (скрипты и ассеты отдельными файлами)
dist/smog-offline.html — один файл, всё внутри (можно открыть без интернета)
"""
import base64, json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
LIBS = ['three.min.js', 'CopyShader.js', 'LuminosityHighPassShader.js', 'EffectComposer.js', 'RenderPass.js', 'ShaderPass.js',
        'UnrealBloomPass.js', 'BokehShader.js', 'BokehPass.js', 'GLTFLoader.js', 'RGBELoader.js', 'Water.js', 'Reflector.js',
        'Lensflare.js', 'SkeletonUtils.js', 'SSAOShader.js', 'FXAAShader.js', 'BufferGeometryUtils.js']
SRC = ['art.js', 'looks.js', 'orchard.js', 'city.js', 'play.js', 'story.js', 'engine.js']
SRC = [f for f in SRC if os.path.exists('src/' + f)]
rd = lambda f: open(f, encoding='utf-8').read()
head = rd('src/head.html')
cut = head.index('<canvas id="gl">')
head_part, body_part = head[:cut], head[cut:]
META = ('<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="description" content="СМОГ · Алматы, 2049. Интерактивная драма: смог, пробки, андроиды и выбор.">\n'
        '<meta name="theme-color" content="#04070b">\n')
import hashlib
ver = hashlib.sha1(''.join(rd('src/' + f) for f in SRC).encode()).hexdigest()[:10]  # меняется при любой правке src → браузер не берёт старый файл из кэша
scripts = ''.join(f'<script src="lib/{f}"></script>\n' for f in LIBS) + ''.join(f'<script src="src/{f}?v={ver}"></script>\n' for f in SRC)
index = '<!doctype html>\n<html lang="ru">\n<head>\n' + META + head_part + '</head>\n<body>\n' + body_part + scripts + '</body>\n</html>\n'
open('index.html', 'w', encoding='utf-8').write(index)
print('index.html', len(index))
if '--offline' in sys.argv:
    MIME = {'.glb': 'model/gltf-binary', '.hdr': 'application/octet-stream', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json'}
    assets = json.load(open('tools/assets.json', encoding='utf-8'))
    emb = {}
    for k, p in assets.items():
        if os.path.exists(p):
            emb[k] = 'data:' + MIME[os.path.splitext(p)[1]] + ';base64,' + base64.b64encode(open(p, 'rb').read()).decode()
    js = ''.join('<script>\n' + rd('lib/' + f) + '\n</script>\n' for f in LIBS)
    js += '<script>window.TUMAR_ASSETS=' + json.dumps(emb) + ';</script>\n'
    js += ''.join('<script>\n' + rd('src/' + f) + '\n</script>\n' for f in SRC)
    off = '<!doctype html>\n<html lang="ru">\n<head>\n' + META + head_part + '</head>\n<body>\n' + body_part + js + '</body>\n</html>\n'
    os.makedirs('dist', exist_ok=True)
    open('dist/smog-offline.html', 'w', encoding='utf-8').write(off)
    print('dist/smog-offline.html', len(off))
