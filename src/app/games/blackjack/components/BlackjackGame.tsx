'use client'

import { useBlackjackGame } from '../hooks/useBlackjackGame'
import { useGameActions } from '../hooks/useGameActions'

import { GameHeader } from './GameHeader'
import { GameBoard } from './GameBoard'
import { BettingPanel } from './BettingPanel'
import { GameControls } from './GameControls'
import { ResultDisplay } from './ResultDisplay'
import { RulesModal } from './RulesModal'
import { GameDisabledOverlay } from './GameDisabledOverlay'

export function BlackjackGame() {
  // Get all game state and helper functions
  const game = useBlackjackGame()

  // Get all game actions
  const actions = useGameActions({
    // Core game state
    playerHand: game.playerHand,
    setPlayerHand: game.setPlayerHand,
    splitHand: game.splitHand,
    setSplitHand: game.setSplitHand,
    dealerHand: game.dealerHand,
    setDealerHand: game.setDealerHand,
    gameState: game.gameState,
    setGameState: game.setGameState,
    result: game.result,
    setResult: game.setResult,
    splitResult: game.splitResult,
    setSplitResult: game.setSplitResult,
    bet: game.bet,
    setBet: game.setBet,
    setSelectedChip: game.setSelectedChip,
    setIsDealing: game.setIsDealing,
    setIsProcessing: game.setIsProcessing,
    setWinAmount: game.setWinAmount,
    setAnimatingResult: game.setAnimatingResult,
    currentBet: game.currentBet,
    setCurrentBet: game.setCurrentBet,
    splitBet: game.splitBet,
    setSplitBet: game.setSplitBet,
    splitBetRef: game.splitBetRef,
    setIsFlippingDealer: game.setIsFlippingDealer,
    setDealerCardFlipped: game.setDealerCardFlipped,
    activeHand: game.activeHand,
    setActiveHand: game.setActiveHand,
    hasSplit: game.hasSplit,
    setHasSplit: game.setHasSplit,
    gameId: game.gameId,
    setGameId: game.setGameId,
    setIsSplitAnimating: game.setIsSplitAnimating,
    setSplitAnimationPhase: game.setSplitAnimationPhase,
    setSplitCards: game.setSplitCards,
    setShowBustIndicator: game.setShowBustIndicator,
    isDoubleDown: game.isDoubleDown,
    setIsDoubleDown: game.setIsDoubleDown,
    mainHandDoubled: game.mainHandDoubled,
    setMainHandDoubled: game.setMainHandDoubled,
    splitHandDoubled: game.splitHandDoubled,
    setSplitHandDoubled: game.setSplitHandDoubled,
    settingsLoading: game.settingsLoading,
    isGameEnabled: game.isGameEnabled,
    userPoints: game.userPoints,
    maxBet: game.maxBet,
    isActionLocked: game.isActionLocked,
    isActionLockedRef: game.isActionLockedRef,
    setServerCanSplit: game.setServerCanSplit,
    setServerCanDouble: game.setServerCanDouble,

    // Helper functions
    playSound: game.playSound,
    addTimer: game.addTimer,
    clearAllTimers: game.clearAllTimers,
    isMounted: game.isMounted,
    calcPayout: game.calcPayout,
    getCombinedResult: game.getCombinedResult,
    updateFromResponse: game.updateFromResponse,
    resetGame: game.resetGame,
    refreshUser: game.refreshUser,

    // Server API functions
    startGame: game.startGame,
    hitAction: game.hitAction,
    standAction: game.standAction,
    doubleAction: game.doubleAction,
    splitAction: game.splitAction
  })

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(180deg, #0d4f3c 0%, #063528 50%, #021f17 100%)'
        }}
      />
      <div
        className="absolute inset-0 -z-10 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 100%)'
        }}
      />

      {/* Game Disabled Overlay */}
      {!game.settingsLoading && !game.isGameEnabled && <GameDisabledOverlay />}

      {/* Header */}
      <GameHeader
        userPoints={game.userPoints}
        soundEnabled={game.soundEnabled}
        onSoundToggle={() => game.setSoundEnabled(!game.soundEnabled)}
        onShowRules={() => game.setShowRules(true)}
        playSound={game.playSound}
      />

      {/* Rules Modal */}
      {game.showRules && <RulesModal onClose={() => game.setShowRules(false)} />}

      {/* Game Area */}
      <div className="flex flex-col items-center min-h-[calc(100vh-120px)] sm:min-h-[calc(100vh-150px)] py-2 sm:py-4 px-2 sm:px-4">
        {/* Game Board */}
        <GameBoard
          dealerHand={game.dealerHand}
          dealerDisplayValue={game.dealerDisplayValue}
          isDealing={game.isDealing}
          isFlippingDealer={game.isFlippingDealer}
          dealerCardFlipped={game.dealerCardFlipped}
          playerHand={game.playerHand}
          playerDisplayValue={game.playerDisplayValue}
          splitHand={game.splitHand}
          splitDisplayValue={game.splitDisplayValue}
          hasSplit={game.hasSplit}
          activeHand={game.activeHand}
          gameState={game.gameState}
          result={game.result}
          splitResult={game.splitResult}
          currentBet={game.currentBet}
          splitBet={game.splitBet}
          isSplitAnimating={game.isSplitAnimating}
          splitAnimationPhase={game.splitAnimationPhase}
          splitCards={game.splitCards}
        />

        {/* Middle Area - Result display */}
        <div className="h-[70px] sm:h-[90px] md:h-[100px] flex items-center justify-center relative w-full">
          {game.displayResult && game.gameState === 'game_over' && (
            <ResultDisplay
              result={game.displayResult}
              winAmount={game.winAmount}
              animatingResult={game.animatingResult}
            />
          )}
        </div>

        {/* Controls */}
        {game.gameState === 'betting' ? (
          <div className="w-full max-w-xl space-y-3 sm:space-y-4 flex-1 flex flex-col justify-end pb-3 sm:pb-4 px-2">
            <BettingPanel
              bet={game.bet}
              maxBet={game.maxBet}
              chips={game.chips}
              selectedChip={game.selectedChip}
              isActionLocked={game.isActionLocked}
              onAddChip={actions.addChip}
              onClearBet={actions.clearBet}
              onDealCards={actions.dealCards}
              userPoints={game.userPoints}
            />
          </div>
        ) : (
          <GameControls
            gameState={game.gameState}
            isActionLocked={game.isActionLocked}
            canDouble={game.canDouble}
            canSplit={game.canSplit}
            displayBet={game.displayBet}
            hasSplit={game.hasSplit}
            currentBet={game.currentBet}
            splitBet={game.splitBet}
            onHit={actions.hit}
            onStand={actions.stand}
            onDoubleDown={actions.doubleDown}
            onSplit={actions.split}
            onNewGame={actions.newGame}
          />
        )}
      </div>
    </div>
  )
}
