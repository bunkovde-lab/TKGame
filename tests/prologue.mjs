import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({ window: {} });
for (const file of ['content.js', 'engine.js']) {
  const url = new URL(`../site/prologue/${file}`, import.meta.url);
  vm.runInContext(readFileSync(url, 'utf8'), context, { filename: file });
}
const { PROLOGUE_CONTENT: content, PROLOGUE_ENGINE: engine } = context.window;

function createGame(state = engine.fresh()) {
  let current = state;
  return {
    get state() { return current; },
    do(action, value, expected = true) {
      const result = engine.dispatch(current, action, value);
      assert.equal(result.ok, expected, `${action} ${JSON.stringify(value)}: ${result.message}`);
      current = result.state;
      return current;
    }
  };
}

function proceedToOffice(game) {
  assert.equal(game.state.intro, 0);
  for (let frame = 1; frame <= content.intro.length; frame++) {
    game.do('next-intro');
    assert.equal(game.state.intro, frame);
  }
  assert.equal(game.state.room, 'office');
}

assert.equal(content.intro.length, 4);
assert.deepEqual([...engine.rooms].sort(), Object.keys(content.rooms).sort());
for (const [id, crew] of Object.entries(content.crew)) {
  assert.ok(engine.rooms.includes(crew.room), id);
  assert.ok(crew.topics.length >= 2, id);
}
assert.equal(engine.restore({ version: -1, docked: true }).docked, false);
assert.equal(engine.restore({ version: 1, room: 'unknown', tick: -3 }).room, 'office');

const game = createGame();
game.do('accept', undefined, false);
proceedToOffice(game);
game.do('dock', undefined, false);
game.do('accept', undefined, false);
game.do('accept', 'law');
assert.equal(game.state.accepted, true);
assert.equal(game.state.reply, 'law');
assert.equal(game.state.path.law, 1);
assert.equal(game.state.trust.irena, 1);
assert.equal(game.state.trust.mara, 0);
game.do('accept', 'calc', false);

game.do('take', 'sample', false);
game.do('take', 'badge');
game.do('take', 'badge', false);
game.do('inspect', 'badge');
assert.ok(game.state.inventory.includes('badge'));
assert.ok(game.state.inspected.includes('badge'));
game.do('use', 'badge', false);
assert.equal(game.state.reader, false);

game.do('move', 'lab');
game.do('move', 'airlock', false);
game.do('talk', 'rein', false);
game.do('calibrate', 'baseline', false);
game.do('talk', 'corvin');
game.do('topic', 0);
assert.equal(game.state.crew, 'corvin');
assert.equal(game.state.pose, content.crew.corvin.topics[0].pose);
game.do('end-talk');
game.do('take', 'sample');
game.do('use', 'sample');
const beforeCalibration = game.state;
game.do('calibrate', 'noise', false);
assert.equal(game.state, beforeCalibration);
assert.equal(game.state.lab, false);
game.do('calibrate', 'baseline');
assert.equal(game.state.lab, true);
assert.ok(game.state.documents.includes('lab'));

game.do('move', 'office');
game.do('topic', 0, false);
game.do('read', 'manifestPort');
game.do('read', 'manifestInternal');
const link = (a, b, kind) => ({ a, b, kind });
game.do('deduce', { links: [link('voyage', 'voyage', 'same')] }, false);
game.do('deduce', { links: [link('route', 'route', 'same'), link('time', 'time', 'diff')] }, false);
game.do('deduce', { links: [link('voyage', 'voyage', 'same'), link('voyage', 'voyage', 'same')] }, false);
game.do('deduce', { links: [link('voyage', 'voyage', 'diff'), link('cargo', 'cargo', 'same')] }, false);
assert.equal(game.state.deduction, false);
game.do('trace');
assert.equal(game.state.safeFound, true);
game.do('unlock', [6, 9, 5], false);
assert.equal(game.state.safeOpen, false);
game.do('unlock', engine.safeCode);
assert.equal(game.state.safeOpen, true);
assert.ok(game.state.documents.includes('dalNote'));
game.do('unlock', engine.safeCode, false);
game.do('deduce', { links: [link('cargo', 'cargo', 'diff'), link('voyage', 'voyage', 'same')] });
assert.equal(game.state.deduction, true);
game.do('move', 'analysis');
game.do('assign');
assert.equal(game.state.task.done, false);
const stored = JSON.parse(JSON.stringify(game.state));
const reloaded = createGame(engine.restore(stored));
assert.equal(reloaded.state.task.due, stored.task.due);
assert.equal(reloaded.state.room, 'analysis');
assert.ok(reloaded.state.inventory.includes('badge'));
assert.equal(reloaded.state.safeOpen, true);
assert.equal(reloaded.state.reply, 'law');
assert.equal(reloaded.state.trust.irena, 1);
assert.equal(reloaded.state.lab, true);
assert.equal(reloaded.state.deduction, true);

for (let i = 0; i < 4 && !reloaded.state.task.done; i++) reloaded.do('wait');
assert.equal(reloaded.state.task.done, true);
assert.ok(reloaded.state.documents.includes('analysis'));
reloaded.do('move', 'office');
reloaded.do('move', 'cockpit');
reloaded.do('nav');
reloaded.do('dock', undefined, false);
assert.equal(reloaded.state.docked, false);
reloaded.do('move', 'office');
reloaded.do('move', 'airlock');
reloaded.do('use', 'badge');
assert.equal(reloaded.state.reader, true);
reloaded.do('move', 'office');
reloaded.do('move', 'cockpit');
assert.equal(engine.dockReady(reloaded.state), true);
reloaded.do('dock');
assert.equal(reloaded.state.docked, true);
assert.equal(engine.restore(JSON.parse(JSON.stringify(reloaded.state))).docked, true);
reloaded.do('move', 'office', false);
assert.equal(reloaded.state.room, 'cockpit');

const direct = createGame();
proceedToOffice(direct);
direct.do('accept', 'mercy');
assert.equal(direct.state.trust.corvin, 1);
direct.do('take', 'badge');
direct.do('move', 'airlock');
direct.do('use', 'badge');
direct.do('move', 'office');
direct.do('move', 'cockpit');
direct.do('nav');
const beforeIncompleteDock = direct.state;
direct.do('dock', undefined, false);
assert.equal(direct.state, beforeIncompleteDock);
assert.equal(direct.state.docked, false);
assert.equal(direct.state.lab, false);
assert.equal(direct.state.deduction, false);
assert.equal(direct.state.task, null);

console.log('PASS: reply path and trust, desk links, Dal safe, introduction, room and item gates, crew pose, lab retry, deduction retry, timed assignment, save restore, gated docking, blocked incomplete route');
