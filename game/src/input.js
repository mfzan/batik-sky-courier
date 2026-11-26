// Keyboard + mouse input. Tracks held keys and edge presses.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set(); // edge-triggered, consumed each frame
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseActive = false;
    this.anyKey = false;
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      this.anyKey = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - r.left) / r.width - 0.5;
      this.mouseY = (e.clientY - r.top) / r.height - 0.5;
      this.mouseActive = true;
    });
    canvas.addEventListener('mouseleave', () => { this.mouseActive = false; });
    window.addEventListener('blur', () => this.keys.clear());
  }

  held(code) { return this.keys.has(code); }
  wasPressed(code) { return this.pressed.has(code); }
  consume() { this.pressed.clear(); }

  // Normalised control axes: pitch -1..1 (up positive), roll -1..1, throttle delta.
  axes() {
    let pitch = 0;
    let roll = 0;
    if (this.held('ArrowUp') || this.held('KeyW')) pitch += 1;
    if (this.held('ArrowDown') || this.held('KeyS')) pitch -= 1;
    if (this.held('ArrowLeft') || this.held('KeyA')) roll -= 1;
    if (this.held('ArrowRight') || this.held('KeyD')) roll += 1;
    let throttle = 0;
    if (this.held('ShiftLeft') || this.held('ShiftRight')) throttle += 1;
    if (this.held('ControlLeft') || this.held('ControlRight')) throttle -= 1;
    // W/S double as throttle when used with Shift semantics is confusing;
    // keep arrows/WASD for pitch-roll only, Shift/Ctrl for throttle.
    const flaps = this.held('Space');
    let mouseRoll = 0;
    let mousePitch = 0;
    if (this.mouseActive) {
      mouseRoll = Math.max(-1, Math.min(1, this.mouseX * 1.4));
      mousePitch = Math.max(-1, Math.min(1, -this.mouseY * 1.2));
    }
    return { pitch, roll, throttle, flaps, mouseRoll, mousePitch };
  }
}
