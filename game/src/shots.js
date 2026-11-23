// Screenshot scenes for Rune Clash: each one stages a real game through the engine's
// own rules and autopilot, then hands the finished state to the renderer. The same seed
// always stages the same frame, so the screenshots are reproducible.
import { aiPlan, applyAction, createGame, endTurn } from './engine.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Play one side's turn to completion through the planner, action by action. */
function driveTurn(game, policy) {
  const side = game.turn;
  let guard = 0;
  while (!game.over && guard < 40) {
    guard += 1;
    const plan = aiPlan(game, side, policy);
    if (plan.length === 0) break;
    if (!applyAction(game, plan[0])) break;
  }
  if (!game.over) endTurn(game);
}

/** Drive up to `halfTurns` turns (both sides alternating), or until the game ends. */
function drive(game, playerPolicy, enemyPolicy, halfTurns) {
  let turns = 0;
  while (!game.over && turns < halfTurns) {
    driveTurn(game, game.turn === 'player' ? playerPolicy : enemyPolicy);
    turns += 1;
  }
  return game;
}

/** Last resort for the end screens: stage the closing blow through the log, not the rules. */
function stageEnding(game, winner) {
  const loser = winner === 'player' ? 'enemy' : 'player';
  game.players[loser].life = 0;
  game.over = true;
  game.winner = winner;
  game.log.push(
    winner === 'player'
      ? 'The Warden falls. Lyra wins the duel!'
      : 'Lyra falls. The Warden wins the duel.',
  );
}

/**
 * Set the game up for the named scene and return the screen to draw over it.
 * Scenes: title, play, win, loss. Any other name is the title.
 */
export function stageShot(name, seed) {
  const game = createGame(seed);
  if (name === 'play') {
    drive(game, 'balanced', 'balanced', 8);
    return { game, screen: SCREEN_PLAY };
  }
  if (name === 'win') {
    drive(game, 'strong', 'weak', 60);
    if (!game.over) stageEnding(game, 'player');
    return { game, screen: SCREEN_OVER };
  }
  if (name === 'loss' || name === 'end') {
    drive(game, 'weak', 'strong', 60);
    if (!game.over) stageEnding(game, 'enemy');
    return { game, screen: SCREEN_OVER };
  }
  // Title: a real table mid-game, dimmed behind the title panel.
  drive(game, 'balanced', 'balanced', 4);
  return { game, screen: SCREEN_TITLE };
}
