// Canvas drawing for Rune Clash: the felt table, both heroes, both boards, both hands,
// and the title / win / loss screens. All geometry lives here, so input.js can hit-test
// against the same layout this file draws.
import { ELEMENTS, cardById } from './cards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

export const VIEW_W = 1280;
export const VIEW_H = 720;
const CARD_W = 112;
const CARD_H = 142;
const BOARD_Y_ENEMY = 148;
const BOARD_Y_PLAYER = 318;
const HAND_Y = 532;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function glyph(ctx, kind, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.lineJoin = 'round';
  if (kind === 'flame') {
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.bezierCurveTo(size * 0.7, -size * 0.2, size * 0.55, size * 0.55, 0, size * 0.7);
    ctx.bezierCurveTo(-size * 0.55, size * 0.55, -size * 0.7, -size * 0.2, 0, -size);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,220,120,0.85)';
    ctx.beginPath();
    ctx.arc(0, size * 0.15, size * 0.32, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'drop') {
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.bezierCurveTo(size * 0.75, -size * 0.1, size * 0.6, size * 0.7, 0, size * 0.7);
    ctx.bezierCurveTo(-size * 0.6, size * 0.7, -size * 0.75, -size * 0.1, 0, -size);
    ctx.fill();
  } else if (kind === 'leaf') {
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.bezierCurveTo(size * 0.9, -size * 0.3, size * 0.7, size * 0.8, 0, size * 0.8);
    ctx.bezierCurveTo(-size * 0.7, size * 0.8, -size * 0.9, -size * 0.3, 0, -size);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.7);
    ctx.lineTo(0, size * 0.7);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-size, size * 0.7);
    ctx.lineTo(-size * 0.15, -size * 0.8);
    ctx.lineTo(size * 0.25, size * 0.1);
    ctx.lineTo(size * 0.6, -size * 0.4);
    ctx.lineTo(size, size * 0.7);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function heart(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, size * 0.7);
  ctx.bezierCurveTo(-size, 0, -size * 0.5, -size * 0.8, 0, -size * 0.25);
  ctx.bezierCurveTo(size * 0.5, -size * 0.8, size, 0, 0, size * 0.7);
  ctx.fill();
  ctx.restore();
}

/** Positions of every clickable thing, in view coordinates. */
export function layout(game) {
  const hand = (side) => {
    const cards = game.players[side].hand;
    const n = cards.length;
    const spacing = Math.min(CARD_W + 6, 660 / Math.max(1, n));
    const total = spacing * (n - 1);
    return cards.map((_, i) => {
      const x = VIEW_W / 2 - total / 2 + i * spacing;
      const arc = Math.pow(i - (n - 1) / 2, 2) * 2.2;
      return { x, y: HAND_Y + arc, w: CARD_W, h: CARD_H };
    });
  };
  const board = (side) => {
    const creatures = game.players[side].board;
    const n = creatures.length;
    const spacing = CARD_W + 8;
    const total = spacing * n - 8;
    return creatures.map((_, i) => ({
      x: VIEW_W / 2 - total / 2 + i * spacing,
      y: side === 'enemy' ? BOARD_Y_ENEMY : BOARD_Y_PLAYER,
      w: CARD_W,
      h: CARD_H,
    }));
  };
  const backs = game.players.enemy.hand.length;
  const backSpacing = Math.min(46, 320 / Math.max(1, backs));
  return {
    handPlayer: hand('player'),
    boardPlayer: board('player'),
    boardEnemy: board('enemy'),
    enemyBacks: Array.from({ length: backs }, (_, i) => ({
      x: 880 + i * backSpacing, y: 18, w: 62, h: 84,
    })),
    heroEnemy: { x: 66, y: 22, w: 300, h: 104 },
    heroPlayer: { x: 66, y: 470, w: 300, h: 104 },
    endTurn: { x: 1090, y: 600, w: 150, h: 56 },
    mute: { x: 1236, y: 12, w: 32, h: 32 },
  };
}

function drawTable(ctx, time) {
  const g = ctx.createRadialGradient(640, 340, 80, 640, 360, 780);
  g.addColorStop(0, '#1d5c33');
  g.addColorStop(0.6, '#14452a');
  g.addColorStop(1, '#0a2417');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, VIEW_W - 20, VIEW_H - 20);
  ctx.strokeStyle = 'rgba(201,162,39,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(640, 360, 250, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(640, 360, 120, 0, Math.PI * 2);
  ctx.stroke();
  // faint rune ring in the middle of the table
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = '#e8d27a';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + time * 0.00002;
    ctx.beginPath();
    ctx.moveTo(640 + Math.cos(a) * 150, 360 + Math.sin(a) * 150);
    ctx.lineTo(640 + Math.cos(a + 0.5) * 190, 360 + Math.sin(a + 0.5) * 190);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCardFace(ctx, def, x, y, opts = {}) {
  const el = ELEMENTS[def.element];
  const lift = opts.selected ? -26 : opts.playable ? -6 : 0;
  const yy = y + lift;
  ctx.save();
  if (opts.selected || opts.targetable) {
    ctx.shadowColor = opts.targetable ? '#ffd94a' : '#ffffff';
    ctx.shadowBlur = 22;
  }
  if (opts.dimmed) ctx.globalAlpha = 0.55;
  roundRect(ctx, x, yy, CARD_W, CARD_H, 10);
  ctx.fillStyle = '#f7efdc';
  ctx.fill();
  ctx.lineWidth = opts.selected ? 3 : 2;
  ctx.strokeStyle = opts.selected ? '#ffd94a' : el.dark;
  ctx.stroke();
  ctx.restore();
  ctx.save();
  if (opts.dimmed) ctx.globalAlpha = 0.55;
  // header band with element colour, glyph and name
  ctx.fillStyle = el.color;
  roundRect(ctx, x + 3, yy + 3, CARD_W - 6, 26, 7);
  ctx.fill();
  glyph(ctx, el.glyph, x + 16, yy + 16, 9, '#ffffff');
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${def.name.length > 14 ? 11 : 13}px Georgia, serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.name, x + 28, yy + 17, CARD_W - 34);
  // art panel: big element glyph on a tinted field
  ctx.fillStyle = el.light;
  ctx.globalAlpha *= 0.35;
  roundRect(ctx, x + 8, yy + 34, CARD_W - 16, 58, 6);
  ctx.fill();
  ctx.globalAlpha = opts.dimmed ? 0.55 : 1;
  glyph(ctx, el.glyph, x + CARD_W / 2, yy + 63, 24, el.color);
  // rules text
  ctx.fillStyle = '#3a2f22';
  ctx.font = '11px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  wrapText(ctx, def.text, x + CARD_W / 2, yy + 98, CARD_W - 16, 13);
  // cost gem, attack and health pips
  pip(ctx, x + 14, yy + 14, 13, '#2f6fd0', String(def.cost), 15);
  if (def.kind === 'creature') {
    pip(ctx, x + 16, yy + CARD_H - 16, 14, '#c0392b', String(def.attack), 16);
    pip(ctx, x + CARD_W - 16, yy + CARD_H - 16, 14, '#2e7d32', String(def.health), 16);
  } else {
    ctx.fillStyle = '#7b5ea7';
    ctx.font = 'bold 12px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPELL', x + CARD_W / 2, yy + CARD_H - 14);
  }
  if (opts.dazed) {
    ctx.fillStyle = 'rgba(20,20,40,0.45)';
    roundRect(ctx, x, yy, CARD_W, CARD_H, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('RESTING', x + CARD_W / 2, yy + CARD_H / 2);
  }
  ctx.restore();
}

function wrapText(ctx, text, cx, y, maxW, lineH) {
  const words = text.split(' ');
  const lines = [''];
  for (const word of words) {
    const trial = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${word}` : word;
    if (ctx.measureText(trial).width > maxW && lines[lines.length - 1]) lines.push(word);
    else lines[lines.length - 1] = trial;
  }
  lines.slice(0, 2).forEach((line, i) => ctx.fillText(line, cx, y + i * lineH));
}

function pip(ctx, x, y, r, color, text, fontSize) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${fontSize}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
  ctx.restore();
}

function drawCardBack(ctx, x, y, w, h) {
  roundRect(ctx, x, y, w, h, 8);
  ctx.fillStyle = '#2b2a55';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#c9a227';
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.28, 0, Math.PI * 2);
  ctx.strokeStyle = '#e8d27a';
  ctx.lineWidth = 2;
  ctx.stroke();
  glyph(ctx, 'flame', x + w / 2, y + h / 2, 10, '#e8d27a');
  ctx.restore();
}

function drawHero(ctx, game, side, box, isActive, time) {
  const hero = game.players[side];
  const foe = side === 'enemy';
  ctx.save();
  roundRect(ctx, box.x, box.y, box.w, box.h, 12);
  ctx.fillStyle = isActive ? 'rgba(201,162,39,0.22)' : 'rgba(0,0,0,0.35)';
  ctx.fill();
  ctx.lineWidth = isActive ? 3 : 1;
  ctx.strokeStyle = isActive ? '#ffd94a' : 'rgba(232,210,122,0.6)';
  ctx.stroke();
  // portrait medallion
  const cx = box.x + 46;
  const cy = box.y + box.h / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 34, 0, Math.PI * 2);
  ctx.fillStyle = foe ? '#5b2a68' : '#8a5a1d';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#e8d27a';
  ctx.stroke();
  glyph(ctx, foe ? 'peak' : 'flame', cx, cy, 20, '#f5e6b8');
  // name + life
  ctx.fillStyle = '#f5eeda';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(hero.name, box.x + 92, box.y + 30);
  heart(ctx, box.x + 100, box.y + 62, 13, '#e2483a');
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillText(`${hero.life}`, box.x + 118, box.y + 70);
  ctx.font = '13px Georgia, serif';
  ctx.fillStyle = '#cbbd93';
  ctx.fillText(`/ ${hero.maxLife} life`, box.x + 158, box.y + 68);
  // mana crystals: tighter spacing once the row grows, label right after them
  const manaGap = hero.maxMana > 8 ? 13 : 17;
  for (let i = 0; i < hero.maxMana; i += 1) {
    const mx = box.x + 96 + i * manaGap;
    const my = box.y + 88;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(mx, my - 7);
    ctx.lineTo(mx + 6, my);
    ctx.lineTo(mx, my + 7);
    ctx.lineTo(mx - 6, my);
    ctx.closePath();
    ctx.fillStyle = i < hero.mana ? '#4aa8ff' : 'rgba(120,140,170,0.4)';
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#cbbd93';
  ctx.font = '12px Georgia, serif';
  ctx.fillText(`${hero.mana}/${hero.maxMana} mana`, box.x + 96 + hero.maxMana * manaGap + 6, box.y + 92);
  ctx.restore();
}

function drawButton(ctx, box, label, enabled, pulse) {
  ctx.save();
  if (pulse) {
    ctx.shadowColor = '#ffd94a';
    ctx.shadowBlur = 16 + 6 * Math.sin(Date.now() / 300);
  }
  roundRect(ctx, box.x, box.y, box.w, box.h, 10);
  ctx.fillStyle = enabled ? '#c9a227' : '#5a5344';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#f5e6b8';
  ctx.stroke();
  ctx.fillStyle = enabled ? '#241d08' : '#cfc8b4';
  ctx.font = 'bold 19px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, box.x + box.w / 2, box.y + box.h / 2 + 1);
  ctx.restore();
}

function drawLog(ctx, game) {
  ctx.save();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.font = '12px Georgia, serif';
  const lines = game.log.slice(-4);
  lines.forEach((line, i) => {
    ctx.globalAlpha = 0.45 + (0.55 * (i + 1)) / lines.length;
    ctx.fillStyle = '#e8dfc0';
    ctx.fillText(line, 1252, 60 + i * 17, 300);
  });
  ctx.restore();
}

function drawFloaters(ctx, floaters) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of floaters) {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.font = 'bold 26px Georgia, serif';
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y - (1 - f.life) * 40);
  }
  ctx.restore();
}

function drawParticles(ctx, particles) {
  ctx.save();
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size * 0.6);
  }
  ctx.restore();
}

export function drawGame(ctx, ui) {
  const { game, screen, selected, floaters, particles, time, message } = ui;
  const geo = layout(game);
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawTable(ctx, time);
  if (screen === SCREEN_TITLE) {
    drawPlayTable(ctx, game, geo, ui, true);
    drawTitle(ctx, time);
    drawFloaters(ctx, floaters);
    drawParticles(ctx, particles);
    return;
  }
  drawPlayTable(ctx, game, geo, ui, false);
  if (screen === SCREEN_OVER) drawOver(ctx, game, time);
  drawFloaters(ctx, floaters);
  drawParticles(ctx, particles);
  if (message) {
    ctx.save();
    ctx.font = 'bold 18px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(message, VIEW_W / 2, 500);
    ctx.restore();
  }
}

function drawPlayTable(ctx, game, geo, ui, dimmed) {
  const { selected, time } = ui;
  ctx.save();
  if (dimmed) ctx.globalAlpha = 0.45;
  drawHero(ctx, game, 'enemy', geo.heroEnemy, game.turn === 'enemy' && !game.over, time);
  drawHero(ctx, game, 'player', geo.heroPlayer, game.turn === 'player' && !game.over, time);
  // enemy hand, face down
  ctx.fillStyle = '#e8dfc0';
  ctx.font = '13px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Warden's hand · ${game.players.enemy.hand.length} cards`, 880, 116);
  geo.enemyBacks.forEach((b) => drawCardBack(ctx, b.x, b.y, b.w, b.h));
  // boards
  game.players.enemy.board.forEach((creature, i) => {
    const pos = geo.boardEnemy[i];
    drawCardFace(ctx, creature, pos.x, pos.y, {
      targetable: selected?.kind === 'attack-target' || selected?.kind === 'spell-target',
    });
  });
  game.players.player.board.forEach((creature, i) => {
    const pos = geo.boardPlayer[i];
    drawCardFace(ctx, creature, pos.x, pos.y, {
      selected: selected?.kind === 'board' && selected.index === i,
      dazed: !creature.canAttack,
    });
  });
  // player hand
  game.players.player.hand.forEach((cardId, i) => {
    const pos = geo.handPlayer[i];
    const def = { ...cardById(cardId) };
    drawCardFace(ctx, def, pos.x, pos.y, {
      selected: selected?.kind === 'hand' && selected.index === i,
      playable: game.players.player.mana >= def.cost && game.turn === 'player' && !game.over,
      dimmed: game.players.player.mana < def.cost,
    });
  });
  // labels and turn controls
  ctx.fillStyle = '#e8dfc0';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(`ROUND ${game.round}`, VIEW_W / 2, 24);
  ctx.font = '13px Georgia, serif';
  ctx.fillText('Your hand — click a card, then a target', VIEW_W / 2, 700);
  drawButton(ctx, geo.endTurn, game.turn === 'player' && !game.over ? 'END TURN' : 'WARDEN…', game.turn === 'player' && !game.over, game.turn === 'player' && !game.over);
  drawLog(ctx, game);
  ctx.restore();
}

function drawTitle(ctx, time) {
  ctx.save();
  ctx.fillStyle = 'rgba(6,20,12,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const bob = Math.sin(time / 500) * 6;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 84px Georgia, serif';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 18;
  ctx.fillText('RUNE CLASH', VIEW_W / 2, 210 + bob);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#f5eeda';
  ctx.font = 'italic 24px Georgia, serif';
  ctx.fillText('A duel of ember, tide, leaf and stone', VIEW_W / 2, 258 + bob);
  ctx.font = '17px Georgia, serif';
  ctx.fillStyle = '#d9cfae';
  ctx.fillText('Outwit the Warden of the Hollow — play creatures, cast spells,', VIEW_W / 2, 330);
  ctx.fillText('and bring their 20 life down to zero before yours falls.', VIEW_W / 2, 356);
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 24px Georgia, serif';
  const pulse = 0.7 + 0.3 * Math.sin(time / 350);
  ctx.globalAlpha = pulse;
  ctx.fillText('CLICK OR PRESS ENTER TO DUEL', VIEW_W / 2, 440);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#bdb28c';
  ctx.font = '15px Georgia, serif';
  ctx.fillText('Mouse: click a card, then its target  ·  Keys 1–8: pick a card  ·  Space: end turn  ·  M: sound', VIEW_W / 2, 500);
  ctx.fillText('An original card game — no network, no account, just the table.', VIEW_W / 2, 528);
  ctx.restore();
}

function drawOver(ctx, game, time) {
  const won = game.winner === 'player';
  ctx.save();
  ctx.fillStyle = won ? 'rgba(20,50,16,0.78)' : 'rgba(50,12,10,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#ffd94a' : '#ff8a7a';
  ctx.font = 'bold 92px Georgia, serif';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 20;
  ctx.fillText(won ? 'VICTORY!' : 'DEFEAT', VIEW_W / 2, 300);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#f5eeda';
  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillText(
    won ? 'The Warden bows. The table is yours, Lyra.' : 'The Warden keeps the table… this time.',
    VIEW_W / 2,
    352,
  );
  ctx.font = '19px Georgia, serif';
  ctx.fillStyle = '#d9cfae';
  ctx.fillText(
    `Final life — You ${game.players.player.life} · Warden ${game.players.enemy.life} · Round ${game.round}`,
    VIEW_W / 2,
    400,
  );
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin(time / 350);
  ctx.fillText('PRESS ENTER TO DUEL AGAIN', VIEW_W / 2, 470);
  ctx.restore();
}
