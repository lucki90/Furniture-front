import { CornerCountertopResponse, WallCalculationSummary } from '../model/kitchen-project.model';

export class ProjectDetailsPricingWarningsCollector {
  collectPricingWarnings(wallResult: WallCalculationSummary): string[] {
    const missing = new Set<string>();

    const collectFrom = (obj: { pricingComplete?: boolean; missingPriceEntries?: string[] } | null | undefined) => {
      if (obj?.pricingComplete === false && obj.missingPriceEntries) {
        obj.missingPriceEntries.forEach(entry => missing.add(entry));
      }
    };

    collectFrom(wallResult.countertop);
    collectFrom(wallResult.plinth);
    wallResult.fillerPanels?.forEach(fp => collectFrom(fp));
    wallResult.enclosures?.forEach(enc => collectFrom(enc));
    collectFrom(wallResult.upperFiller);

    return Array.from(missing);
  }

  collectCornerCountertopPricingWarnings(cornerCountertops: CornerCountertopResponse[] | null | undefined): string[] {
    if (!cornerCountertops?.length) return [];

    const missing = new Set<string>();
    for (const corner of cornerCountertops) {
      if (corner.pricingComplete === false && corner.missingPriceEntries) {
        corner.missingPriceEntries.forEach(entry => missing.add(entry));
      }
    }

    return Array.from(missing);
  }
}
