import { useEffect, useRef, useState } from 'react';
import { detectAR, AR_MESSAGES } from '../lib/arSupport';
import { calibrate, type Calibration } from '../lib/scale';
import { arMessage, type ARStatus, type ARTracking } from '../lib/arGuide';
import ARGuide from './ARGuide';

// Ordem dos modos de AR. 'webxr' primeiro permite orientações na tela durante a AR no Android (Chrome).
// Se a experiência no seu aparelho for pior que a do Scene Viewer, troque para "scene-viewer webxr quick-look".
const AR_MODES = 'webxr scene-viewer quick-look';

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
  const [arStatus, setArStatus] = useState<ARStatus>('idle');
  const [tracking, setTracking] = useState<ARTracking>('not-tracking');
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
    const onStatus = (e: any) => { const s = e.detail?.status as ARStatus; setArStatus(s); if (s === 'failed') setArFailed(true); };
    const onTrack = (e: any) => setTracking(e.detail?.status === 'tracking' ? 'tracking' : 'not-tracking');
    el.addEventListener('load', onLoad); el.addEventListener('error', onErr);
    el.addEventListener('ar-status', onStatus); el.addEventListener('ar-tracking', onTrack);
    return () => {
      el.removeEventListener('load', onLoad); el.removeEventListener('error', onErr);
      el.removeEventListener('ar-status', onStatus); el.removeEventListener('ar-tracking', onTrack);
    };
  }, [ready, glbUrl, physicalCm.width, physicalCm.depth, physicalCm.height]);

  const startAR = async () => {
    setGuide(false); setArFailed(false); onARClick?.();
    try { await ref.current?.activateAR(); } catch { setArFailed(true); }
  };

  if (error) return <p role="alert">Não foi possível carregar o modelo 3D deste produto.</p>;
  if (!ready) return <div aria-busy="true" className="animate-pulse aspect-square bg-neutral-800" />;

  const MV = 'model-viewer' as any;
  const live = arMessage(arStatus, tracking, physicalCm.width);
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
        ar-modes={AR_MODES}
        ar-scale="fixed"
        ar-placement="floor"
        style={{ width: '100%', height: '60vh' }}
      >
        <button slot="ar-button" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
        {live && (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 24, textAlign: 'center', pointerEvents: 'none' }}>
            <p style={{ display: 'inline-block', background: 'rgba(20,19,18,.88)', color: '#F2EDE4', padding: '10px 16px', fontSize: 14, maxWidth: '85%' }}>{live}</p>
          </div>
        )}
      </MV>
      {showAR && support !== 'none' && <button className="btn w-full mt-3" onClick={() => setGuide(true)}>VER NA MINHA MESA</button>}
      {showAR && support === 'none' && <p>{AR_MESSAGES.none}</p>}
      {arFailed && <p role="alert" className="text-sm text-gold mt-2">Não foi possível iniciar a realidade aumentada neste aparelho. A visualização 3D continua disponível.</p>}
      {guide && <ARGuide widthCm={physicalCm.width} heightCm={physicalCm.height} onStart={startAR} onClose={() => setGuide(false)} />}
      {calib?.warnings.map(w => <p key={w} role="status">{w}</p>)}
    </div>
  );
}
