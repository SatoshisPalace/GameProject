-- Leaderboard Contract State
State = {
  isLocked = false,
  scoreCount = 0,
  scores = {},
  topScores = {},
  recentScores = {},
  masterWallet = "MASTER_WALLET_ADDRESS" -- Replace with actual master wallet address
}

-- Helper function to validate score submission
function validateScoreSubmission(action)
  if State.isLocked then
    error("Contract is locked")
  end
  
  if not action.input.Score or not action.input.GameId or not action.input.WalletAddress then
    error("Missing required fields")
  end
  
  local score = tonumber(action.input.Score)
  if not score or score < 0 then
    error("Invalid score value")
  end
end

-- Handle score submission
function submitScore(action)
  validateScoreSubmission(action)
  
  local entry = {
    walletAddress = action.input.WalletAddress,
    username = action.input.Username or "Anonymous",
    score = tonumber(action.input.Score),
    gameId = action.input.GameId,
    timestamp = action.input.Timestamp
  }
  
  table.insert(State.scores, entry)
  State.scoreCount = State.scoreCount + 1
  
  -- Update top scores
  table.insert(State.topScores, entry)
  table.sort(State.topScores, function(a, b) return a.score > b.score end)
  if #State.topScores > 100 then
    table.remove(State.topScores)
  end
  
  -- Update recent scores
  table.insert(State.recentScores, 1, entry)
  if #State.recentScores > 50 then
    table.remove(State.recentScores)
  end
  
  return { success = true, data = entry }
end

-- Handle get state
function getState()
  return { success = true, data = { isLocked = State.isLocked, scoreCount = State.scoreCount } }
end

-- Handle lock contract
function lockContract(action)
  if action.caller ~= State.masterWallet then
    error("Unauthorized: Only master wallet can lock contract")
  end
  State.isLocked = true
  return { success = true, data = { isLocked = true } }
end

-- Handle unlock contract
function unlockContract(action)
  if action.caller ~= State.masterWallet then
    error("Unauthorized: Only master wallet can unlock contract")
  end
  State.isLocked = false
  return { success = true, data = { isLocked = false } }
end

-- Handle query top players
function queryTopPlayers(action)
  local gameId = action.input.GameId
  local page = tonumber(action.input.Page) or 1
  local pageSize = tonumber(action.input.PageSize) or 10
  
  local filtered = {}
  for _, score in ipairs(State.topScores) do
    if score.gameId == gameId then
      table.insert(filtered, score)
    end
  end
  
  local start = (page - 1) * pageSize + 1
  local results = {}
  for i = start, math.min(start + pageSize - 1, #filtered) do
    table.insert(results, filtered[i])
  end
  
  return { success = true, data = results }
end

-- Handle query player history
function queryPlayerHistory(action)
  local walletAddress = action.input.WalletAddress
  local gameId = action.input.GameId
  local page = tonumber(action.input.Page) or 1
  local pageSize = tonumber(action.input.PageSize) or 10
  
  local filtered = {}
  for _, score in ipairs(State.scores) do
    if score.walletAddress == walletAddress and (not gameId or score.gameId == gameId) then
      table.insert(filtered, score)
    end
  end
  
  local start = (page - 1) * pageSize + 1
  local results = {}
  for i = start, math.min(start + pageSize - 1, #filtered) do
    table.insert(results, filtered[i])
  end
  
  return { success = true, data = results }
end

-- Handle query recent players
function queryRecentPlayers(action)
  local gameId = action.input.GameId
  local limit = tonumber(action.input.Limit) or 5
  
  local filtered = {}
  for _, score in ipairs(State.recentScores) do
    if score.gameId == gameId then
      table.insert(filtered, score)
      if #filtered >= limit then
        break
      end
    end
  end
  
  return { success = true, data = filtered }
end

-- Handle get total players for game
function getTotalPlayers(action)
  local gameId = action.input.GameId
  local uniquePlayers = {}
  local count = 0
  
  for _, score in ipairs(State.scores) do
    if score.gameId == gameId and not uniquePlayers[score.walletAddress] then
      uniquePlayers[score.walletAddress] = true
      count = count + 1
    end
  end
  
  return { success = true, data = { totalPlayers = count } }
end

-- Handle get game stats
function getGameStats(action)
  local gameId = action.input.GameId
  local uniquePlayers = {}
  local totalPlayers = 0
  local totalScore = 0
  local highestScore = 0
  local submissionCount = 0
  
  for _, score in ipairs(State.scores) do
    if score.gameId == gameId then
      submissionCount = submissionCount + 1
      totalScore = totalScore + score.score
      if score.score > highestScore then
        highestScore = score.score
      end
      if not uniquePlayers[score.walletAddress] then
        uniquePlayers[score.walletAddress] = true
        totalPlayers = totalPlayers + 1
      end
    end
  end
  
  return {
    success = true,
    data = {
      gameId = gameId,
      totalPlayers = totalPlayers,
      totalScore = totalScore,
      highestScore = highestScore,
      submissionCount = submissionCount
    }
  }
end

-- Handle get total game stats
function getTotalGameStats(action)
  local gameId = action.input.GameId
  local uniquePlayers = {}
  local totalGames = 0
  local totalScore = 0
  
  -- Calculate totals in a single pass through the scores
  for _, score in ipairs(State.scores) do
    if score.gameId == gameId then
      totalGames = totalGames + 1
      totalScore = totalScore + score.score
      if not uniquePlayers[score.walletAddress] then
        uniquePlayers[score.walletAddress] = true
      end
    end
  end
  
  -- Count unique players
  local totalPlayers = 0
  for _ in pairs(uniquePlayers) do
    totalPlayers = totalPlayers + 1
  end
  
  return {
    success = true,
    data = {
      totalGames = totalGames,
      totalPlayers = totalPlayers,
      totalScore = totalScore
    }
  }
end

-- Handle reset data (only for testing)
function resetData(action)
  if action.caller ~= State.masterWallet then
    error("Unauthorized: Only master wallet can reset data")
  end
  
  State.isLocked = false
  State.scoreCount = 0
  State.scores = {}
  State.topScores = {}
  State.recentScores = {}
  
  return { success = true, data = { message = "Data reset successful" } }
end

-- Main handler
function handle(state, action)
  State = state
  
  if action.input.Action == "submit-score" then
    return submitScore(action)
  elseif action.input.Action == "get-state" then
    return getState()
  elseif action.input.Action == "lock-contract" then
    return lockContract(action)
  elseif action.input.Action == "unlock-contract" then
    return unlockContract(action)
  elseif action.input.Action == "query-top-players" then
    return queryTopPlayers(action)
  elseif action.input.Action == "query-player-history" then
    return queryPlayerHistory(action)
  elseif action.input.Action == "query-recent-players" then
    return queryRecentPlayers(action)
  elseif action.input.Action == "reset-data" then
    return resetData(action)
  elseif action.input.Action == "get-game-stats" then
    return getGameStats(action)
  elseif action.input.Action == "get-total-players" then
    return getTotalPlayers(action)
  elseif action.input.Action == "get-total-game-stats" then
    return getTotalGameStats(action)
  else
    error("Unknown action")
  end
end
