# Troubleshooting Guide

## Current Issue: better-sqlite3 Compilation on Windows

### Problem
The `better-sqlite3` native module fails to compile on Windows due to C++ standard version conflict:
- Electron requires C++20
- Visual Studio Build Tools is forcing C++17

### Error Message
```
error C1189: #error:  "C++20 or later required."
warning D9025: overriding '/std:c++20' with '/std:c++17'
```

### Solutions to Try

#### Option 1: Update better-sqlite3 to Latest Version
```bash
npm install better-sqlite3@latest
npx electron-rebuild
```

#### Option 2: Update Visual Studio Build Tools
1. Open Visual Studio Installer
2. Modify VS 2022 Build Tools
3. Ensure these components are installed:
   - MSVC v143 - VS 2022 C++ x64/x86 build tools (Latest)
   - C++ CMake tools for Windows
   - Windows 11 SDK (or Windows 10 SDK)
4. Apply updates
5. Run `npx electron-rebuild`

#### Option 3: Use WSL Ubuntu (Recommended for Development)
Develop on WSL Ubuntu to avoid Windows compilation issues:

```bash
# In WSL Ubuntu terminal
cd /home/sqladmin/memorable
npm install
npm run electron:dev
```

**Note**: For GUI in WSL, you may need:
- WSLg (built into Windows 11)
- Or X11 server like VcXsrv for Windows 10

#### Option 4: Use Prebuilt Binaries
Try forcing use of prebuilt binaries:

```bash
npm install --prefer-offline
npm rebuild better-sqlite3 --build-from-source=false
```

### System Requirements Verified
- ✅ Node.js v20.x LTS (downgraded from v24)
- ✅ Python 3.14 with setuptools
- ✅ Visual Studio 2022 Build Tools
- ❌ C++20 configuration issue in VS Build Tools

### Next Steps
1. Try Option 1 first (update better-sqlite3)
2. If that fails, try Option 3 (WSL Ubuntu)
3. If you need Windows, try Option 2 (update VS Build Tools)

### Alternative Approach
If compilation continues to fail, we could:
1. Switch to `sql.js` (WebAssembly, no compilation)
2. Use a remote database instead of SQLite
3. Wait for better prebuilt binaries

**Performance Note**: For 10k+ photos, better-sqlite3 is preferred for performance.
