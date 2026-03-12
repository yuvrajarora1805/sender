@echo off
echo ==========================================
echo   Building WhatsApp Sender EXE
echo ==========================================
echo.

:: Install PyInstaller if not already installed
pip install pyinstaller

echo.
echo Building single EXE (this may take a few minutes)...
echo.

pyinstaller message_sender.spec --clean

echo.
echo ==========================================
if exist "dist\WhatsApp_Sender.exe" (
    echo   BUILD SUCCESS!
    echo   EXE is at: dist\WhatsApp_Sender.exe
) else (
    echo   BUILD FAILED. Check the output above.
)
echo ==========================================
pause
