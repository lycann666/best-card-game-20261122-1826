// Mouse and keyboard input for Rune Clash. Hit-testing reads the layout render.js draws,
// so a click lands exactly where the card on screen is. The handler owns the selection
// state machine: pick a hand card or a ready creature, then pick its target.
import { attack, endTurn, handCard, legalTargets, playCard, targetsEqual } from './engine.js';
import { layout } from './render.js';

function inside(point, box) {
  return point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h;
}

export function createInput(game, hooks) {
  const state = { selected: null };
  let lastTargetable = [];

  function clearSelection() {
    state.selected = null;
    lastTargetable = [];
  }

  function targetBoxes() {
    const geo = layout(game);
    const boxes = [];
    const pushHero = (side, box) => boxes.push({ target: { type: 'hero', side }, box });
    pushHero('enemy', geo.heroEnemy);
    pushHero('player', geo.heroPlayer);
    geo.boardEnemy.forEach((box, i) => boxes.push({ target: { type: 'creature', side: 'enemy', index: i }, box }));
    geo.boardPlayer.forEach((box, i) => boxes.push({ target: { type: 'creature', side: 'player', index: i }, box }));
    return boxes;
  }

  function tryTarget(point) {
    if (!state.selected) return false;
    const legal = lastTargetable;
    for (const { target, box } of targetBoxes()) {
      if (!inside(point, box)) continue;
      if (!legal.some((t) => targetsEqual(t, target))) continue;
      if (state.selected.kind === 'hand') {
        if (playCard(game, 'player', state.selected.index, target)) {
          hooks.onPlay();
          clearSelection();
          hooks.afterAction();
          return true;
        }
      } else if (state.selected.kind === 'board') {
        if (attack(game, 'player', state.selected.index, target)) {
          hooks.onAttack();
          clearSelection();
          hooks.afterAction();
          return true;
        }
      }
      return false;
    }
    return false;
  }

  function handleClick(point) {
    if (game.over) return;
    if (game.turn !== 'player') return;
    const geo = layout(game);
    if (inside(point, geo.endTurn)) {
      clearSelection();
      endTurn(game);
      hooks.onTurn();
      hooks.afterAction();
      return;
    }
    if (tryTarget(point)) return;
    // Pick a hand card.
    for (let i = 0; i < geo.handPlayer.length; i += 1) {
      if (!inside(point, geo.handPlayer[i])) continue;
      const card = handCard(game, 'player', i);
      if (!card || game.players.player.mana < card.cost) {
        hooks.onDeny();
        return;
      }
      if (card.kind === 'spell' && card.effect.target === 'all-enemy') {
        if (playCard(game, 'player', i, null)) {
          hooks.onPlay();
          hooks.afterAction();
        }
        return;
      }
      state.selected = { kind: 'hand', index: i };
      lastTargetable = legalTargets(game, 'player', i) ?? [];
      hooks.onSelect();
      return;
    }
    // Pick one of our ready creatures to attack with.
    for (let i = 0; i < geo.boardPlayer.length; i += 1) {
      if (!inside(point, geo.boardPlayer[i])) continue;
      const creature = game.players.player.board[i];
      if (!creature.canAttack) {
        hooks.onDeny();
        return;
      }
      state.selected = { kind: 'board', index: i };
      const targets = [{ type: 'hero', side: 'enemy' }];
      game.players.enemy.board.forEach((_, j) => targets.push({ type: 'creature', side: 'enemy', index: j }));
      lastTargetable = targets;
      hooks.onSelect();
      return;
    }
    clearSelection();
  }

  function handleKey(key) {
    if (key === 'Escape') {
      clearSelection();
      return;
    }
    if (key >= '1' && key <= '8') {
      const i = Number(key) - 1;
      if (game.turn === 'player' && !game.over && game.players.player.hand[i]) {
        handleClick({ x: layout(game).handPlayer[i].x + 10, y: layout(game).handPlayer[i].y + 10 });
      }
      return;
    }
    if (key === ' ' || key === 'Spacebar') {
      if (game.turn === 'player' && !game.over) {
        clearSelection();
        endTurn(game);
        hooks.onTurn();
        hooks.afterAction();
      }
    }
  }

  return { state, handleClick, handleKey, clearSelection };
}
