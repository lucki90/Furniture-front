import { countertopBoardLabel, plinthBoardLabel } from './wall-board-labels';

describe('wall-board-labels', () => {
  it('używa tłumaczenia w aktywnym języku i usuwa dopisek domyślnej opcji', () => {
    expect(countertopBoardLabel('LAMINATE', { 'COUNTERTOP_MATERIAL.LAMINATE': 'Laminate (standard)' }))
      .toEqual({ boardLabel: 'Blat — laminate', materialName: 'Laminate' });
    expect(plinthBoardLabel('PVC', { 'PLINTH_MATERIAL.PVC': 'PVC (standard)' }))
      .toEqual({ boardLabel: 'Cokół — PVC', materialName: 'PVC' });
  });

  it('nie bierze tłumaczenia z kategorii innego elementu', () => {
    expect(plinthBoardLabel('CHIPBOARD', { 'COUNTERTOP_MATERIAL.CHIPBOARD': 'Blat wiórowy' }))
      .toEqual({ boardLabel: 'Cokół — płyta wiórowa', materialName: 'Płyta wiórowa' });
  });

  it('nieznany kod materiału zostaje w etykiecie bez zmian', () => {
    expect(countertopBoardLabel('GLASS_CERAMIC', {}))
      .toEqual({ boardLabel: 'Blat — GLASS_CERAMIC', materialName: 'GLASS_CERAMIC' });
  });

  it('bez materiału zostaje sama nazwa elementu', () => {
    expect(countertopBoardLabel(undefined)).toEqual({ boardLabel: 'Blat', materialName: '' });
    expect(plinthBoardLabel('')).toEqual({ boardLabel: 'Cokół', materialName: '' });
  });
});
