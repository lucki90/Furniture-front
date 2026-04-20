import { WallWithCabinets } from '../model/kitchen-state.model';
import { WallConnectionRequest, WallConnectionType, WallType } from '../model/kitchen-project.model';

export class ProjectWallConnectionBuilder {
  buildConnections(walls: WallWithCabinets[]): WallConnectionRequest[] {
    const connections: WallConnectionRequest[] = [];
    const horizontalTypes: WallType[] = ['MAIN', 'CORNER_LEFT', 'CORNER_RIGHT'];

    for (let j = 0; j < walls.length; j++) {
      const wallB = walls[j];
      if (wallB.type !== 'LEFT' && wallB.type !== 'RIGHT') continue;

      let aIdx = -1;
      for (let i = j - 1; i >= 0; i--) {
        if (horizontalTypes.includes(walls[i].type)) {
          aIdx = i;
          break;
        }
      }

      if (aIdx < 0) {
        for (let i = j + 1; i < walls.length; i++) {
          if (horizontalTypes.includes(walls[i].type)) {
            aIdx = i;
            break;
          }
        }
      }

      if (aIdx >= 0) {
        const connectionType: WallConnectionType = wallB.type === 'LEFT' ? 'L_CORNER_LEFT' : 'L_CORNER_RIGHT';
        connections.push({ wallIndexA: aIdx, wallIndexB: j, connectionType });
      }
    }

    return connections;
  }
}
