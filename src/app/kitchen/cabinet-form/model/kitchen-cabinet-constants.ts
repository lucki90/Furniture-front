export const KitchenCabinetConstraints = {
  BASE_ONE_DOOR: {
    WIDTH_MIN: 200,
    WIDTH_MAX: 600,
    WIDTH_STEP: 50,
    HEIGHT_MIN: 820,
    HEIGHT_MAX: 870,
    DEPTH_MIN: 500,
    DEPTH_MAX: 560,
    SHELF_MIN: 0,
    SHELF_MAX: 4
  },
  BASE_TWO_DOOR: {
    WIDTH_MIN: 400,
    WIDTH_MAX: 900,
    WIDTH_STEP: 50,
    HEIGHT_MIN: 820,
    HEIGHT_MAX: 870,
    DEPTH_MIN: 500,
    DEPTH_MAX: 560,
    SHELF_MIN: 0,
    SHELF_MAX: 4
  }
} as const;
