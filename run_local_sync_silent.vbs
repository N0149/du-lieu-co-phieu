Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Chay run_local_sync.bat o che do an hoan toan (window style = 0), khong chan luong (wait = false)
batPath = """" & currentDir & "\run_local_sync.bat"""
WshShell.Run "cmd.exe /c " & batPath, 0, False
