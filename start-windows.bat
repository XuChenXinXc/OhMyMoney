@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ========================================================
echo   OhMyMoney - Windows 一键启动脚本
echo ========================================================
echo.

REM 1. 检查 Node.js 是否已安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js！
    echo 请先前往 https://nodejs.org 下载并安装 Node.js 20 LTS 版本，安装完成后重新双击本脚本。
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [1/5] 已检测到 Node.js: %NODE_VER%

REM 2. 自动生成 .env 配置文件
if not exist ".env" (
    echo [2/5] 未找到 .env，正在从 .env.example 自动创建...
    copy /Y ".env.example" ".env" >nul
) else (
    echo [2/5] 已存在 .env 配置文件，跳过创建。
)

REM 3. 安装依赖（自动兼容 React 19 peer deps）
if not exist "node_modules\next" (
    echo [3/5] 正在安装项目依赖（首次运行可能需要 1-3 分钟，请耐心等待）...
    call npm install --legacy-peer-deps
    if %errorlevel% neq 0 (
        echo.
        echo [错误] npm install 执行失败！
        echo 提示：如遇网络超时，可先在命令行执行 npm config set registry https://registry.npmmirror.com 后重试。
        echo.
        pause
        exit /b 1
    )
) else (
    echo [3/5] 依赖已就绪，跳过安装。
)

REM 4. 生成 Prisma Client 并初始化 SQLite 本地数据库
echo [4/5] 正在初始化本地 SQLite 数据库与种子数据...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [错误] prisma generate 失败！
    pause
    exit /b 1
)

call npx prisma db push --skip-generate
if %errorlevel% neq 0 (
    echo [错误] prisma db push 失败！
    pause
    exit /b 1
)

if not exist "prisma\dev.db" (
    call npm run db:seed
) else (
    call npm run db:seed >nul 2>nul
)

REM 5. 启动 Next.js 开发服务器并自动打开浏览器
echo.
echo [5/5] 正在启动 OhMyMoney 开发服务器...
echo 启动成功后将自动打开 http://localhost:3000
echo 关闭本窗口即可停止服务。
echo.

start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"
call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [错误] 开发服务器异常退出，请查看上方报错信息。
    pause
)
