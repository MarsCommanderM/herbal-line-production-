import { describe, expect, it } from 'vitest';
import { GAMEPAD_BUTTON, normalizeGamepadAxis, readGamepadFrame } from './gamepad';

function mockGamepad(options: { index?: number; connected?: boolean; axes?: number[]; pressed?: number[] } = {}): Gamepad {
  const pressed = new Set(options.pressed ?? []);
  return {
    index: options.index ?? 0,
    connected: options.connected ?? true,
    axes: options.axes ?? [0, 0, 0, 0],
    buttons: Array.from({ length: 16 }, (_, index) => ({
      pressed: pressed.has(index), touched: pressed.has(index), value: pressed.has(index) ? 1 : 0,
    })),
  } as unknown as Gamepad;
}

describe('browser gamepad input', () => {
  it('filters analog stick drift and preserves proportional travel', () => {
    expect(normalizeGamepadAxis(0.1)).toBe(0);
    expect(normalizeGamepadAxis(-0.18)).toBe(0);
    expect(normalizeGamepadAxis(1)).toBe(1);
    expect(normalizeGamepadAxis(-1)).toBe(-1);
    expect(normalizeGamepadAxis(0.59)).toBeCloseTo(0.5);
    expect(normalizeGamepadAxis(Number.NaN)).toBe(0);
  });

  it('returns a neutral disconnected frame when no controller is connected', () => {
    const frame = readGamepadFrame([null, mockGamepad({ connected: false })]);
    expect(frame).toMatchObject({ connected: false, index: null, moveX: 0, moveY: 0, lookX: 0, lookY: 0 });
    expect(frame.pressedButtons.size).toBe(0);
    expect(frame.justPressedButtons.size).toBe(0);
  });

  it('maps both sticks and reports button edges only once per press', () => {
    const first = readGamepadFrame([
      null, mockGamepad({ index: 1, axes: [0.59, -1, -0.59, 0.1], pressed: [GAMEPAD_BUTTON.south, GAMEPAD_BUTTON.rightShoulder] }),
    ]);
    expect(first).toMatchObject({
      connected: true, index: 1, moveX: expect.closeTo(0.5), moveY: -1, lookX: expect.closeTo(-0.5), lookY: 0,
    });
    expect(first.justPressedButtons).toEqual(new Set([GAMEPAD_BUTTON.south, GAMEPAD_BUTTON.rightShoulder]));
    const held = readGamepadFrame([
      mockGamepad({ axes: [0, 0, 0, 0], pressed: [GAMEPAD_BUTTON.south, GAMEPAD_BUTTON.rightShoulder] }),
    ], first.pressedButtons);
    expect(held.justPressedButtons.size).toBe(0);
    expect(readGamepadFrame([mockGamepad()]).justPressedButtons.size).toBe(0);
  });
});
