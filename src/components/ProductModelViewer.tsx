import { useEffect, useRef, useState } from 'react';
import { detectAR, AR_MESSAGES } from '../lib/arSupport';
import { calibrate, type Calibration } from '../lib/scale';

interface Props {
  glbUrl: string;
  usdzUrl?: string | null;
  posterUrl?: string;
  physicalCm: { width: number; depth: number; height: number };
  onARClick?: () => void;
  onCalibrated?: (c: Calibration) => void;
  onError?: () => void;
}

/** O web component só é importado quando o visualizador é montado (lazy). */
export default function ProductModelViewer({ glbUrl, usdzUrl, posterUrl, physicalCm, onARClick, onCalibrated, onError }: Props) {
  const ref = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [calib, setCalib] = useState<Calibration | null>(null);
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
        ar-modes="scene-viewer quick-look webxr"
        ar-scale="fixed"
        ar-placement="floor"
        style={{ width: '100%', height: '60vh' }}
      >
        {support !== 'none' && (
          <button slot="ar-button" onClick={onARClick}>VER NA MINHA MESA</button>
        )}
      </MV>
      {support === 'none' && <p>{AR_MESSAGES.none}</p>}
      {calib?.warnings.map(w => <p key={w} role="status">{w}</p>)}
    </div>
  );
}
