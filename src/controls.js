// Input: keyboard + drag-to-look on desktop, virtual joystick + touch look on
// mobile. Produces a movement vector and look deltas; main.js applies them.

export class Controls {
  constructor(canvas, joystickEl) {
    this.canvas = canvas;
    this.keys = new Set();
    this.move = { x: 0, y: 0 }; // joystick, -1..1
    this.look = { dx: 0, dy: 0 };
    this.enabled = false;
    this.onTap = null; // (clientX, clientY) => void
    this.onHover = null;
    this.onInteract = null;
    this.touch = matchMedia('(pointer: coarse)').matches;
    this.joy = joystickEl;
    this.knob = joystickEl.querySelector('.joy__knob');
    this.pointers = new Map();
    this._bind();
  }

  _bind() {
    addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, select')) return;
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'q', 'e', 'enter'].includes(k)) {
        if (!this.enabled) return;
        if (k.startsWith('arrow')) e.preventDefault();
        this.keys.add(k);
        if ((k === 'e' || k === 'enter') && !e.repeat) this.onInteract?.();
      }
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());

    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      c.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: 0 });
    });
    c.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) {
        if (e.pointerType === 'mouse') this.onHover?.(e.clientX, e.clientY);
        return;
      }
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      p.moved += Math.abs(dx) + Math.abs(dy);
      const k = e.pointerType === 'mouse' ? 0.0042 : 0.0062;
      this.look.dx += dx * k;
      this.look.dy += dy * k;
    });
    const end = (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      this.pointers.delete(e.pointerId);
      if (p.moved < 8 && performance.now() - p.t < 400) this.onTap?.(e.clientX, e.clientY);
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', (e) => this.pointers.delete(e.pointerId));

    // Virtual joystick
    const j = this.joy;
    let jid = null, cx = 0, cy = 0;
    const R = 46;
    j.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      jid = e.pointerId;
      j.setPointerCapture(jid);
      const r = j.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      j.classList.add('active');
      upd(e);
    });
    const upd = (e) => {
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const l = Math.hypot(dx, dy);
      if (l > R) {
        dx = (dx / l) * R;
        dy = (dy / l) * R;
      }
      this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.move.x = dx / R;
      this.move.y = dy / R;
    };
    j.addEventListener('pointermove', (e) => e.pointerId === jid && upd(e));
    const jend = (e) => {
      if (e.pointerId !== jid) return;
      jid = null;
      this.move.x = this.move.y = 0;
      this.knob.style.transform = '';
      j.classList.remove('active');
    };
    j.addEventListener('pointerup', jend);
    j.addEventListener('pointercancel', jend);
  }

  // Returns forward/right input in -1..1 and sprint flag.
  axes() {
    const k = this.keys;
    let f = 0, r = 0;
    if (k.has('w') || k.has('arrowup')) f += 1;
    if (k.has('s') || k.has('arrowdown')) f -= 1;
    if (k.has('d')) r += 1;
    if (k.has('a')) r -= 1;
    let turn = 0;
    if (k.has('arrowleft') || k.has('q')) turn -= 1;
    if (k.has('arrowright')) turn += 1;
    f += -this.move.y;
    r += this.move.x;
    const l = Math.hypot(f, r);
    if (l > 1) {
      f /= l;
      r /= l;
    }
    const joyMag = Math.hypot(this.move.x, this.move.y);
    return { f, r, turn, sprint: k.has('shift') || joyMag > 0.92 };
  }

  consumeLook() {
    const l = { ...this.look };
    this.look.dx = this.look.dy = 0;
    return l;
  }
}
