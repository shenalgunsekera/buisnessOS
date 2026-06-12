' BusinessOS startup launcher — runs hidden in the system tray, no window shown.
Set fso = CreateObject("Scripting.FileSystemObject")
projectDir = fso.GetParentFolderName(WScript.ScriptFullName)

Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = projectDir
sh.Run "cmd /c """ & projectDir & "\launch-startup.cmd""", 0, False
