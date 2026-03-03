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
    ('utils', 'utils'),
]

# 隐藏导入
hiddenimports = [
    'fastapi',
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'sqlalchemy',
    'sqlalchemy.ext.declarative',
    'pydantic',
    'pydantic.fields',
    'pydantic_core',
    'passlib',
    'passlib.handlers',
    'passlib.handlers.bcrypt',
    'cryptography',
    'openai',
    'httpx',
    'httpx._transports',
    'httpx._transports.default',
    'starlette',
    'starlette.middleware',
    'starlette.middleware.cors',
    'json',
    'email.mime.image',
    'email.mime.audio',
    'email.mime.video',
    'pkg_resources.py2_warn',
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
    console=False,  # 生产环境不显示控制台
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
