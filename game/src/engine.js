// Rules engine for Rune Clash: a turn-based card duel. The engine holds no drawing or
// input code, so the screenshot autopilot and the human player drive the same functions.
import { buildDeck, cardById, summonCreature } from './cards.js';
import { makeRng, shuffle } from './random.js';

export const MAX_HAND = 8;
export const MAX_BOARD = 5;
export const START_LIFE = 20;
export const MAX_MANA = 10;

function freshSide(name, deck, rng) {
  return {
    name,
    life: START_LIFE,
    maxLife: START_LIFE,
    mana: 0,
    maxMana: 0,
    deck: shuffle(deck, rng),
    hand: [],
    board: [],
    fatigue: 0,
  };
}

export function createGame(seed) {
  const rng = makeRng(seed);
  const game = {
    seed,
    rng,
    round: 1,
    turn: 'player',
    over: false,
    winner: null,
    log: [],
    events: [],
    players: {
      player: freshSide('Lyra, the Ember Scribe', buildDeck(), rng),
      enemy: freshSide('Warden of the Hollow', buildDeck(), rng),
    },
  };
  drawCards(game, 'player', 3);
  drawCards(game, 'enemy', 3);
  beginTurn(game, 'player');
  return game;
}

export function otherSide(side) {
  return side === 'player' ? 'enemy' : 'player';
}

function shortName(side) {
  return side === 'player' ? 'Lyra' : 'Warden';
}

function say(game, text) {
  game.log.push(text);
  if (game.log.length > 40) game.log.shift();
}

function noteEvent(game, kind, detail) {
  game.events.push({ kind, ...detail });
}

export function drawCards(game, side, count) {
  const me = game.players[side];
  for (let i = 0; i < count; i += 1) {
    if (me.hand.length >= MAX_HAND) return;
    if (me.deck.length === 0) {
      me.fatigue += 1;
      damageHero(game, side, me.fatigue, 'fatigue');
      say(game, `${shortName(side)} draws from an empty deck and takes ${me.fatigue} fatigue.`);
      continue;
    }
    me.hand.push(me.deck.pop());
  }
}

/** Start `side`'s turn: refill mana to the round number, refresh attackers, draw one. */
export function beginTurn(game, side) {
  const me = game.players[side];
  me.maxMana = Math.min(MAX_MANA, game.round);
  me.mana = me.maxMana;
  for (const creature of me.board) creature.canAttack = true;
  if (!(game.round === 1 && side === 'player')) drawCards(game, side, 1);
  game.turn = side;
  say(game, `${shortName(side)}'s turn — ${me.mana} mana, round ${game.round}.`);
}

/** End the current turn and hand over to the other side (new round when back to player). */
export function endTurn(game) {
  if (game.over) return;
  const next = otherSide(game.turn);
  if (next === 'player') game.round += 1;
  beginTurn(game, next);
}

export function handCard(game, side, handIndex) {
  return cardById(game.players[side].hand[handIndex]) ?? null;
}

/** Where a hand card may legally point. Null means the card needs no target. */
export function legalTargets(game, side, handIndex) {
  const card = handCard(game, side, handIndex);
  if (!card || card.kind !== 'spell') return null;
  const foe = otherSide(side);
  const effect = card.effect;
  if (effect.target === 'any') {
    const targets = [{ type: 'hero', side: foe }, { type: 'hero', side }];
    game.players[foe].board.forEach((_, i) => targets.push({ type: 'creature', side: foe, index: i }));
    game.players[side].board.forEach((_, i) => targets.push({ type: 'creature', side, index: i }));
    return targets;
  }
  if (effect.target === 'creature') {
    const targets = [];
    game.players[foe].board.forEach((_, i) => targets.push({ type: 'creature', side: foe, index: i }));
    game.players[side].board.forEach((_, i) => targets.push({ type: 'creature', side, index: i }));
    return targets;
  }
  if (effect.target === 'enemy-hero') return [{ type: 'hero', side: foe }];
  if (effect.target === 'self-hero') return [{ type: 'hero', side }];
  return [];
}

function damageCreature(game, side, index, amount, sourceName) {
  const creature = game.players[side].board[index];
  if (!creature) return;
  creature.health -= amount;
  noteEvent(game, 'damage', { side, index, amount });
  say(game, `${sourceName} hits ${creature.name} for ${amount}.`);
  if (creature.health <= 0) {
    game.players[side].board.splice(index, 1);
    say(game, `${creature.name} is destroyed.`);
  }
}

function damageHero(game, side, amount, sourceName) {
  const hero = game.players[side];
  hero.life = Math.max(0, hero.life - amount);
  noteEvent(game, 'hero-damage', { side, amount });
  say(game, `${sourceName} hits ${shortName(side)} for ${amount}.`);
  checkEnd(game);
}

function checkEnd(game) {
  if (game.over) return;
  if (game.players.enemy.life <= 0) {
    game.over = true;
    game.winner = 'player';
    say(game, 'The Warden falls. Lyra wins the duel!');
  } else if (game.players.player.life <= 0) {
    game.over = true;
    game.winner = 'enemy';
    say(game, 'Lyra falls. The Warden wins the duel.');
  }
}

/** Play the hand card at `handIndex`, optionally at `target`. Returns true when played. */
export function playCard(game, side, handIndex, target = null) {
  if (game.over || game.turn !== side) return false;
  const me = game.players[side];
  const card = handCard(game, side, handIndex);
  if (!card || me.mana < card.cost) return false;
  if (card.kind === 'creature' && me.board.length >= MAX_BOARD) return false;
  if (card.kind === 'spell') {
    const legal = legalTargets(game, side, handIndex) ?? [];
    const needsTarget = card.effect.target !== 'all-enemy';
    if (needsTarget && !target) return false;
    if (needsTarget && !legal.some((t) => targetsEqual(t, target))) return false;
  }
  me.hand.splice(handIndex, 1);
  me.mana -= card.cost;
  if (card.kind === 'creature') {
    const creature = summonCreature(card, side);
    me.board.push(creature);
    noteEvent(game, 'summon', { side, name: card.name });
    say(game, `${shortName(side)} summons ${card.name} (${card.attack}/${card.health}).`);
    return true;
  }
  resolveSpell(game, side, card, target);
  return true;
}

function resolveSpell(game, side, card, target) {
  const me = game.players[side];
  const foe = otherSide(side);
  const effect = card.effect;
  noteEvent(game, 'spell', { side, name: card.name });
  if (effect.type === 'heal') {
    me.life = Math.min(me.maxLife, me.life + effect.amount);
    say(game, `${shortName(side)} casts ${card.name} and restores ${effect.amount} life.`);
    return;
  }
  if (effect.type === 'damage-all-enemy') {
    say(game, `${shortName(side)} casts ${card.name}: the ground shakes.`);
    for (let i = game.players[foe].board.length - 1; i >= 0; i -= 1) {
      damageCreature(game, foe, i, effect.amount, card.name);
    }
    return;
  }
  if (effect.type === 'damage' && target) {
    if (target.type === 'hero') damageHero(game, target.side, effect.amount, card.name);
    else damageCreature(game, target.side, target.index, effect.amount, card.name);
  }
}

/** Attack with the board creature at `boardIndex` against `target`. Returns true on success. */
export function attack(game, side, boardIndex, target) {
  if (game.over || game.turn !== side) return false;
  const me = game.players[side];
  const attacker = me.board[boardIndex];
  if (!attacker || !attacker.canAttack) return false;
  if (target.type === 'hero' && target.side === side) return false;
  attacker.canAttack = false;
  noteEvent(game, 'attack', { side, index: boardIndex, target });
  if (target.type === 'hero') {
    damageHero(game, target.side, attacker.attack, attacker.name);
    return true;
  }
  const foe = game.players[target.side];
  const defender = foe.board[target.index];
  if (!defender) return false;
  damageCreature(game, target.side, target.index, attacker.attack, attacker.name);
  damageCreature(game, side, boardIndex, defender.attack, defender.name);
  return true;
}

export function targetsEqual(a, b) {
  if (!a || !b) return false;
  return a.type === b.type && a.side === b.side && (a.index ?? -1) === (b.index ?? -1);
}

/**
 * Plan one side's whole turn as a list of actions the UI (or the screenshot pilot)
 * applies one by one. Policy 'strong' plays sharply, 'weak' plays sloppily, so the
 * screenshot scenes can steer a game toward a win or a loss on purpose.
 */
export function aiPlan(game, side, policy = 'balanced') {
  const me = game.players[side];
  const foe = game.players[otherSide(side)];
  // Play one card: creatures first, then spells, cheapest first. The caller re-plans
  // after the action lands, so the board it sees is always current.
  let best = -1;
  let bestScore = -1;
  for (let i = 0; i < me.hand.length; i += 1) {
    const card = cardById(me.hand[i]);
    if (!card || card.cost > me.mana) continue;
    if (card.kind === 'creature' && me.board.length >= MAX_BOARD) continue;
    let score = card.kind === 'creature' ? 10 + card.attack + card.health : 6;
    score -= card.cost;
    if (card.kind === 'spell' && card.effect?.type === 'heal' && me.life > 26) score = -1;
    if (card.kind === 'spell' && card.effect?.type === 'damage-all-enemy' && foe.board.length < 2) score = -1;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  if (best >= 0) {
    const card = cardById(me.hand[best]);
    let target = null;
    if (card.kind === 'spell') {
      target = chooseSpellTarget(game, side, card, policy);
      if (card.effect.target !== 'all-enemy' && !target) return [];
    }
    return [{ type: 'play', handIndex: best, target }];
  }
  // Attack with the first ready creature.
  for (let i = 0; i < me.board.length; i += 1) {
    const attacker = me.board[i];
    if (!attacker.canAttack) continue;
    const target = chooseAttackTarget(game, side, attacker, policy);
    if (target) return [{ type: 'attack', boardIndex: i, target }];
  }
  return [];
}

function chooseSpellTarget(game, side, card, policy) {
  const foe = otherSide(side);
  const effect = card.effect;
  if (effect.type === 'heal') return { type: 'hero', side };
  if (effect.target === 'enemy-hero') return { type: 'hero', side: foe };
  if (effect.target === 'all-enemy') return null;
  const foes = game.players[foe].board;
  if (foes.length === 0) return { type: 'hero', side: foe };
  let best = 0;
  for (let i = 1; i < foes.length; i += 1) {
    const better = policy === 'weak' ? foes[i].health < foes[best].health : foes[i].attack > foes[best].attack;
    if (better) best = i;
  }
  return { type: 'creature', side: foe, index: best };
}

function chooseAttackTarget(game, side, attacker, policy) {
  const foe = otherSide(side);
  const enemyHero = game.players[foe];
  const enemyBoard = enemyHero.board;
  if (policy !== 'weak' && attacker.attack >= enemyHero.life) return { type: 'hero', side: foe };
  if (policy === 'weak' && enemyBoard.length > 0) {
    return { type: 'creature', side: foe, index: 0 };
  }
  for (let i = 0; i < enemyBoard.length; i += 1) {
    const defender = enemyBoard[i];
    if (defender.health <= attacker.attack && defender.attack < attacker.health) {
      return { type: 'creature', side: foe, index: i };
    }
  }
  if (policy === 'weak' && enemyBoard.length > 0 && game.rng() < 0.5) {
    return { type: 'creature', side: foe, index: Math.floor(game.rng() * enemyBoard.length) };
  }
  return { type: 'hero', side: foe };
}

/** Apply one planned action; returns true when it changed the game. */
export function applyAction(game, action) {
  if (action.type === 'play') return playCard(game, game.turn, action.handIndex, action.target ?? null);
  if (action.type === 'attack') return attack(game, game.turn, action.boardIndex, action.target);
  if (action.type === 'end') {
    endTurn(game);
    return true;
  }
  return false;
}
