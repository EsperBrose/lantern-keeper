// Online co-op connection using PeerJS (WebRTC). The two devices talk directly;
// PeerJS's free public server only helps them find each other by room code.
const PREFIX = 'lantern-keeper-v1-';
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O (look like 1 and 0)

let peer = null;
let conn = null;

function randomCode() {
  let s = '';
  for (let i = 0; i < 4; i++) s += LETTERS[Math.floor(Math.random() * LETTERS.length)];
  return s;
}

function friendlyError(err) {
  switch (err && err.type) {
    case 'peer-unavailable':
      return 'No game found with that code';
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed':
      return 'Could not reach the connection server - check your internet';
    case 'browser-incompatible':
      return 'This browser does not support online play';
    default:
      return 'Connection problem - try again';
  }
}

function wire(c, handlers) {
  conn = c;
  c.on('open', () => handlers.onConnect());
  c.on('data', (msg) => handlers.onData(msg));
  c.on('close', () => handlers.onClose());
  c.on('error', () => handlers.onClose());
}

// handlers: { onCode(code), onConnect(), onData(msg), onClose(), onError(text) }
export function hostGame(handlers) {
  leave();
  if (!window.Peer) {
    handlers.onError('Online play could not load - check your internet');
    return;
  }
  const code = randomCode();
  peer = new window.Peer(PREFIX + code, { debug: 0 });
  peer.on('open', () => handlers.onCode(code));
  peer.on('connection', (c) => {
    if (conn) {
      c.close(); // only one friend per game
      return;
    }
    wire(c, handlers);
  });
  peer.on('error', (err) => {
    if (err.type === 'unavailable-id') hostGame(handlers); // code taken - pick another
    else handlers.onError(friendlyError(err));
  });
}

// handlers: { onConnect(), onData(msg), onClose(), onError(text) }
export function joinGame(code, handlers) {
  leave();
  if (!window.Peer) {
    handlers.onError('Online play could not load - check your internet');
    return;
  }
  peer = new window.Peer({ debug: 0 });
  peer.on('open', () => {
    wire(peer.connect(PREFIX + code.toUpperCase(), { reliable: true }), handlers);
  });
  peer.on('error', (err) => handlers.onError(friendlyError(err)));
}

export function send(msg) {
  if (conn && conn.open) conn.send(msg);
}

export function leave() {
  if (conn) conn.close();
  if (peer) peer.destroy();
  conn = null;
  peer = null;
}
