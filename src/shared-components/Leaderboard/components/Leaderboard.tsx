import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { LeaderboardEntry, PlayerData, GameStats, TotalGameStats } from '../types/leaderboard';
import { getTopPlayers, getPlayerHistory, getGameStats, getRecentPlayers, getTotalGameStats } from '../utils/leaderboard';
import { useWallet } from '../../Wallet/WalletContext';
import UserProfile from '../../UserProfile/UserProfile';
import LoadingSection from './LoadingShimmer';

const LeaderboardContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 400px;
  height: 100vh;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.95) 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5vh;
  color: white;
  overflow-y: auto;
  z-index: 1000;
  backdrop-filter: blur(10px);

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    
    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
`;

const Section = styled.div`
  padding: 1.5vh;
  background: rgba(20, 20, 20, 0.7);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 1.5vh;
`;

const SectionTitle = styled.h3`
  color: #fff;
  font-size: 1.2em;
  font-weight: 600;
  margin-bottom: 1vh;
  text-transform: uppercase;
`;

const ScrollableList = styled.div`
  height: 25vh;
  overflow-y: auto;
  padding-right: 0.5vh;
  margin: 0.5vh 0;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    
    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
`;

const PlayerEntry = styled.div<{ $highlight?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: ${props => props.$highlight 
    ? 'linear-gradient(90deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.1) 100%)'
    : 'linear-gradient(90deg, rgba(40, 40, 40, 0.9) 0%, rgba(30, 30, 30, 0.9) 100%)'};
  border-radius: 6px;
  margin-bottom: 4px;
`;

const PlayerInfoLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
`;

const PlayerScore = styled.span`
  font-weight: 600;
  color: #fff;
  text-align: right;
  margin-left: 12px;
`;

const Rank = styled.div<{ $color?: string }>`
  font-size: 1.1em;
  font-weight: bold;
  color: ${props => props.$color || '#fff'};
`;

const Badge = styled.span<{ type: 'gold' | 'silver' | 'bronze' }>`
  color: ${props => getBadgeColor(props.type)};
  margin-right: 4px;
  font-size: 1.2em;
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1vh;
  margin-bottom: 2vh;
`;

const StatBox = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 0.75vh;
  text-align: center;

  .value {
    font-size: 0.9em;
    font-weight: bold;
    color: #fff;
    margin-bottom: 0.375vh;
  }

  .label {
    font-size: 0.675em;
    color: rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
  }
`;

const RecentPlayer = styled.div<{ $isNew?: boolean }>`
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 15px;
  align-items: center;
  padding: 1vh;
  background: linear-gradient(90deg, rgba(40, 40, 40, 0.9) 0%, rgba(30, 30, 30, 0.9) 100%);
  border-radius: 6px;
  margin-bottom: 0.5vh;
`;

const RecentPlayerScore = styled.div`
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  font-size: 0.9em;
`;

const TimeAgo = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8em;
  white-space: nowrap;
`;

const PlayerInfoSection = styled.div`
  padding: 1.5vh;
  background: rgba(20, 20, 20, 0.7);
  border-radius: 8px;
  margin-bottom: 1.5vh;
`;

const ConnectPrompt = styled.div`
  text-align: center;
  padding: 20px;
  background: rgba(108, 92, 231, 0.1);
  border-radius: 8px;
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2vh;
`;

const PlayerInfoContent = styled.div`
  display: flex;
  align-items: center;
`;

const PlayerStats = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5vh;
  margin-top: 1vh;
  color: rgba(255, 255, 255, 0.9);
`;

interface LeaderboardProps {
  gameId: string;
}

const getBadgeColor = (type: 'gold' | 'silver' | 'bronze'): string => {
  const colors = {
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32'
  };
  return colors[type];
};

const formatTimeAgo = (timestamp: string | number) => {
  const now = Date.now();
  const timestampMs = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp * 1000;
  const diffSeconds = Math.floor((now - timestampMs) / 1000);
  
  if (diffSeconds < 30) return 'just now';
  if (diffSeconds < 60) return '~30 seconds ago';
  if (diffSeconds < 120) return '1 min ago';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} mins ago`;
  if (diffSeconds < 7200) return '1 hour ago';
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} hours ago`;
  return `${Math.floor(diffSeconds / 86400)} days ago`;
};

const computePlayerStats = async (address: string, gameId: string) => {
  try {
    const playerHistory = await getPlayerHistory(address, gameId);
    const gameStats = await getGameStats(gameId);
    const totalStats = await getTotalGameStats(gameId);

    return {
      highestScore: playerHistory?.scores?.length > 0 ? Math.max(...playerHistory.scores.map(s => s.score)) : 0,
      totalScore: playerHistory?.totalScore || 0,
      gamesPlayed: playerHistory?.scores?.length || 0
    };
  } catch (error) {
    console.error('Error computing player stats:', error);
    return {
      highestScore: 0,
      totalScore: 0,
      gamesPlayed: 0
    };
  }
};

const Leaderboard: React.FC<LeaderboardProps> = ({ gameId }) => {
  const [topPlayers, setTopPlayers] = useState<LeaderboardEntry[]>([]);
  const [recentPlayers, setRecentPlayers] = useState<LeaderboardEntry[]>([]);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [totalStats, setTotalStats] = useState<TotalGameStats | null>(null);
  const [playerStats, setPlayerStats] = useState({
    highestScore: 0,
    totalScore: 0,
    gamesPlayed: 0
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isTopPlayersLoading, setIsTopPlayersLoading] = useState(true);
  const [isRecentPlayersLoading, setIsRecentPlayersLoading] = useState(true);
  const [isUserStatsLoading, setIsUserStatsLoading] = useState(false);
  const { address, bazarProfile, isConnected } = useWallet();

  useEffect(() => {
    console.log("[LEADERBOARD] Wallet Context state:", {
      address,
      bazarProfile: JSON.stringify(bazarProfile, null, 2),
      isConnected,
      hasProfileId: bazarProfile?.ProfileId ? 'yes' : 'no'
    });
  }, [address, bazarProfile, isConnected]);

  const copyAddressToClipboard = (address: string) => {
    console.log("[LEADERBOARD] Copying to clipboard:", address);
    navigator.clipboard.writeText(address);
  };

  useEffect(() => {
    console.log("Wallet Context in Leaderboard:", {
      address,
      bazarProfile,
      isConnected
    });
  }, [address, bazarProfile, isConnected]);

  useEffect(() => {
    const loadPlayerStats = async () => {
      if (address) {
        if (isInitialLoad) {
          setIsUserStatsLoading(true);
        }
        try {
          const stats = await computePlayerStats(address, gameId);
          setPlayerStats(stats);
        } catch (error) {
          console.error('Error loading player stats:', error);
        } finally {
          setIsUserStatsLoading(false);
        }
      }
    };
    loadPlayerStats();
  }, [address, gameId, isInitialLoad]);

  useEffect(() => {
    const fetchTopPlayers = async () => {
      if (isInitialLoad) {
        setIsTopPlayersLoading(true);
      }
      try {
        const top = await getTopPlayers(gameId);
        setTopPlayers(top);
      } catch (error) {
        console.error('Error fetching top players:', error);
      } finally {
        setIsTopPlayersLoading(false);
        setIsInitialLoad(false);
      }
    };

    fetchTopPlayers();
    const interval = setInterval(fetchTopPlayers, 10000);
    return () => clearInterval(interval);
  }, [gameId, isInitialLoad]);

  useEffect(() => {
    const fetchRecentPlayers = async () => {
      if (isInitialLoad) {
        setIsRecentPlayersLoading(true);
      }
      try {
        const [recent, stats, total] = await Promise.all([
          getRecentPlayers(gameId),
          getGameStats(gameId),
          getTotalGameStats(gameId)
        ]);

        setRecentPlayers(recent);
        setGameStats(stats);
        setTotalStats(total);
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
      } finally {
        setIsRecentPlayersLoading(false);
      }
    };

    fetchRecentPlayers();
    const interval = setInterval(fetchRecentPlayers, 10000);
    return () => clearInterval(interval);
  }, [gameId, isInitialLoad]);

  return (
    <LeaderboardContainer>
      <PlayerInfoSection>
        <HeaderSection>
        <SectionTitle>Your Info</SectionTitle>
    {isConnected && address && (
      <UserProfile 
        address={address} 
        bazarProfile={bazarProfile}
        onCopyAddress={copyAddressToClipboard}
      />
    )}
        </HeaderSection>
        
        {isConnected && address ? (
          <PlayerInfoContent>
            {isUserStatsLoading || isInitialLoad ? (
              <div style={{ width: '100%' }}>
                <LoadingSection />
              </div>
            ) : (
              address && (
                <PlayerStats>
                  <span>Highest Score: {playerStats.highestScore.toLocaleString()}</span>
                  <span>Total Score: {playerStats.totalScore.toLocaleString()}</span>
                  <span>Games Played: {playerStats.gamesPlayed.toLocaleString()}</span>
                </PlayerStats>
              )
            )}
          </PlayerInfoContent>
        ) : (
          <ConnectPrompt>
            <span>Join the Competition!</span>
            <span>Connect your wallet to track your scores and compete on the leaderboard!</span>
          </ConnectPrompt>
        )}
      </PlayerInfoSection>

      <Section>
        <SectionTitle>Top Players</SectionTitle>
        {totalStats && (
          <StatsContainer>
            <StatBox>
              <div className="value">{totalStats.totalGames.toLocaleString()}</div>
              <div className="label">Total Games</div>
            </StatBox>
            <StatBox>
              <div className="value">{totalStats.totalPlayers.toLocaleString()}</div>
              <div className="label">Total Players</div>
            </StatBox>
            <StatBox>
              <div className="value">{totalStats.totalScore.toLocaleString()}</div>
              <div className="label">Total Score</div>
            </StatBox>
          </StatsContainer>
        )}
        {isTopPlayersLoading || isInitialLoad ? (
              <div style={{ width: '100%' }}>
              <LoadingSection />
              <LoadingSection />
            </div>
        ) : (
          <ScrollableList>
            {topPlayers.map((entry, index) => (
              <PlayerEntry key={`${entry.walletAddress}-${entry.timestamp}`} $highlight={entry.walletAddress === address}>
                <PlayerInfoLeft>
                  <Rank $color={index < 3 ? getBadgeColor(['gold', 'silver', 'bronze'][index] as 'gold' | 'silver' | 'bronze') : undefined}>
                    {index < 3 && <Badge type={['gold', 'silver', 'bronze'][index] as 'gold' | 'silver' | 'bronze'}>●</Badge>}
                    #{index + 1}
                  </Rank>
                  <UserProfile 
        address={entry.walletAddress} 
        onCopyAddress={copyAddressToClipboard}
      />
                </PlayerInfoLeft>
                <PlayerScore>{entry.score.toLocaleString()}</PlayerScore>
              </PlayerEntry>
            ))}
          </ScrollableList>
        )}
      </Section>

      <Section>
        <SectionTitle>Recent Activity</SectionTitle>
        {isRecentPlayersLoading || isInitialLoad ? (
              <div style={{ width: '100%' }}>
              <LoadingSection />
              <LoadingSection />
            </div>
        ) : (
          <ScrollableList>
            {recentPlayers.map((player, index) => {
              console.log('Recent player entry:', {
                player,
                timestamp: player.timestamp,
                formattedTime: formatTimeAgo(player.timestamp)
              });
              return (
                <RecentPlayer 
                  key={`${player.walletAddress}-${player.timestamp}`}
                  $isNew={index === 0 && (Date.now() - new Date(player.timestamp).getTime()) < 30000}
                >

                  <UserProfile 
        address={player.walletAddress} 
        onCopyAddress={copyAddressToClipboard}
      />
                  <RecentPlayerScore>{player.score.toLocaleString()}</RecentPlayerScore>
                  <TimeAgo>{formatTimeAgo(player.timestamp)}</TimeAgo>
                </RecentPlayer>
              );
            })}
          </ScrollableList>
        )}
      </Section>
    </LeaderboardContainer>
  );
};

export default Leaderboard;
