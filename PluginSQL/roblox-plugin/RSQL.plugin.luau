local HttpService = game:GetService("HttpService")
local DataStoreService = game:GetService("DataStoreService")
local MarketplaceService = game:GetService("MarketplaceService")
local ServerScriptService = game:GetService("ServerScriptService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerStorage = game:GetService("ServerStorage")

local BRIDGE_URLS = {
	"http://127.0.0.1:34872",
	"http://localhost:34872",
}

local SETTINGS_KEY = "RSQL_SESSION_ID"
local FRAMEWORK_MODULE_NAME = "RSQLFramework"
local PLUGIN_BUTTON_TEXT = "RSQL 2.0"
local PLUGIN_ICON = "rbxassetid://94712550137283"

local toolbar = plugin:CreateToolbar("RSQL")
local toggleButton = toolbar:CreateButton(
	"RSQLPluginButton",
	"Connect this Studio place to the local RSQL bridge",
	PLUGIN_ICON,
	PLUGIN_BUTTON_TEXT
)

local widgetInfo = DockWidgetPluginGuiInfo.new(
	Enum.InitialDockState.Right,
	false,
	false,
	360,
	320,
	280,
	240
)

local widget = plugin:CreateDockWidgetPluginGui("RSQLBridge", widgetInfo)
widget.Title = "RSQL Bridge"

local root = Instance.new("Frame")
root.Size = UDim2.fromScale(1, 1)
root.BackgroundColor3 = Color3.fromRGB(31, 31, 31)
root.BorderSizePixel = 0
root.Parent = widget

local padding = Instance.new("UIPadding")
padding.PaddingTop = UDim.new(0, 16)
padding.PaddingRight = UDim.new(0, 16)
padding.PaddingBottom = UDim.new(0, 16)
padding.PaddingLeft = UDim.new(0, 16)
padding.Parent = root

local layout = Instance.new("UIListLayout")
layout.Padding = UDim.new(0, 12)
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Parent = root

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 30)
title.BackgroundTransparency = 1
title.Font = Enum.Font.GothamBold
title.Text = "RSQL Studio Link"
title.TextColor3 = Color3.fromRGB(255, 255, 255)
title.TextSize = 18
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = root

local status = Instance.new("TextLabel")
status.Size = UDim2.new(1, 0, 0, 42)
status.BackgroundColor3 = Color3.fromRGB(38, 38, 38)
status.BorderSizePixel = 0
status.Font = Enum.Font.Gotham
status.Text = "Disconnected"
status.TextColor3 = Color3.fromRGB(220, 220, 220)
status.TextSize = 14
status.TextWrapped = true
status.Parent = root

local statusCorner = Instance.new("UICorner")
statusCorner.CornerRadius = UDim.new(0, 8)
statusCorner.Parent = status

local tokenBox = Instance.new("TextBox")
tokenBox.Size = UDim2.new(1, 0, 0, 40)
tokenBox.BackgroundColor3 = Color3.fromRGB(24, 24, 24)
tokenBox.BorderSizePixel = 0
tokenBox.ClearTextOnFocus = false
tokenBox.Font = Enum.Font.Code
tokenBox.PlaceholderText = "Paste token from RSQL web app"
tokenBox.Text = ""
tokenBox.TextColor3 = Color3.fromRGB(235, 235, 235)
tokenBox.PlaceholderColor3 = Color3.fromRGB(130, 130, 130)
tokenBox.TextSize = 13
tokenBox.Parent = root

local tokenCorner = Instance.new("UICorner")
tokenCorner.CornerRadius = UDim.new(0, 8)
tokenCorner.Parent = tokenBox

local connectButton = Instance.new("TextButton")
connectButton.Size = UDim2.new(1, 0, 0, 40)
connectButton.BackgroundColor3 = Color3.fromRGB(14, 120, 189)
connectButton.BorderSizePixel = 0
connectButton.Font = Enum.Font.GothamBold
connectButton.Text = "Connect"
connectButton.TextColor3 = Color3.fromRGB(255, 255, 255)
connectButton.TextSize = 14
connectButton.Parent = root

local buttonCorner = Instance.new("UICorner")
buttonCorner.CornerRadius = UDim.new(0, 8)
buttonCorner.Parent = connectButton

local disconnectButton = Instance.new("TextButton")
disconnectButton.Size = UDim2.new(1, 0, 0, 40)
disconnectButton.BackgroundColor3 = Color3.fromRGB(111, 47, 53)
disconnectButton.BorderSizePixel = 0
disconnectButton.Font = Enum.Font.GothamBold
disconnectButton.Text = "Disconnect"
disconnectButton.TextColor3 = Color3.fromRGB(255, 255, 255)
disconnectButton.TextSize = 14
disconnectButton.Visible = false
disconnectButton.Parent = root

local disconnectCorner = Instance.new("UICorner")
disconnectCorner.CornerRadius = UDim.new(0, 8)
disconnectCorner.Parent = disconnectButton

local frameworkButton = Instance.new("TextButton")
frameworkButton.Size = UDim2.new(1, 0, 0, 40)
frameworkButton.BackgroundColor3 = Color3.fromRGB(48, 48, 48)
frameworkButton.BorderSizePixel = 0
frameworkButton.Font = Enum.Font.GothamBold
frameworkButton.Text = "Install DataStore Framework"
frameworkButton.TextColor3 = Color3.fromRGB(255, 255, 255)
frameworkButton.TextSize = 14
frameworkButton.Parent = root

local frameworkCorner = Instance.new("UICorner")
frameworkCorner.CornerRadius = UDim.new(0, 8)
frameworkCorner.Parent = frameworkButton

local logBox = Instance.new("TextLabel")
logBox.Size = UDim2.new(1, 0, 1, -282)
logBox.BackgroundColor3 = Color3.fromRGB(24, 24, 24)
logBox.BorderSizePixel = 0
logBox.Font = Enum.Font.Code
logBox.Text = "Waiting for bridge..."
logBox.TextColor3 = Color3.fromRGB(190, 190, 190)
logBox.TextSize = 12
logBox.TextWrapped = true
logBox.TextXAlignment = Enum.TextXAlignment.Left
logBox.TextYAlignment = Enum.TextYAlignment.Top
logBox.Parent = root

local logCorner = Instance.new("UICorner")
logCorner.CornerRadius = UDim.new(0, 8)
logCorner.Parent = logBox

local logPadding = Instance.new("UIPadding")
logPadding.PaddingTop = UDim.new(0, 10)
logPadding.PaddingRight = UDim.new(0, 10)
logPadding.PaddingBottom = UDim.new(0, 10)
logPadding.PaddingLeft = UDim.new(0, 10)
logPadding.Parent = logBox

local sessionId = plugin:GetSetting(SETTINGS_KEY)
local activeBridgeUrl = nil
local lastBridgeError = nil
local isConnecting = false
local isPolling = false

if sessionId == "" then
	sessionId = nil
end

local function setStatus(text, color)
	status.Text = text
	status.TextColor3 = color or Color3.fromRGB(220, 220, 220)
end

local function appendLog(text)
	logBox.Text = string.format("%s\n%s", os.date("%H:%M:%S"), tostring(text))
end

local function clearSession()
	sessionId = nil
	plugin:SetSetting(SETTINGS_KEY, "")
	disconnectButton.Visible = false
end

local function getPlaceDisplayName()
	if game.PlaceId and game.PlaceId ~= 0 then
		local ok, productInfo = pcall(function()
			return MarketplaceService:GetProductInfo(game.PlaceId)
		end)

		if ok and productInfo and productInfo.Name and productInfo.Name ~= "" then
			return "Place: " .. productInfo.Name
		end
	end

	return "Place: " .. game.Name
end

local function getFrameworkSource()
	return [=[
local DataStoreService = game:GetService("DataStoreService")

local RSQLFramework = {}
RSQLFramework.VERSION = "1.1.0"

local config = {
	retries = 2,
	retryDelay = 1,
	warnOnError = false,
}

local function clone(value, seen)
	if type(value) ~= "table" then
		return value
	end

	seen = seen or {}

	if seen[value] then
		return seen[value]
	end

	local copy = {}
	seen[value] = copy

	for key, child in pairs(value) do
		copy[clone(key, seen)] = clone(child, seen)
	end

	return copy
end

local function mergeConfig(nextConfig)
	if type(nextConfig) ~= "table" then
		return
	end

	if nextConfig.retries ~= nil then
		config.retries = math.max(0, tonumber(nextConfig.retries) or config.retries)
	end

	if nextConfig.retryDelay ~= nil then
		config.retryDelay = math.max(0, tonumber(nextConfig.retryDelay) or config.retryDelay)
	end

	if nextConfig.warnOnError ~= nil then
		config.warnOnError = nextConfig.warnOnError == true
	end
end

local function makeResult(ok, value, context)
	context = context or {}

	if ok then
		return {
			success = true,
			value = value,
			operation = context.operation,
			storeName = context.storeName,
			key = context.key,
			attempts = context.attempts or 1,
		}
	end

	local errorText = tostring(value)

	if config.warnOnError then
		warn("[RSQLFramework] " .. errorText)
	end

	return {
		success = false,
		error = errorText,
		operation = context.operation,
		storeName = context.storeName,
		key = context.key,
		attempts = context.attempts or 1,
	}
end

local function runProtected(context, callback)
	local attempts = 0
	local maxAttempts = math.max(1, (tonumber(config.retries) or 0) + 1)
	local lastError = nil

	while attempts < maxAttempts do
		attempts += 1

		local ok, value = pcall(callback)

		if ok then
			context.attempts = attempts
			return makeResult(true, value, context)
		end

		lastError = value

		if attempts < maxAttempts and config.retryDelay > 0 then
			task.wait(config.retryDelay * attempts)
		end
	end

	context.attempts = attempts
	return makeResult(false, lastError, context)
end

local function requireText(name, value)
	local text = tostring(value or "")

	if text == "" then
		error(name .. " is required")
	end

	return text
end

local function normalizeKey(key)
	return requireText("key", key)
end

local function getStore(storeName)
	return DataStoreService:GetDataStore(requireText("storeName", storeName))
end

local function splitPath(path)
	local parts = {}

	if not path or path == "" then
		return parts
	end

	for part in tostring(path):gmatch("[^%.]+") do
		table.insert(parts, part)
	end

	return parts
end

local function readChild(target, part)
	if type(target) ~= "table" then
		return nil
	end

	local value = target[part]

	if value == nil then
		local numericPart = tonumber(part)

		if numericPart then
			value = target[numericPart]
		end
	end

	return value
end

local function readPath(target, path)
	local parts = splitPath(path)

	if #parts == 0 then
		return target
	end

	local cursor = target

	for _, part in ipairs(parts) do
		cursor = readChild(cursor, part)
	end

	return cursor
end

local function setPath(target, path, value)
	local parts = splitPath(path)

	if #parts == 0 then
		return value
	end

	target = type(target) == "table" and target or {}

	local cursor = target

	for index = 1, #parts - 1 do
		local part = parts[index]

		if type(cursor[part]) ~= "table" then
			cursor[part] = {}
		end

		cursor = cursor[part]
	end

	cursor[parts[#parts]] = value

	return target
end

local function removePath(target, path)
	local parts = splitPath(path)

	if #parts == 0 then
		return nil
	end

	if type(target) ~= "table" then
		return target
	end

	local cursor = target

	for index = 1, #parts - 1 do
		cursor = readChild(cursor, parts[index])

		if type(cursor) ~= "table" then
			return target
		end
	end

	cursor[parts[#parts]] = nil
	return target
end

local function mergeTable(target, patch)
	target = type(target) == "table" and target or {}

	if type(patch) ~= "table" then
		return target
	end

	for key, value in pairs(patch) do
		if type(value) == "table" and type(target[key]) == "table" then
			mergeTable(target[key], value)
		else
			target[key] = clone(value)
		end
	end

	return target
end

local function resolveDefault(defaultValue)
	if type(defaultValue) == "function" then
		return defaultValue()
	end

	return clone(defaultValue)
end

function RSQLFramework.Configure(nextConfig)
	mergeConfig(nextConfig)
	return clone(config)
end

function RSQLFramework.GetConfig()
	return clone(config)
end

function RSQLFramework.Get(storeName, key, path)
	return runProtected({
		operation = "Get",
		storeName = tostring(storeName),
		key = tostring(key),
	}, function()
		local value = getStore(storeName):GetAsync(normalizeKey(key))
		return readPath(value, path)
	end)
end

function RSQLFramework.Set(storeName, key, pathOrValue, value)
	local path = pathOrValue
	local nextValue = value

	if value == nil then
		path = nil
		nextValue = pathOrValue
	end

	return RSQLFramework.Update(storeName, key, function(current)
		return setPath(current, path, nextValue)
	end)
end

function RSQLFramework.Update(storeName, key, updater)
	return runProtected({
		operation = "Update",
		storeName = tostring(storeName),
		key = tostring(key),
	}, function()
		if type(updater) ~= "function" then
			error("updater must be a function")
		end

		return getStore(storeName):UpdateAsync(normalizeKey(key), function(current)
			return updater(current)
		end)
	end)
end

function RSQLFramework.Increment(storeName, key, pathOrAmount, amount)
	local path = pathOrAmount
	local nextAmount = amount

	if amount == nil then
		path = nil
		nextAmount = pathOrAmount
	end

	return RSQLFramework.Update(storeName, key, function(current)
		local previous = readPath(current, path)
		return setPath(current, path, (tonumber(previous) or 0) + (tonumber(nextAmount) or 0))
	end)
end

function RSQLFramework.Patch(storeName, key, patch)
	return RSQLFramework.Update(storeName, key, function(current)
		return mergeTable(current, patch)
	end)
end

function RSQLFramework.GetOrSet(storeName, key, defaultValue)
	return RSQLFramework.Update(storeName, key, function(current)
		if current == nil then
			return resolveDefault(defaultValue)
		end

		return current
	end)
end

function RSQLFramework.DeletePath(storeName, key, path)
	return RSQLFramework.Update(storeName, key, function(current)
		return removePath(current, path)
	end)
end

function RSQLFramework.Delete(storeName, key)
	return runProtected({
		operation = "Delete",
		storeName = tostring(storeName),
		key = tostring(key),
	}, function()
		getStore(storeName):RemoveAsync(normalizeKey(key))
		return true
	end)
end

function RSQLFramework.Unwrap(response, fallback)
	if response and response.success then
		return response.value
	end

	return fallback
end

function RSQLFramework.Expect(response)
	if response and response.success then
		return response.value
	end

	error(response and response.error or "RSQL operation failed")
end

function RSQLFramework.Store(storeName)
	local storeApi = {}

	function storeApi.Get(key, path)
		return RSQLFramework.Get(storeName, key, path)
	end

	function storeApi.Set(key, pathOrValue, value)
		return RSQLFramework.Set(storeName, key, pathOrValue, value)
	end

	function storeApi.Update(key, updater)
		return RSQLFramework.Update(storeName, key, updater)
	end

	function storeApi.Increment(key, pathOrAmount, amount)
		return RSQLFramework.Increment(storeName, key, pathOrAmount, amount)
	end

	function storeApi.Patch(key, patch)
		return RSQLFramework.Patch(storeName, key, patch)
	end

	function storeApi.GetOrSet(key, defaultValue)
		return RSQLFramework.GetOrSet(storeName, key, defaultValue)
	end

	function storeApi.DeletePath(key, path)
		return RSQLFramework.DeletePath(storeName, key, path)
	end

	function storeApi.Delete(key)
		return RSQLFramework.Delete(storeName, key)
	end

	return storeApi
end

function RSQLFramework.Player(userId)
	local key = normalizeKey(userId)
	local playerApi = {}

	playerApi.UserId = key

	function playerApi.Store(storeName)
		local scopedStore = RSQLFramework.Store(storeName)
		local playerStore = {}

		function playerStore.Get(path)
			return scopedStore.Get(key, path)
		end

		function playerStore.Set(pathOrValue, value)
			return scopedStore.Set(key, pathOrValue, value)
		end

		function playerStore.Update(updater)
			return scopedStore.Update(key, updater)
		end

		function playerStore.Increment(pathOrAmount, amount)
			return scopedStore.Increment(key, pathOrAmount, amount)
		end

		function playerStore.Patch(patch)
			return scopedStore.Patch(key, patch)
		end

		function playerStore.GetOrSet(defaultValue)
			return scopedStore.GetOrSet(key, defaultValue)
		end

		function playerStore.DeletePath(path)
			return scopedStore.DeletePath(key, path)
		end

		function playerStore.Delete()
			return scopedStore.Delete(key)
		end

		return playerStore
	end

	function playerApi.Get(storeName, path)
		return RSQLFramework.Get(storeName, key, path)
	end

	function playerApi.Set(storeName, pathOrValue, value)
		return RSQLFramework.Set(storeName, key, pathOrValue, value)
	end

	function playerApi.Update(storeName, updater)
		return RSQLFramework.Update(storeName, key, updater)
	end

	function playerApi.Increment(storeName, pathOrAmount, amount)
		return RSQLFramework.Increment(storeName, key, pathOrAmount, amount)
	end

	function playerApi.Patch(storeName, patch)
		return RSQLFramework.Patch(storeName, key, patch)
	end

	function playerApi.GetOrSet(storeName, defaultValue)
		return RSQLFramework.GetOrSet(storeName, key, defaultValue)
	end

	function playerApi.DeletePath(storeName, path)
		return RSQLFramework.DeletePath(storeName, key, path)
	end

	function playerApi.Delete(storeName)
		return RSQLFramework.Delete(storeName, key)
	end

	return playerApi
end

return RSQLFramework
]=]
end

local function installFramework()
	local module = ServerScriptService:FindFirstChild(FRAMEWORK_MODULE_NAME)

	if not module then
		module = Instance.new("ModuleScript")
		module.Name = FRAMEWORK_MODULE_NAME
		module.Parent = ServerScriptService
	end

	if not module:IsA("ModuleScript") then
		error(FRAMEWORK_MODULE_NAME .. " exists but is not a ModuleScript")
	end

	module.Source = getFrameworkSource()
	setStatus("Framework installed in ServerScriptService", Color3.fromRGB(117, 199, 135))
	appendLog("Installed ServerScriptService." .. FRAMEWORK_MODULE_NAME)
end

local function trim(text)
	return text:match("^%s*(.-)%s*$")
end

local function parseValue(rawValue)
	local value = trim(rawValue)

	if value == "true" then
		return true
	end

	if value == "false" then
		return false
	end

	if value == "null" then
		return nil
	end

	if tonumber(value) then
		return tonumber(value)
	end

	if (value:sub(1, 1) == "\"" and value:sub(-1) == "\"") or (value:sub(1, 1) == "'" and value:sub(-1) == "'") then
		return value:sub(2, -2)
	end

	local decodedOk, decoded = pcall(function()
		return HttpService:JSONDecode(value)
	end)

	if decodedOk then
		return decoded
	end

	return value
end

local function readPath(target, path)
	if not path or path == "" then
		return target
	end

	local cursor = target

	for part in path:gmatch("[^%.]+") do
		if type(cursor) ~= "table" then
			return nil
		end

		cursor = cursor[part]
	end

	return cursor
end

local function setPath(target, path, value)
	if type(target) ~= "table" then
		target = {}
	end

	local cursor = target
	local parts = {}

	for part in path:gmatch("[^%.]+") do
		table.insert(parts, part)
	end

	for index = 1, #parts - 1 do
		local part = parts[index]

		if type(cursor[part]) ~= "table" then
			cursor[part] = {}
		end

		cursor = cursor[part]
	end

	cursor[parts[#parts]] = value

	return target
end

local function removePath(target, path)
	if not path or path == "" then
		return nil
	end

	if type(target) ~= "table" then
		return target
	end

	local cursor = target
	local parts = {}

	for part in path:gmatch("[^%.]+") do
		table.insert(parts, part)
	end

	for index = 1, #parts - 1 do
		local part = parts[index]

		if type(cursor[part]) ~= "table" then
			return target
		end

		cursor = cursor[part]
	end

	cursor[parts[#parts]] = nil

	return target
end

local function projectSelectFields(record, fields)
	if #fields == 1 and fields[1] == "*" then
		return record
	end

	local projected = {}

	for _, field in ipairs(fields) do
		local value = readPath(record, field)

		if value ~= nil then
			setPath(projected, field, value)
		end
	end

	return projected
end

local function encodeResult(value)
	if value == nil then
		return "null"
	end

	local ok, encoded = pcall(function()
		return HttpService:JSONEncode(value)
	end)

	return ok and encoded or tostring(value)
end

local function isArray(value)
	if type(value) ~= "table" then
		return false
	end

	local count = 0

	for key in pairs(value) do
		if type(key) ~= "number" then
			return false
		end

		count += 1
	end

	for index = 1, count do
		if value[index] == nil then
			return false
		end
	end

	return true
end

local function compareValues(left, operator, right)
	if operator == "=" or operator == "==" then
		return left == right
	end

	if operator == "!=" or operator == "~=" then
		return left ~= right
	end

	local leftNumber = tonumber(left)
	local rightNumber = tonumber(right)

	if leftNumber ~= nil and rightNumber ~= nil then
		if operator == ">" then
			return leftNumber > rightNumber
		end

		if operator == "<" then
			return leftNumber < rightNumber
		end

		if operator == ">=" then
			return leftNumber >= rightNumber
		end

		if operator == "<=" then
			return leftNumber <= rightNumber
		end
	end

	local leftText = tostring(left)
	local rightText = tostring(right)

	if operator == ">" then
		return leftText > rightText
	end

	if operator == "<" then
		return leftText < rightText
	end

	if operator == ">=" then
		return leftText >= rightText
	end

	if operator == "<=" then
		return leftText <= rightText
	end

	return false
end

local function applyWhereFilter(value, path, operator, expected)
	if type(value) ~= "table" then
		return compareValues(value, operator, expected) and value or nil
	end

	local ownValue = readPath(value, path)

	if ownValue ~= nil then
		return compareValues(ownValue, operator, expected) and value or nil
	end

	if isArray(value) then
		local filtered = {}

		for _, item in ipairs(value) do
			if compareValues(readPath(item, path), operator, expected) then
				table.insert(filtered, item)
			end
		end

		return filtered
	end

	local filtered = {}

	for key, item in pairs(value) do
		if compareValues(readPath(item, path), operator, expected) then
			filtered[key] = item
		end
	end

	return filtered
end

local function splitSourceLines(source)
	local lines = {}

	for rawLine in source:gmatch("[^\r\n]+") do
		table.insert(lines, rawLine)
	end

	return lines
end

local function splitArgs(rawArgs)
	local args = {}

	for arg in rawArgs:gmatch("%S+") do
		table.insert(args, arg)
	end

	return args
end

local function stripLineComment(line)
	local quote = nil
	local index = 1

	while index <= #line do
		local char = line:sub(index, index)

		if quote then
			if char == "\\" then
				index += 2
			elseif char == quote then
				quote = nil
				index += 1
			else
				index += 1
			end
		elseif char == "\"" or char == "'" then
			quote = char
			index += 1
		elseif line:sub(index, index + 1) == "--" then
			return line:sub(1, index - 1)
		else
			index += 1
		end
	end

	return line
end

local formatVariableValue

local function substituteVariables(line, variables)
	if not variables then
		return line
	end

	return line:gsub("%$([%a_][%w_]*)", function(name)
		local value = variables[name]

		if value == nil then
			return ""
		end

		return formatVariableValue(value)
	end)
end

local function collectFunctions(lines)
	local functions = {}
	local executableLines = {}
	local index = 1

	while index <= #lines do
		local line = trim(stripLineComment(lines[index]))
		local functionName, rawParams = line:match("^FUNCTION%s+([%a_][%w_]*)%s*(.*)$")

		if functionName then
			local body = {}
			local params = splitArgs(rawParams or "")

			index += 1

			while index <= #lines and trim(stripLineComment(lines[index])):upper() ~= "END" do
				table.insert(body, lines[index])
				index += 1
			end

			if index > #lines then
				error("FUNCTION " .. functionName .. " is missing END")
			end

			functions[functionName] = {
				params = params,
				body = body,
			}
		else
			table.insert(executableLines, lines[index])
		end

		index += 1
	end

	return executableLines, functions
end

local function parseSetLine(line, selectedUserId)
	local setStore, setKey, setPathValue, operator, rawValue =
		line:match("^SET%s+([%a_][%w_]*)%[(.-)%]%.([%a_][%w_%.]*)%s*([%+%-]=)%s*(.+)$")

	if not setStore then
		setStore, setKey, setPathValue, rawValue =
			line:match("^SET%s+([%a_][%w_]*)%[(.-)%]%.([%a_][%w_%.]*)%s*=%s*(.+)$")
		operator = setStore and "=" or nil
	end

	if not setStore and selectedUserId then
		setStore, setPathValue, operator, rawValue =
			line:match("^SET%s+([%a_][%w_]*)%.([%a_][%w_%.]*)%s*([%+%-]=)%s*(.+)$")
		setKey = selectedUserId
	end

	if not setStore and selectedUserId then
		setStore, setPathValue, rawValue =
			line:match("^SET%s+([%a_][%w_]*)%.([%a_][%w_%.]*)%s*=%s*(.+)$")
		operator = setStore and "=" or nil
		setKey = selectedUserId
	end

	return setStore, setKey, setPathValue, operator, rawValue
end

local function parseWhereLine(line)
	local wherePath, whereValue = line:match("^WHERE%s+([%a_][%w_%.]*)%s*>%s*=%s*(.+)$")
	if wherePath then
		return wherePath, ">=", whereValue
	end

	wherePath, whereValue = line:match("^WHERE%s+([%a_][%w_%.]*)%s*<%s*=%s*(.+)$")
	if wherePath then
		return wherePath, "<=", whereValue
	end

	wherePath, whereValue = line:match("^WHERE%s+([%a_][%w_%.]*)%s*==%s*(.+)$")
	if wherePath then
		return wherePath, "==", whereValue
	end

	wherePath, whereValue = line:match("^WHERE%s+([%a_][%w_%.]*)%s*~=%s*(.+)$")
	if wherePath then
		return wherePath, "~=", whereValue
	end

	wherePath, whereValue = line:match("^WHERE%s+([%a_][%w_%.]*)%s*!%s*=%s*(.+)$")
	if wherePath then
		return wherePath, "!=", whereValue
	end

	wherePath, whereValue = line:match("^WHERE%s+([%a_][%w_%.]*)%s*>%s*([^=].*)$")
	if wherePath then
		return wherePath, ">", whereValue
	end

	wherePath, whereValue = line:match("^WHERE%s+([%a_][%w_%.]*)%s*<%s*([^=].*)$")
	if wherePath then
		return wherePath, "<", whereValue
	end

	wherePath, whereValue = line:match("^WHERE%s+([%a_][%w_%.]*)%s*=%s*(.+)$")
	if wherePath then
		return wherePath, "=", whereValue
	end

	return nil, nil, nil
end

local function parseDeleteLine(line, selectedUserId)
	local deleteStore, deleteKey, deletePath =
		line:match("^DELETE%s+([%a_][%w_]*)%[(.-)%]%.([%a_][%w_%.]*)$")

	if deleteStore then
		return deleteStore, deleteKey, deletePath
	end

	deleteStore, deleteKey = line:match("^DELETE%s+([%a_][%w_]*)%[(.-)%]$")

	if deleteStore then
		return deleteStore, deleteKey, nil
	end

	if selectedUserId then
		deleteStore, deletePath = line:match("^DELETE%s+([%a_][%w_]*)%.([%a_][%w_%.]*)$")

		if deleteStore then
			return deleteStore, selectedUserId, deletePath
		end

		deleteStore = line:match("^DELETE%s+([%a_][%w_]*)$")

		if deleteStore then
			return deleteStore, selectedUserId, nil
		end
	end

	return nil, nil, nil
end

local function splitSelectFields(rawFields)
	local normalizedFields = trim(rawFields)

	if normalizedFields == "*" then
		return { "*" }
	end

	local fields = {}

	for field in normalizedFields:gmatch("[^,]+") do
		local normalizedField = trim(field)

		if normalizedField ~= "" then
			if not normalizedField:match("^[%a_][%w_%.]*$") then
				error("Invalid SELECT field: " .. normalizedField)
			end

			table.insert(fields, normalizedField)
		end
	end

	if #fields == 0 then
		error("SELECT needs at least one field")
	end

	return fields
end

local function parseSelectLine(line, selectedUserId)
	local rawFields, selectStore, selectKey =
		line:match("^SELECT%s+(.+)%s+FROM%s+([%a_][%w_]*)%[(.-)%]$")

	if selectStore then
		return selectStore, selectKey, splitSelectFields(rawFields)
	end

	rawFields, selectStore = line:match("^SELECT%s+(.+)%s+FROM%s+([%a_][%w_]*)$")

	if selectStore and selectedUserId then
		return selectStore, selectedUserId, splitSelectFields(rawFields)
	end

	if selectStore then
		error("SELECT FROM " .. selectStore .. " needs [key] or SELECTUSERID")
	end

	return nil, nil, nil
end

local function castTypedValue(rawValue, typeName)
	local normalizedType = (typeName or "Any"):lower()
	local parsed = parseValue(rawValue)

	if normalizedType == "any" then
		return parsed
	end

	if normalizedType == "int" or normalizedType == "integer" then
		local numberValue = tonumber(parsed)

		if numberValue == nil then
			error("VAR value is not an Int: " .. tostring(rawValue))
		end

		return math.floor(numberValue)
	end

	if normalizedType == "float" or normalizedType == "number" then
		local numberValue = tonumber(parsed)

		if numberValue == nil then
			error("VAR value is not a Number: " .. tostring(rawValue))
		end

		return numberValue
	end

	if normalizedType == "bool" or normalizedType == "boolean" then
		if parsed == true or parsed == false then
			return parsed
		end

		local textValue = tostring(parsed):lower()

		if textValue == "true" or textValue == "1" then
			return true
		end

		if textValue == "false" or textValue == "0" then
			return false
		end

		error("VAR value is not a Bool: " .. tostring(rawValue))
	end

	if normalizedType == "string" or normalizedType == "str" then
		return tostring(parsed)
	end

	if normalizedType == "json" or normalizedType == "table" or normalizedType == "object" then
		if type(parsed) ~= "table" then
			error("VAR value is not " .. typeName .. ": " .. tostring(rawValue))
		end

		return parsed
	end

	error("Unsupported VAR type: " .. tostring(typeName))
end

function formatVariableValue(value)
	if type(value) == "table" then
		local ok, encoded = pcall(function()
			return HttpService:JSONEncode(value)
		end)

		if ok then
			return encoded
		end
	end

	return tostring(value)
end

local function parseVarLine(line)
	local variableName, typeName, rawValue =
		line:match("^VAR%s+([%a_][%w_]*)%s*:%s*([%a_][%w_]*)%s*=%s*(.+)$")

	if variableName then
		return variableName, typeName, rawValue
	end

	variableName, rawValue = line:match("^VAR%s+([%a_][%w_]*)%s*=%s*(.+)$")

	if variableName then
		return variableName, "Any", rawValue
	end

	return nil, nil, nil
end

local function stripQuotes(value)
	local text = trim(value or "")

	if (text:sub(1, 1) == "\"" and text:sub(-1) == "\"") or (text:sub(1, 1) == "'" and text:sub(-1) == "'") then
		return text:sub(2, -2)
	end

	return text
end

local function parseImportLine(line)
	local rawTarget = line:match("^[Ii][Mm][Pp][Oo][Rr][Tt]%s+(.+)$")

	if not rawTarget then
		return nil, nil
	end

	local urlTarget =
		rawTarget:match("^[Uu][Rr][Ll]%(%s*\"(.-)\"%s*%)$") or
		rawTarget:match("^[Uu][Rr][Ll]%(%s*'(.-)'%s*%)$") or
		rawTarget:match("^[Uu][Rr][Ll]%(%s*(.-)%s*%)$")

	if urlTarget then
		return "url", trim(urlTarget)
	end

	return "module", stripQuotes(rawTarget)
end

local function getInstanceByPath(path)
	local serviceRoots = {
		game = game,
		Game = game,
		ServerScriptService = ServerScriptService,
		ReplicatedStorage = ReplicatedStorage,
		ServerStorage = ServerStorage,
	}
	local current = nil

	for part in path:gmatch("[^%.]+") do
		if not current then
			current = serviceRoots[part]

			if not current then
				current = game:FindFirstChild(part)
			end
		else
			current = current:FindFirstChild(part)
		end

		if not current then
			return nil
		end
	end

	return current
end

local function findModuleScript(moduleName)
	local byPath = getInstanceByPath(moduleName)

	if byPath and byPath:IsA("ModuleScript") then
		return byPath
	end

	for _, instance in ipairs(game:GetDescendants()) do
		if instance:IsA("ModuleScript") and instance.Name == moduleName then
			return instance
		end
	end

	return nil
end

local function readModuleScriptSource(moduleName)
	local module = findModuleScript(moduleName)

	if not module then
		error("IMPORT module not found: " .. tostring(moduleName))
	end

	local ok, source = pcall(function()
		return module.Source
	end)

	if not ok then
		error("IMPORT could not read " .. module:GetFullName() .. ": " .. tostring(source))
	end

	return source, module:GetFullName()
end

local function fetchUrlSource(url)
	if url:sub(1, 8) ~= "https://" and url:sub(1, 7) ~= "http://" then
		error("IMPORT URL must start with http:// or https://")
	end

	local ok, source = pcall(function()
		return HttpService:GetAsync(url, true)
	end)

	if not ok then
		error("IMPORT URL failed: " .. tostring(source))
	end

	return source, url
end

local function importRsqlSource(source, sourceLabel, functions, importedKeys, output)
	local importedExecutableLines, importedFunctions = collectFunctions(splitSourceLines(source))
	local functionCount = 0

	for functionName, definition in pairs(importedFunctions) do
		functions[functionName] = definition
		functionCount += 1
	end

	for _, rawLine in ipairs(importedExecutableLines) do
		local line = trim(stripLineComment(rawLine))
		local importKind, importTarget = parseImportLine(line)

		if importKind then
			local importKey = importKind .. ":" .. importTarget

			if not importedKeys[importKey] then
				importedKeys[importKey] = true

				local nestedSource, nestedLabel

				if importKind == "url" then
					nestedSource, nestedLabel = fetchUrlSource(importTarget)
				else
					nestedSource, nestedLabel = readModuleScriptSource(importTarget)
				end

				importRsqlSource(nestedSource, nestedLabel, functions, importedKeys, output)
			end
		end
	end

	table.insert(output, {
		level = "info",
		message = "IMPORT " .. sourceLabel .. " (" .. tostring(functionCount) .. " functions)",
	})
end

local function importRsql(importKind, importTarget, functions, importedKeys, output)
	local importKey = importKind .. ":" .. importTarget

	if importedKeys[importKey] then
		table.insert(output, {
			level = "info",
			message = "IMPORT skipped " .. importTarget,
		})
		return
	end

	importedKeys[importKey] = true

	local source, sourceLabel

	if importKind == "url" then
		source, sourceLabel = fetchUrlSource(importTarget)
	else
		source, sourceLabel = readModuleScriptSource(importTarget)
	end

	importRsqlSource(source, sourceLabel, functions, importedKeys, output)
end

local function getDataStoreSafely(storeName)
	local ok, store = pcall(function()
		return DataStoreService:GetDataStore(storeName)
	end)

	if not ok then
		error("Could not open DataStore " .. tostring(storeName) .. ": " .. tostring(store))
	end

	return store
end

local function dataStoreGet(storeName, key)
	local store = getDataStoreSafely(storeName)
	local ok, result = pcall(function()
		return store:GetAsync(key)
	end)

	if not ok then
		error("GET " .. storeName .. "[" .. key .. "] failed: " .. tostring(result))
	end

	return result
end

local function dataStoreUpdate(storeName, key, callback)
	local store = getDataStoreSafely(storeName)
	local ok, result = pcall(function()
		return store:UpdateAsync(key, callback)
	end)

	if not ok then
		error("SET " .. storeName .. "[" .. key .. "] failed: " .. tostring(result))
	end

	return result
end

local function dataStoreRemove(storeName, key)
	local store = getDataStoreSafely(storeName)
	local ok, result = pcall(function()
		store:RemoveAsync(key)
		return true
	end)

	if not ok then
		error("DELETE " .. storeName .. "[" .. key .. "] failed: " .. tostring(result))
	end

	return result
end

local function decodeResponseBody(body)
	if body == nil or body == "" then
		return {}
	end

	local ok, decoded = pcall(function()
		return HttpService:JSONDecode(body)
	end)

	if ok then
		return decoded
	end

	return {
		success = false,
		message = body,
	}
end

local function requestTo(baseUrl, method, path, body)
	local requestOptions = {
		Url = baseUrl .. path,
		Method = method,
		Headers = {
			Accept = "application/json",
		},
	}

	if body ~= nil then
		requestOptions.Headers["Content-Type"] = "application/json"
		requestOptions.Body = HttpService:JSONEncode(body)
	end

	local response = HttpService:RequestAsync(requestOptions)
	local decoded = decodeResponseBody(response.Body)

	if not response.Success then
		local message = decoded.message or response.StatusMessage or "Bridge request failed"
		error(string.format("%s %s failed: %s (%d)", method, path, tostring(message), response.StatusCode))
	end

	return decoded
end

local function request(method, path, body)
	if not activeBridgeUrl then
		error("Bridge URL is not resolved")
	end

	return requestTo(activeBridgeUrl, method, path, body)
end

local function resolveBridge()
	lastBridgeError = nil

	for _, bridgeUrl in ipairs(BRIDGE_URLS) do
		local ok, result = pcall(function()
			return requestTo(bridgeUrl, "GET", "/health")
		end)

		if ok and result.success and result.capabilities and result.capabilities.sessionCommands and result.capabilities.sessionResults then
			activeBridgeUrl = bridgeUrl
			appendLog("Bridge found at " .. bridgeUrl)
			return true
		end

		if ok and result.success then
			lastBridgeError = "Bridge at " .. bridgeUrl .. " is outdated. Restart the bridge."
		else
			lastBridgeError = tostring(result)
		end
	end

	activeBridgeUrl = nil
	return false
end

local function executeRsql(source)
	local output = {}
	local lastResult = nil
	local selectedUserId = nil
	local executableLines, functions = collectFunctions(splitSourceLines(source))
	local importedKeys = {}

	local function runLines(lines, variables, depth)
		if depth > 20 then
			error("FUNCTION call depth limit reached")
		end

		for _, rawLine in ipairs(lines) do
			local line = trim(stripLineComment(substituteVariables(rawLine, variables)))

			if line ~= "" then
			local importKind, importTarget = parseImportLine(line)

			if importKind then
				importRsql(importKind, importTarget, functions, importedKeys, output)
				continue
			end

			local variableName, variableType, variableRawValue = parseVarLine(line)

			if variableName then
				variables[variableName] = castTypedValue(variableRawValue, variableType)
				table.insert(output, {
					level = "info",
					message = "VAR " .. variableName .. ":" .. variableType,
				})
				continue
			end

			local selectUserId = line:match("^SELECTUSERID%s+(.+)$") or line:match("^SELECTUSERID%((.-)%)$")

			if selectUserId then
				selectedUserId = tostring(parseValue(selectUserId))
				table.insert(output, {
					level = "info",
					message = "SELECTUSERID " .. selectedUserId,
				})
				continue
			end

			local callName, rawArgs = line:match("^CALL%s+([%a_][%w_]*)%s*(.*)$")

			if callName then
				local selectedFunction = functions[callName]

				if not selectedFunction then
					error("Unknown FUNCTION: " .. callName)
				end

				local args = splitArgs(rawArgs or "")
				local nextVariables = {}

				for name, value in pairs(variables or {}) do
					nextVariables[name] = value
				end

				for index, paramName in ipairs(selectedFunction.params) do
					nextVariables[paramName] = parseValue(args[index] or "")
				end

				table.insert(output, {
					level = "info",
					message = "CALL " .. callName,
				})
				runLines(selectedFunction.body, nextVariables, depth + 1)
				continue
			end

			local selectStore, selectKey, selectFields = parseSelectLine(line, selectedUserId)

			if selectStore then
				local key = tostring(parseValue(selectKey))
				local record = dataStoreGet(selectStore, key)

				lastResult = projectSelectFields(record, selectFields)
				table.insert(output, {
					level = "info",
					message = "SELECT " .. table.concat(selectFields, ", ") .. " FROM " .. selectStore .. "[" .. key .. "]",
				})
				continue
			end

			local getStore, getKey, getPath = line:match("^GET%s+([%a_][%w_]*)%[(.-)%]%.([%a_][%w_%.]*)$")

			if not getStore then
				getStore, getKey = line:match("^GET%s+([%a_][%w_]*)%[(.-)%]$")
				getPath = nil
			end

			if not getStore and selectedUserId then
				getStore, getPath = line:match("^GET%s+([%a_][%w_]*)%.([%a_][%w_%.]*)$")

				if not getStore then
					getStore = line:match("^GET%s+([%a_][%w_]*)$")
					getPath = nil
				end

				getKey = selectedUserId
			end

			if getStore then
				local key = tostring(parseValue(getKey))
				local record = dataStoreGet(getStore, key)

				lastResult = readPath(record, getPath)
				table.insert(output, {
					level = "info",
					message = "GET " .. getStore .. "[" .. key .. "]",
				})
				continue
			end

			local setStore, setKey, setPathValue, operator, rawValue = parseSetLine(line, selectedUserId)

			if setStore then
				local key = tostring(parseValue(setKey))
				local incoming = parseValue(rawValue)

				lastResult = dataStoreUpdate(setStore, key, function(current)
					current = type(current) == "table" and current or {}

					local previous = readPath(current, setPathValue)
					local nextValue = incoming

					if operator == "+=" then
						nextValue = (tonumber(previous) or 0) + (tonumber(incoming) or 0)
					elseif operator == "-=" then
						nextValue = (tonumber(previous) or 0) - (tonumber(incoming) or 0)
					end

					return setPath(current, setPathValue, nextValue)
				end)

				table.insert(output, {
					level = "success",
					message = "SET " .. setStore .. "[" .. key .. "]." .. setPathValue .. " " .. operator .. " " .. tostring(incoming),
				})
				continue
			end

			local wherePath, whereOperator, whereValue = parseWhereLine(line)

			if wherePath then
				local expected = parseValue(whereValue)

				lastResult = applyWhereFilter(lastResult, wherePath, whereOperator, expected)
				table.insert(output, {
					level = "info",
					message = "WHERE " .. wherePath .. " " .. whereOperator .. " " .. tostring(expected),
				})
				continue
			end

			local deleteStore, deleteKey, deletePath = parseDeleteLine(line, selectedUserId)

			if deleteStore then
				local key = tostring(parseValue(deleteKey))

				if deletePath then
					lastResult = dataStoreUpdate(deleteStore, key, function(current)
						return removePath(current, deletePath)
					end)

					table.insert(output, {
						level = "success",
						message = "DELETE " .. deleteStore .. "[" .. key .. "]." .. deletePath,
					})
				else
					dataStoreRemove(deleteStore, key)
					lastResult = true
					table.insert(output, {
						level = "success",
						message = "DELETE " .. deleteStore .. "[" .. key .. "]",
					})
				end
				continue
			end

			if line:upper() == "PRINT" then
				table.insert(output, {
					level = "result",
					message = encodeResult(lastResult),
				})
				continue
			end

			error("Unsupported RSQL command: " .. line)
			end
		end
	end

	runLines(executableLines, {}, 0)

	return {
		output = output,
		result = lastResult,
	}
end

local function reportCommandFailure(commandId, errorMessage)
	local ok = pcall(function()
		request("POST", "/sessions/" .. sessionId .. "/results", {
			commandId = commandId,
			success = false,
			message = tostring(errorMessage),
			output = {
				{
					level = "error",
					message = tostring(errorMessage),
				},
			},
		})
	end)

	if not ok then
		appendLog("Could not report command failure")
	end
end

local function executeCommand(command)
	appendLog("Received command " .. command.commandId)

	local response = executeRsql(command.code)

	request("POST", "/sessions/" .. sessionId .. "/results", {
		commandId = command.commandId,
		success = true,
		output = response.output,
		result = response.result,
	})

	appendLog("Command finished")
end

local function poll()
	if isPolling then
		return
	end

	isPolling = true

	task.spawn(function()
		while sessionId do
			if not activeBridgeUrl and not resolveBridge() then
				setStatus("Bridge not found on port 34872", Color3.fromRGB(255, 115, 115))
				task.wait(3)
				continue
			end

			local ok, result = pcall(function()
				request("POST", "/ping", {
					sessionId = sessionId,
				})

				return request("GET", "/sessions/" .. sessionId .. "/commands/next")
			end)

			if ok then
				setStatus("Connected to RSQL bridge", Color3.fromRGB(117, 199, 135))

				if result.command then
					local executed, errorMessage = pcall(executeCommand, result.command)

					if not executed then
						reportCommandFailure(result.command.commandId, errorMessage)
					end
				end
			else
				local message = tostring(result)

				if message:find("Invalid session", 1, true) then
					clearSession()
					setStatus("Session expired. Generate a new token.", Color3.fromRGB(230, 193, 90))
				else
					activeBridgeUrl = nil
					setStatus("Bridge disconnected", Color3.fromRGB(255, 115, 115))
				end

				appendLog(message)
			end

			task.wait(3)
		end

		isPolling = false
	end)
end

local function connect()
	if isConnecting then
		return
	end

	local token = tokenBox.Text:gsub("%s+", "")

	if token == "" then
		setStatus("Paste a token first", Color3.fromRGB(230, 193, 90))
		return
	end

	isConnecting = true
	connectButton.Active = false
	connectButton.Text = "Connecting..."
	setStatus("Checking local bridge...", Color3.fromRGB(230, 193, 90))

	if not resolveBridge() then
		isConnecting = false
		connectButton.Active = true
		connectButton.Text = "Connect"
		setStatus("Bridge not found on port 34872", Color3.fromRGB(255, 115, 115))
		appendLog(lastBridgeError or "Start the bridge with: npm.cmd run dev")
		return
	end

	local ok, result = pcall(function()
		return request("POST", "/connect", {
			token = token,
			placeId = game.PlaceId,
			gameName = getPlaceDisplayName(),
		})
	end)

	isConnecting = false
	connectButton.Active = true
	connectButton.Text = "Connect"

	if not ok then
		clearSession()
		setStatus("Could not connect", Color3.fromRGB(255, 115, 115))
		appendLog(result)
		return
	end

	sessionId = result.sessionId
	plugin:SetSetting(SETTINGS_KEY, sessionId)
	tokenBox.Text = ""
	disconnectButton.Visible = true
	setStatus("Connected to RSQL bridge", Color3.fromRGB(117, 199, 135))
	appendLog("Session " .. sessionId)
	poll()
end

local function disconnect()
	if not sessionId then
		clearSession()
		setStatus("Disconnected", Color3.fromRGB(220, 220, 220))
		appendLog("No active session")
		return
	end

	local currentSessionId = sessionId
	local ok, result = pcall(function()
		if not activeBridgeUrl then
			resolveBridge()
		end

		if activeBridgeUrl then
			request("POST", "/disconnect", {
				sessionId = currentSessionId,
			})
		end
	end)

	clearSession()
	setStatus("Disconnected", Color3.fromRGB(220, 220, 220))

	if ok then
		appendLog("Disconnected session " .. currentSessionId)
	else
		appendLog("Disconnected locally: " .. tostring(result))
	end
end

local function handleWidgetEnabled()
	toggleButton:SetActive(widget.Enabled)

	if widget.Enabled then
		resolveBridge()

		if sessionId then
			poll()
		end
	end
end

toggleButton.Click:Connect(function()
	widget.Enabled = not widget.Enabled
	handleWidgetEnabled()
end)

connectButton.MouseButton1Click:Connect(connect)
disconnectButton.MouseButton1Click:Connect(disconnect)
frameworkButton.MouseButton1Click:Connect(function()
	local ok, result = pcall(installFramework)

	if not ok then
		setStatus("Could not install framework", Color3.fromRGB(255, 115, 115))
		appendLog(result)
	end
end)
widget:GetPropertyChangedSignal("Enabled"):Connect(handleWidgetEnabled)

if sessionId then
	disconnectButton.Visible = true
	setStatus("Reconnecting...", Color3.fromRGB(230, 193, 90))
	poll()
else
	setStatus("Disconnected", Color3.fromRGB(220, 220, 220))
end
