// Unified input: keyboard (desktop) + virtual joystick & jump button (touch).
// move.x = strafe right (-1..1), move.y = forward (-1..1)
export class Input {
  constructor() {
    this.move = { x: 0, y: 0 };
    this.jumpHeld = false;
    this.jumpPressed = false;   // edge-trigger, consumed each frame by player
    this.isTouch = false;

    this._keys = new Set();
    this._stickPointer = null;
    this._stickOrigin = { x: 0, y: 0 };
    this._stickRadius = 60;

    this._base = document.getElementById('stick-base');
    this._knob = document.getElementById('stick-knob');
    this._jumpBtn = document.getElementById('btn-jump');

    this._bindKeyboard();
    this._bindTouch();
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this._keys.add(e.code);
      if (e.code === 'Space' || e.code === 'KeyZ') {
        this.jumpPressed = true;
        this.jumpHeld = true;
      }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this._keys.delete(e.code);
      if (e.code === 'Space' || e.code === 'KeyZ') this.jumpHeld = false;
    });
    window.addEventListener('blur', () => {
      this._keys.clear();
      this.jumpHeld = false;
    });
  }

  _bindTouch() {
    const onTouchStart = () => {
      if (!this.isTouch) {
        this.isTouch = true;
        document.body.classList.add('touch');
      }
    };
    window.addEventListener('touchstart', onTouchStart, { passive: false });

    // Virtual joystick: appears wherever the left half of the screen is touched.
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      if (e.target === this._jumpBtn) return;
      if (e.clientX > window.innerWidth * 0.55) return;
      if (this._stickPointer !== null) return;
      this._stickPointer = e.pointerId;
      this._stickOrigin = { x: e.clientX, y: e.clientY };
      this._stickRadius = Math.min(window.innerWidth, window.innerHeight) * 0.10 + 30;
      this._showStick(e.clientX, e.clientY, e.clientX, e.clientY);
    });
    window.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this._stickPointer) return;
      let dx = e.clientX - this._stickOrigin.x;
      let dy = e.clientY - this._stickOrigin.y;
      const len = Math.hypot(dx, dy);
      const r = this._stickRadius;
      if (len > r) { dx = dx / len * r; dy = dy / len * r; }
      this.move.x = dx / r;
      this.move.y = -dy / r;   // screen up = forward
      this._showStick(this._stickOrigin.x, this._stickOrigin.y,
                      this._stickOrigin.x + dx, this._stickOrigin.y + dy);
    });
    const endStick = (e) => {
      if (e.pointerId !== this._stickPointer) return;
      this._stickPointer = null;
      this.move.x = 0; this.move.y = 0;
      this._base.style.opacity = '0';
      this._knob.style.opacity = '0';
    };
    window.addEventListener('pointerup', endStick);
    window.addEventListener('pointercancel', endStick);

    // Jump button
    const jb = this._jumpBtn;
    jb.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      jb.classList.add('pressed');
      this.jumpPressed = true;
      this.jumpHeld = true;
    });
    const jumpEnd = (e) => {
      e.preventDefault();
      jb.classList.remove('pressed');
      this.jumpHeld = false;
    };
    jb.addEventListener('pointerup', jumpEnd);
    jb.addEventListener('pointercancel', jumpEnd);
    jb.addEventListener('pointerleave', jumpEnd);
    jb.addEventListener('contextmenu', (e) => e.preventDefault());

    // Block page scroll / pinch zoom while playing.
    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());
  }

  _showStick(bx, by, kx, ky) {
    const b = this._base, k = this._knob;
    b.style.opacity = '1';
    k.style.opacity = '1';
    b.style.left = (bx - b.offsetWidth / 2) + 'px';
    b.style.top  = (by - b.offsetHeight / 2) + 'px';
    k.style.left = (kx - k.offsetWidth / 2) + 'px';
    k.style.top  = (ky - k.offsetHeight / 2) + 'px';
  }

  // Call once per frame; merges keyboard into move and resets edge triggers after read.
  poll() {
    if (this._stickPointer === null) {
      let x = 0, y = 0;
      if (this._keys.has('KeyA') || this._keys.has('ArrowLeft'))  x -= 1;
      if (this._keys.has('KeyD') || this._keys.has('ArrowRight')) x += 1;
      if (this._keys.has('KeyW') || this._keys.has('ArrowUp'))    y += 1;
      if (this._keys.has('KeyS') || this._keys.has('ArrowDown'))  y -= 1;
      const len = Math.hypot(x, y);
      if (len > 1) { x /= len; y /= len; }
      this.move.x = x; this.move.y = y;
    }
  }

  consumeJump() {
    const j = this.jumpPressed;
    this.jumpPressed = false;
    return j;
  }
}
