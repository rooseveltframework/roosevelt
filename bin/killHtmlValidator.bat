set portArg=%1

FOR /F "tokens=5 delims= " %%P IN ('netstat -a -n -o ^| findstr 0.0.0.0:%portArg%.*LISTENING') DO TaskKill.exe /F /PID %%P

@pause