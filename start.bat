@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo   RESERVA TCC - Inicio rapido (sem Docker)
echo ========================================
echo.

:: Verifica se o Python esta instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Python nao encontrado nesta maquina.
    echo Instale o Python em: https://www.python.org/downloads/
    echo (Na instalacao, marque a opcao "Add Python to PATH")
    echo.
    pause
    exit /b 1
)

:: Se nao existir .env, cria automaticamente perguntando apenas 2 coisas
if not exist .env (
    echo .env nao encontrado. Vamos configurar agora (sempre so na primeira vez).
    echo.
    set /p SUPABASE_URL="Cole a URL do Supabase (ex: https://seu-projeto.supabase.co): "
    set /p SUPABASE_KEY="Cole a chave SECRETA do Supabase (sb_secret_...): "
    
    echo Gerando SECRET_KEY automaticamente...
    python -c "import secrets; print(secrets.token_urlsafe(48))" > "%TEMP%\secret_key.txt"
    set /p SECRET_KEY=<%TEMP%\secret_key.txt
    del "%TEMP%\secret_key.txt"

    echo SUPABASE_URL=%SUPABASE_URL% > .env
    echo SUPABASE_KEY=%SUPABASE_KEY% >> .env
    echo SECRET_KEY=%SECRET_KEY% >> .env
    echo CORS_ORIGINS= >> .env
    echo COOKIE_HTTPS=0 >> .env
    echo.
    echo .env criado com sucesso!
    echo.

) else (
    echo Usando .env existente...
)

:: Instala dependencias Python
echo Instalando dependencias (isso pode demorar na primeira vez)...
pip install -r requirements.txt

:: Inicia a aplicacao
echo.
echo ========================================
echo   Sistema iniciado!
echo   Acesse no navegador: http://localhost:8000
echo   Para parar, feche esta janela ou pressione Ctrl+C
echo ========================================
echo.

python -m uvicorn app:app --host 0.0.0.0 --port 8000

pause
