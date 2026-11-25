/** Textos e referências de tamanho usados nas orientações de realidade aumentada. */
export const REFS = [
  { name: 'o comprimento de um cartão de crédito', cm: 8.6 },
  { name: 'um CD', cm: 12 },
  { name: 'um prato de sobremesa', cm: 19 },
  { name: 'um prato raso', cm: 26 },
];
export const closestRef = (cm: number) => REFS.reduce((a, b) => (Math.abs(b.cm - cm) < Math.abs(a.cm - cm) ? b : a));
export const fmtCm = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

export type ARStatus = 'idle' | 'not-presenting' | 'session-started' | 'object-placed' | 'failed';
export type ARTracking = 'tracking' | 'not-tracking';

/** Mensagem exibida durante a sessão de AR (apenas onde a página consegue desenhar sobre a câmera). */
export function arMessage(status: ARStatus, tracking: ARTracking, widthCm: number): string | null {
  if (status === 'object-placed')
    return `Tamanho real: ${fmtCm(widthCm)} cm de largura. Compare com um prato ou copo ao lado. Arraste para mover e gire com dois dedos.`;
  if (status === 'session-started')
    return tracking === 'tracking'
      ? 'Superfície encontrada. Toque na mesa para posicionar o hambúrguer.'
      : 'Aponte para a mesa e mova o celular devagar, em círculos, para encontrar a superfície.';
  return null;
}

/** Orientação de distância com base na distância real (em metros) entre a câmera e o item posicionado. */
export function distanceGuidance(distM: number, widthCm: number): string {
  const cm = Math.round(distM * 100);
  if (distM < 0.35) return `Você está a ${cm} cm. Afaste-se um pouco para ver o hambúrguer inteiro ao lado dos seus objetos.`;
  if (distM > 1.2) return `Você está a ${cm} cm. Aproxime-se, uns 50 a 80 cm, para comparar o tamanho com seus objetos.`;
  return `Distância boa (${cm} cm). Largura real: ${fmtCm(widthCm)} cm. A régua vermelha e branca ao lado mede 10 cm: compare com um prato ou copo.`;
}
