# RSQL

RSQL is a local control surface for real Roblox Studio DataStore operations.

The project is split into:

- `bridge`: Express service that issues Studio connection tokens, tracks connected Studio sessions, queues RSQL commands, and receives Studio execution results.
- `web`: Vite + React editor for writing commands, generating tokens, inspecting sessions, and viewing execution output.
- `roblox-plugin`: Roblox Studio plugin script that connects Studio to the local bridge and executes RSQL with `DataStoreService`.

RSQL is licensed under Apache-2.0. See `LICENSE` for the license text and `COPYRIGHT.md` for copyright and AI-assisted development disclosure.

## Requirements

- Windows
- Git for Windows
- Node.js LTS
- Roblox Studio

## Install

The recommended Windows install runs the PowerShell installer directly from GitHub:

```powershell
$env:RSQL_REPOSITORY_URL="https://github.com/chester119-dev/RSQL-2.0.git"
iwr -UseBasicParsing "https://raw.githubusercontent.com/chester119-dev/RSQL-2.0/main/scripts/install-rsql.ps1" | iex
```

This clones or updates RSQL in:

```text
%LOCALAPPDATA%\RSQL\app
```

It also installs dependencies, copies the Roblox Studio plugin, and creates launchers in:

```text
%LOCALAPPDATA%\RSQL
```

After installing, start RSQL with:

```bat
%LOCALAPPDATA%\RSQL\start-rsql.cmd
```

Then open:

```text
http://localhost:5173
```

If you already downloaded or cloned this repository, install from the project folder with:

```bat
install-rsql.cmd
```

To install and start immediately:

```bat
install-rsql.cmd -StartAfterInstall
```

The installer copies the Studio plugin to:

```text
%LOCALAPPDATA%\Roblox\Plugins
```

Restart Roblox Studio after installing so the plugin appears in the Plugins tab.

To update later, run the same install command again. If RSQL was installed from GitHub, the installer runs `git pull --ff-only` before refreshing dependencies and the Studio plugin.

## Run

Start the bridge:

```bash
cd bridge
npm install
npm run dev
```

Start the web app:

```bash
cd web
npm install
npm run dev
```

Open the Vite URL, connect Roblox Studio with a generated token, and use the default sample:

```rsql
SELECTUSERID 123456789

VAR minimumCoins:Int = 100
VAR bonus:Int = 500
VAR isTester:Bool = true

FUNCTION AddCoins amount
SET PlayerData.Coins += $amount
SET PlayerData.IsTester = $isTester
PRINT
END

SELECT * FROM PlayerData
WHERE Coins >= $minimumCoins
PRINT

CALL AddCoins $bonus
```

## Imports

RSQL supports reusable command blocks with imports.

Examples:

```rsql
IMPORT SharedRsqlLibrary
IMPORT ServerScriptService.Folder.ModuleScriptName
IMPORT URL("https://example.com/library.rsql")
```

An importable ModuleScript or URL should contain RSQL function blocks:

```rsql
FUNCTION AddCoins amount
SET PlayerData.Coins += $amount
PRINT
END
```

Imports only register `FUNCTION` blocks. Top-level imported commands are ignored so remote code cannot write DataStores just by being imported.

## Variables

Use variables with typed values:

```rsql
VAR minimumCoins:Int = 100
VAR bonus:Int = 500
VAR isTester:Bool = true
VAR username:String = "Player"
VAR data:Json = {"Coins":500}
```

Supported variable types:

- `Int`
- `Float`
- `Bool`
- `String`
- `Json`
- `Any`

Use variables with `$name`:

```rsql
WHERE Coins >= $minimumCoins
SET PlayerData.Coins += $bonus
```

## Functions

Use `FUNCTION`, parameters, `END`, and `CALL` to reuse command blocks:

```rsql
FUNCTION AddCoins amount
SET PlayerData.Coins += $amount
PRINT
END

CALL AddCoins 500
```

## Sessions

In the Sessions view, choose a specific connected place with `Select`.

You can also use `All Places` to run the same RSQL against every connected Roblox Studio place.

## Roblox Studio Plugin

Install the Studio plugin by copying:

```text
roblox-plugin/RSQL.plugin.luau
```

to Roblox Studio's local plugins folder.

You can open that folder from Studio with:

```text
Plugins > Plugins Folder
```

Then restart Roblox Studio.

To set the toolbar icon, upload your image to Roblox, copy the image asset id, and edit this line in `roblox-plugin/RSQL.plugin.luau`:

```lua
local PLUGIN_ICON = "rbxassetid://1234567890"
```

The local file `web/imagens/RSQL_Logo.png` is only used by the web app. Roblox Studio toolbar buttons cannot read that local project image directly; they need a Roblox-hosted image asset id.

In Studio, enable:

- HTTP requests for the experience;
- Studio API access for real DataStore operations.

Then:

1. Open the RSQL toolbar button.
2. Generate a token in the web app.
3. Paste the token into the plugin.
4. Connect.

## DataStore Framework

The plugin has an `Install DataStore Framework` button.

It writes `ServerScriptService.RSQLFramework`, a ModuleScript for game server scripts.
The framework wraps DataStore calls with protected calls, retries transient failures, and returns result objects instead of throwing in normal use.

```lua
local RSQL = require(game.ServerScriptService.RSQLFramework)

RSQL.Configure({
	retries = 2,
	retryDelay = 1,
	warnOnError = true,
})

local playerData = RSQL.Player(player.UserId).Store("PlayerData")

local defaults = playerData.GetOrSet({
	Coins = 0,
	IsTester = false,
	Inventory = {},
})

local coins = playerData.Increment("Coins", 500)

if coins.success then
	print("Coins:", coins.value.Coins)
else
	warn(coins.error)
end
```

You can also use a store-focused API:

```lua
local PlayerData = RSQL.Store("PlayerData")

PlayerData.Patch(player.UserId, {
	Level = 10,
	Stats = {
		Wins = 3,
	},
})

local level = RSQL.Unwrap(PlayerData.Get(player.UserId, "Level"), 1)
```

Useful framework methods:

- `RSQL.Get(storeName, key, path)`
- `RSQL.Set(storeName, key, value)` or `RSQL.Set(storeName, key, path, value)`
- `RSQL.Update(storeName, key, updater)`
- `RSQL.Increment(storeName, key, amount)` or `RSQL.Increment(storeName, key, path, amount)`
- `RSQL.Patch(storeName, key, tablePatch)`
- `RSQL.GetOrSet(storeName, key, defaultValue)`
- `RSQL.DeletePath(storeName, key, path)`
- `RSQL.Delete(storeName, key)`
- `RSQL.Store(storeName)`
- `RSQL.Player(userId)`
- `RSQL.Unwrap(result, fallback)`
- `RSQL.Expect(result)`

The Studio plugin and the installed framework wrap direct DataStore calls with `pcall`, so failures are reported instead of crashing the polling loop or game script.

## Troubleshooting

If the plugin says the bridge is outdated or cannot find the bridge:

1. Stop any old Node process using port `34872`.
2. Restart the bridge:

```bash
cd bridge
npm.cmd run dev
```

The plugin requires a `/health` response with:

```text
capabilities.sessionCommands
capabilities.sessionResults
```

## Local API Debug

Run:

```bat
rsql-debug.cmd
```

The log is written under:

```text
%LOCALAPPDATA%\RSQL\rsql-api-debug.log
```

No debug HTTP endpoint is exposed.

The log includes:

- Studio connects;
- queued commands;
- commands delivered to Studio;
- returned results;
- disconnects.

Tokens are redacted.

For verbose logs, set:

```bat
set RSQL_DEBUG_VERBOSE=1
```

before starting the bridge.

## Supported RSQL

```rsql
GET Store[key]
GET Store[key].Field
SELECTUSERID userId
SELECT * FROM Store[key]
SELECT Field, OtherField FROM Store[key]

IMPORT ModuleScriptName
IMPORT ServerScriptService.Folder.ModuleScriptName
IMPORT URL("https://example.com/library.rsql")

VAR name:Int = 500
VAR name:Float = 1.5
VAR name:Bool = true
VAR name:String = "text"
VAR name:Json = {"Coins":500}

$name

GET Store
GET Store.Field
SELECT * FROM Store
SELECT Field, OtherField FROM Store

WHERE Field = value
WHERE Field != value
WHERE Field >= value
WHERE Field <= value
WHERE Field > value
WHERE Field < value

FUNCTION Name param
$param
CALL Name value
END

SET Store[key].Field = value
SET Store[key].Field += number
SET Store[key].Field -= number

SET Store.Field = value
SET Store.Field += number
SET Store.Field -= number

DELETE Store[key]
DELETE Store[key].Field
DELETE Store
DELETE Store.Field

PRINT
```
