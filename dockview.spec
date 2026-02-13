import importlib
import os
import glob

# Collect all rich unicode data modules
rich_unicode_dir = os.path.dirname(importlib.import_module('rich._unicode_data').__file__)
unicode_hiddenimports = []
for f in glob.glob(os.path.join(rich_unicode_dir, 'unicode*.py')):
    mod = os.path.basename(f).replace('.py', '')
    unicode_hiddenimports.append(f'rich._unicode_data.{mod}')

a = Analysis(
    ['dockview.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=unicode_hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    collect_data=['rich', 'textual'],
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='dockview',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
)
