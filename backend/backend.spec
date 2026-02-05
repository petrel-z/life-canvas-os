"""
PyInstaller 配置文件
用于打包 Python 后端为可执行文件
"""
import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

# 收集数据文件
datas = [
    ('api', 'api'),
    ('core', 'core'),
    ('models', 'models'),
    ('schemas', 'schemas'),
    ('services', 'services'),
    ('db', 'db'),
]

# 隐藏导入
hiddenimports = [
    'fastapi',
    'uvicorn',
    'sqlalchemy',
    'pydantic',
    'passlib',
    'cryptography',
    'openai',
    'httpx',
]

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # 开发测试时显示控制台，方便调试
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
