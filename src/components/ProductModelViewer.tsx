import { useEffect, useRef, useState } from 'react';
import { detectAR, AR_MESSAGES } from '../lib/arSupport';
import { calibrate, type Calibration } from '../lib/scale';
import { isWebXRARSupported, prepareWebXRAR, startWebXRAR } from '../lib/webxrAR';
import { openQuickLook } from '../lib/quicklook';
import ARGuide from './ARGuide';

interface Props {
  glbUrl: string;
  usdzUrl?: string | null;
  posterUrl?: string;
  physicalCm: { width: number; depth: number; height: number };
  showAR?: boolean;
  onARClick?: () => void;
  onCalibrated?: (c: Calibration) => void;
  onError?: () => void;
}

/** O web component só é importado quando o visualizador é montado (lazy). */
export default function ProductModelViewer({ glbUrl, usdzUrl, posterUrl, physicalCm, showAR = true, onARClick, onCalibrated, onError }: Props) {
  const ref = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [calib, setCalib] = useState<Calibration | null>(null);
  const [guide, setGuide] = useState(false);
  const [arFailed, setArFailed] = useState(false);
  const support = detectAR();

  useEffect(() => { import('@google/model-viewer').then(() => setReady(true)).catch(() => setError(true)); }, []);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const onLoad = () => {
      el.scale = '1 1 1';
      const d = el.getDimensions();
      const c = calibrate({ width: d.x, height: d.y, depth: d.z }, physicalCm);
      el.scale = `${c.factor} ${c.factor} ${c.factor}`;
      setCalib(c); onCalibrated?.(c);
    };
    const onErr = () => { setError(true); onError?.(); };
    el.addEventListener('load', onLoad); el.addEventListener('error', onErr);
    return () => { el.removeEventListener('load', onLoad); el.removeEventListener('error', onErr); };
  }, [ready, glbUrl, physicalCm.width, physicalCm.depth, physicalCm.height]);

  // Ao abrir o guia, já carrega a AR própria (Android/Chrome) em segundo plano.
  const openGuide = () => {
    setGuide(true);
    isWebXRARSupported().then(ok => { if (ok) prepareWebXRAR(glbUrl).catch(() => {}); });
  };

  const startAR = async () => {
    setGuide(false); setArFailed(false); onARClick?.();
    try {
      if (support === 'quick-look' && usdzUrl) { openQuickLook(usdzUrl, physicalCm.width); return; }
      if (await isWebXRARSupported()) {
        try { await startWebXRAR({ glbUrl, physicalCm }); return; } catch { /* cai para a AR nativa */ }
      }
      await ref.current?.activateAR();
    } catch { setArFailed(true); }
  };

  if (error) return <p role="alert">Não foi possível carregar o modelo 3D deste produto.</p>;
  if (!ready) return <div aria-busy="true" className="animate-pulse aspect-square bg-neutral-800" />;

  const MV = 'model-viewer' as any;
  return (
    <div>
      <MV
        ref={ref}
        src={glbUrl}
        ios-src={usdzUrl ? `${usdzUrl}#allowsContentScaling=0` : undefined}
        poster={posterUrl}
        alt="Modelo 3D do produto"
        camera-controls
        touch-action="pan-y"
        shadow-intensity="1.2"
        exposure="1.1"
        environment-image="neutral"
        ar
        ar-modes="scene-viewer quick-look"
        ar-scale="fixed"
        ar-placement="floor"
        style={{ width: '100%', height: '60vh' }}
      >
        <button slot="ar-button" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
      </MV>
      {showAR && support !== 'none' && <button className="btn w-full mt-3" onClick={openGuide}>VER NA MINHA MESA</button>}
      {showAR && support === 'none' && <p>{AR_MESSAGES.none}</p>}
      {arFailed && <p role="alert" className="text-sm text-gold mt-2">Não foi possível iniciar a realidade aumentada neste aparelho. A visualização 3D continua disponível.</p>}
      {guide && <ARGuide widthCm={physicalCm.width} heightCm={physicalCm.height} onStart={startAR} onClose={() => setGuide(false)} />}
      {calib?.warnings.map(w => <p key={w} role="status">{w}</p>)}
    </div>
  );
}
