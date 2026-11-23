// Card catalogue for Rune Clash: every card is an original design with its own name,
// element, cost, and numbers. Four elements act as the suits: Ember, Tide, Leaf, Stone.
// Creatures carry attack / health; spells carry one effect each.
export const ELEMENTS = {
  ember: { name: 'Ember', color: '#e2483a', dark: '#8f1d12', light: '#ff8a6a', glyph: 'flame' },
  tide: { name: 'Tide', color: '#2f7fd0', dark: '#123f6e', light: '#7cc0ff', glyph: 'drop' },
  leaf: { name: 'Leaf', color: '#3f9e4d', dark: '#1c5a26', light: '#8ed598', glyph: 'leaf' },
  stone: { name: 'Stone', color: '#c98f2e', dark: '#6e4c12', light: '#f2c96b', glyph: 'peak' },
};

export const CARD_KINDS = { CREATURE: 'creature', SPELL: 'spell' };

/** All 16 distinct cards. `id` is stable; `count` says how many copies go in a deck. */
export const CATALOG = [
  { id: 'ember-imp', name: 'Ember Imp', element: 'ember', kind: 'creature', cost: 1, attack: 2, health: 1, text: 'A quick spark with a sharp bite.', count: 2 },
  { id: 'tide-sprite', name: 'Tide Sprite', element: 'tide', kind: 'creature', cost: 1, attack: 1, health: 2, text: 'Slips past every guard.', count: 2 },
  { id: 'thorn-pup', name: 'Thorn Pup', element: 'leaf', kind: 'creature', cost: 2, attack: 2, health: 3, text: 'Grows thorns when cornered.', count: 2 },
  { id: 'stone-golem', name: 'Stone Golem', element: 'stone', kind: 'creature', cost: 3, attack: 2, health: 5, text: 'A wall that learned to walk.', count: 2 },
  { id: 'ember-drake', name: 'Ember Drake', element: 'ember', kind: 'creature', cost: 4, attack: 4, health: 3, text: 'Its breath leaves embers behind.', count: 1 },
  { id: 'tide-serpent', name: 'Tide Serpent', element: 'tide', kind: 'creature', cost: 4, attack: 3, health: 5, text: 'Coils around the whole table.', count: 1 },
  { id: 'leaf-warden', name: 'Leaf Warden', element: 'leaf', kind: 'creature', cost: 5, attack: 5, health: 5, text: 'The forest answers her call.', count: 1 },
  { id: 'mountain-colossus', name: 'Mountain Colossus', element: 'stone', kind: 'creature', cost: 6, attack: 6, health: 7, text: 'It was a mountain first.', count: 1 },
  { id: 'spark-burst', name: 'Spark Burst', element: 'ember', kind: 'spell', cost: 2, text: 'Deal 3 damage to any target.', effect: { type: 'damage', amount: 3, target: 'any' }, count: 2 },
  { id: 'healing-spring', name: 'Healing Spring', element: 'tide', kind: 'spell', cost: 2, text: 'Restore 6 life to your hero.', effect: { type: 'heal', amount: 6, target: 'self-hero' }, count: 2 },
  { id: 'root-snare', name: 'Root Snare', element: 'leaf', kind: 'spell', cost: 2, text: 'Deal 2 damage to a creature.', effect: { type: 'damage', amount: 2, target: 'creature' }, count: 2 },
  { id: 'quake-slam', name: 'Quake Slam', element: 'stone', kind: 'spell', cost: 3, text: 'Deal 2 damage to all enemy creatures.', effect: { type: 'damage-all-enemy', amount: 2, target: 'all-enemy' }, count: 1 },
  { id: 'ember-nova', name: 'Ember Nova', element: 'ember', kind: 'spell', cost: 5, text: 'Deal 5 damage to the enemy hero.', effect: { type: 'damage', amount: 5, target: 'enemy-hero' }, count: 1 },
];

export function cardById(id) {
  return CATALOG.find((card) => card.id === id) ?? null;
}

/** A fresh 20-card deck (copies per `count`), as card ids. */
export function buildDeck() {
  const deck = [];
  for (const card of CATALOG) {
    for (let i = 0; i < card.count; i += 1) deck.push(card.id);
  }
  return deck;
}

/** A live creature on the board, copied from its card definition. */
export function summonCreature(cardDef, owner) {
  return {
    uid: `${owner}-${cardDef.id}-${Math.floor(Math.random() * 1e9)}`,
    cardId: cardDef.id,
    name: cardDef.name,
    element: cardDef.element,
    cost: cardDef.cost,
    kind: cardDef.kind,
    attack: cardDef.attack,
    health: cardDef.health,
    maxHealth: cardDef.health,
    text: cardDef.text,
    owner,
    canAttack: false,
    justPlayed: true,
  };
}
