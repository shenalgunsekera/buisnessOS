' BusinessOS launcher — runs Electron in production mode with no visible console window.
Set fso = CreateObject("Scripting.FileSystemObject")
projectDir = fso.GetParentFolderName(WScript.ScriptFullName)

Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = projectDir

' 0 = hidden window, False = don't wait for the process to exit
sh.Run "cmd /c """ & projectDir & "\launch.cmd""", 0, False
