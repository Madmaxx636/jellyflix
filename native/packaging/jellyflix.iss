; The Windows installer. Built in CI with: iscc /DAppVersion=1.0.5 /DSourceDir=<the folder with jellyflix.exe and its libraries> jellyflix.iss
#ifndef AppVersion
#define AppVersion "0.0.0"
#endif
#ifndef SourceDir
#define SourceDir "dist"
#endif

[Setup]
AppId={{8F0B2A58-6C7D-4E0A-9F0E-4A1E5B3D7C21}
AppName=Jellyflix
AppVersion={#AppVersion}
AppPublisher=Jellyflix
AppPublisherURL=https://github.com/Madmaxx636/jellyflix
DefaultDirName={autopf}\Jellyflix
DefaultGroupName=Jellyflix
DisableProgramGroupPage=yes
OutputBaseFilename=Jellyflix-setup
SetupIconFile={#SourcePath}\jellyflix.ico
UninstallDisplayIcon={app}\jellyflix.exe
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
; no administrator prompt unless the person asks for an install for everyone
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

[Tasks]
Name: "desktopicon"; Description: "Put a Jellyflix icon on the desktop"

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{group}\Jellyflix"; Filename: "{app}\jellyflix.exe"
Name: "{autodesktop}\Jellyflix"; Filename: "{app}\jellyflix.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\jellyflix.exe"; Description: "Start Jellyflix"; Flags: nowait postinstall skipifsilent
