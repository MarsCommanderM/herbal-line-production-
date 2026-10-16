/** Browser Gamepad API input normalization for the third-person world. */
export const GAMEPAD_BUTTON = {
  south: 0, east: 1, west: 2, north: 3,
  leftShoulder: 4, rightShoulder: 5, leftTrigger: 6, rightTrigger: 7,
  select: 8, start: 9, dpadUp: 12, dpadDown: 13, dpadLeft: 14, dpadRight: 15,
} as const;

export interface GamepadFrameInput {
  connected: boolean;
  index: number | null;
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
  pressedButtons: Set<number>;
  justPressedButtons: Set<number>;
}

export function normalizeGamepadAxis(value: number, deadzone = 0.18): number {
  if (!Number.isFinite(value)) return 0;
  const bounded = Math.max(-1, Math.min(1, value));
  const magnitude = Math.abs(bounded);
  if (magnitude <= deadzone) return 0;
  return Math.sign(bounded) * Math.min(1, (magnitude - deadzone) / (1 - deadzone));
}

export function readGamepadFrame(
  gamepads: readonly (Gamepad | null)[],
  previousPressedButtons: ReadonlySet<number> = new Set<number>(),
): GamepadFrameInput {
  const gamepad = gamepads.find((candidate): candidate is Gamepad => Boolean(candidate?.connected));
  if (!gamepad) return {
    connected: false, index: null, moveX: 0, moveY: 0, lookX: 0, lookY: 0,
    pressedButtons: new Set<number>(), justPressedButtons: new Set<number>(),
  };
  const pressedButtons = new Set<number>();
  gamepad.buttons.forEach((button, index) => {
    if (button.pressed || button.value > 0.55) pressedButtons.add(index);
  });
  const justPressedButtons = new Set<number>();
  for (const index of pressedButtons) if (!previousPressedButtons.has(index)) justPressedButtons.add(index);
  return {
    connected: true,
    index: gamepad.index,
    moveX: normalizeGamepadAxis(gamepad.axes[0] ?? 0),
    moveY: normalizeGamepadAxis(gamepad.axes[1] ?? 0),
    lookX: normalizeGamepadAxis(gamepad.axes[2] ?? 0),
    lookY: normalizeGamepadAxis(gamepad.axes[3] ?? 0),
    pressedButtons,
    justPressedButtons,
  };
}
