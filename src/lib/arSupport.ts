export type ARSupport = 'quick-look' | 'scene-viewer' | 'webxr' | 'none';

export function detectAR(): ARSupport {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
  if (isIOS) {
    const a = document.createElement('a');
    return a.relList?.supports?.('ar') ? 'quick-look' : 'none';
  }
  if (/Android/.test(ua)) return 'scene-viewer'; // requer Google Play Services for AR
  return 'none';
}

export const AR_MESSAGES: Record<ARSupport, string> = {
  'quick-look': '',
  'scene-viewer': '',
  webxr: '',
  none: 'Realidade aumentada não está disponível neste dispositivo. Abra o cardápio em um iPhone (Safari) ou Android compatível com ARCore. A visualização 3D continua disponível.',
};
