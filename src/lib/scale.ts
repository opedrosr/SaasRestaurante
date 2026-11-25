/** Calibração: converte dimensões físicas (cm) em fator de escala do modelo. glTF usa metros. */
export interface Dims { width: number; depth: number; height: number }

export interface Calibration {
  factor: number;
  expectedM: Dims;
  measuredM: Dims;
  warnings: string[];
}

const cmToM = (cm: number) => cm / 100;

/** measuredM: bounding box do GLB original (metros, escala 1). physicalCm: dimensões cadastradas. */
export function calibrate(measuredM: Dims, physicalCm: Dims): Calibration {
  const target: Dims = {
    width: cmToM(physicalCm.width), depth: cmToM(physicalCm.depth), height: cmToM(physicalCm.height),
  };
  const warnings: string[] = [];
  if (!(measuredM.width > 0 && measuredM.depth > 0 && measuredM.height > 0))
    return { factor: 1, expectedM: target, measuredM, warnings: ['Modelo sem volume mensurável (arquivo inválido?).'] };

  const rW = target.width / measuredM.width;
  const rD = target.depth / measuredM.depth;
  const rH = target.height / measuredM.height;
  const factor = (rW + rD) / 2; // largura/profundidade definem o fator; altura é validada

  const hDev = Math.abs(rH - factor) / factor;
  if (hDev > 0.15)
    warnings.push(`Proporção do modelo difere das dimensões cadastradas em ${(hDev * 100).toFixed(0)}% na altura.`);
  if (Math.abs(rW - rD) / factor > 0.15) warnings.push('Largura e profundidade do modelo não batem com as cadastradas.');
  if (factor > 500 || factor < 0.002)
    warnings.push('Fator extremo: o arquivo provavelmente usa outra unidade (mm/cm/polegadas).');

  return { factor, expectedM: target, measuredM, warnings };
}