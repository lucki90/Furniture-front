import { DisplayFront } from './cabinet-render-context';
import { calculateDoorArc, detectArcCollisions, rectsOverlap } from './door-arc.utils';

describe('door-arc.utils', () => {
  const buildFront = (overrides: Partial<DisplayFront> = {}): DisplayFront => ({
    type: 'ONE_DOOR',
    x: 10,
    y: 20,
    width: 30,
    height: 40,
    hingesSide: 'LEFT',
    ...overrides
  });

  describe('calculateDoorArc', () => {
    it('should return null when hingesSide is missing', () => {
      const front = buildFront({ hingesSide: undefined });

      expect(calculateDoorArc(front)).toBeNull();
    });

    it('should return null for non-positive dimensions', () => {
      expect(calculateDoorArc(buildFront({ width: 0 }))).toBeNull();
      expect(calculateDoorArc(buildFront({ height: -1 }))).toBeNull();
    });

    it('should calculate left-hinged arc geometry', () => {
      const arc = calculateDoorArc(buildFront({ hingesSide: 'LEFT' }));

      expect(arc).not.toBeNull();
      expect(arc!.hingesSide).toBe('LEFT');
      expect(arc!.pathD).toBe('M 40.0,60.0 A 30.0,30.0 0 0 0 10.0,30.0 L 10.0,60.0 Z');
      expect(arc!.arcBoundingBox).toEqual({
        x: 10,
        y: 30,
        width: 30,
        height: 30
      });
      expect(arc!.hasCollision).toBeFalse();
    });

    it('should calculate right-hinged arc geometry', () => {
      const arc = calculateDoorArc(buildFront({ hingesSide: 'RIGHT' }));

      expect(arc).not.toBeNull();
      expect(arc!.hingesSide).toBe('RIGHT');
      expect(arc!.pathD).toBe('M 10.0,60.0 A 30.0,30.0 0 0 1 40.0,30.0 L 40.0,60.0 Z');
      expect(arc!.arcBoundingBox).toEqual({
        x: 10,
        y: 30,
        width: 30,
        height: 30
      });
    });
  });

  describe('detectArcCollisions', () => {
    it('should mark collision and store first collided cabinet id', () => {
      const leftArc = calculateDoorArc(buildFront())!;
      const rightArc = calculateDoorArc(buildFront({ x: 100, hingesSide: 'RIGHT' }))!;

      detectArcCollisions(
        [leftArc, rightArc],
        [
          { id: 'cab-1', rect: { x: 20, y: 35, width: 10, height: 10 } },
          { id: 'cab-2', rect: { x: 200, y: 200, width: 20, height: 20 } }
        ]
      );

      expect(leftArc.hasCollision).toBeTrue();
      expect(leftArc.collisionCabinetId).toBe('cab-1');
      expect(rightArc.hasCollision).toBeFalse();
      expect(rightArc.collisionCabinetId).toBeUndefined();
    });

    it('should reset previous collision state before recalculating', () => {
      const arc = calculateDoorArc(buildFront())!;
      arc.hasCollision = true;
      arc.collisionCabinetId = 'stale';

      detectArcCollisions([arc], []);

      expect(arc.hasCollision).toBeFalse();
      expect(arc.collisionCabinetId).toBeUndefined();
    });
  });

  describe('rectsOverlap', () => {
    it('should return true for overlapping rectangles', () => {
      expect(
        rectsOverlap(
          { x: 0, y: 0, width: 10, height: 10 },
          { x: 5, y: 5, width: 10, height: 10 }
        )
      ).toBeTrue();
    });

    it('should return false when rectangles only touch edges', () => {
      expect(
        rectsOverlap(
          { x: 0, y: 0, width: 10, height: 10 },
          { x: 10, y: 0, width: 10, height: 10 }
        )
      ).toBeFalse();
    });
  });
});
