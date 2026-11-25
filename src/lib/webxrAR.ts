// @ts-nocheck — o pacote 'three' não tem tipos instalados; este arquivo é imperativo e isolado.
import { calibrate } from './scale';
import { distanceGuidance } from './arGuide';

const cache = new Map<string, Promise<any>>();

/** Carrega o three e o modelo antecipadamente (enquanto o cliente lê o guia). */
export function prepareWebXRAR(glbUrl: string) {
  if (!cache.has(glbUrl)) {
    cache.set(glbUrl, (async () => {
      const THREE = await import('three');
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(glbUrl);
      return { THREE, gltf };
    })().catch(e => { cache.delete(glbUrl); throw e; }));
  }
  return cache.get(glbUrl)!;
}

export async function isWebXRARSupported(): Promise<boolean> {
  try { return !!(navigator.xr && await navigator.xr.isSessionSupported('immersive-ar')); } catch { return false; }
}

/** AR própria (Android/Chrome): a página controla a tela, então pode orientar o cliente durante a AR. */
export async function startWebXRAR({ glbUrl, physicalCm, onEnd }: { glbUrl: string; physicalCm: { width: number; depth: number; height: number }; onEnd?: () => void }) {
  const btn = 'pointer-events:auto;background:rgba(20,19,18,.88);color:#F2EDE4;border:1px solid rgba(242,237,228,.4);padding:10px 14px;font-size:14px;font-family:system-ui,sans-serif';
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;color:#F2EDE4;font-family:system-ui,sans-serif;z-index:2147483000';
  overlay.innerHTML = `
    <div style="position:absolute;top:16px;left:16px;right:16px;display:flex;justify-content:space-between;gap:8px">
      <button id="xr-exit" style="${btn}">Sair</button>
      <span style="display:flex;gap:8px"><button id="xr-rot" style="${btn}">Girar</button><button id="xr-re" style="${btn}">Reposicionar</button></span>
    </div>
    <div style="position:absolute;left:12px;right:12px;bottom:28px;text-align:center">
      <span id="xr-msg" style="display:inline-block;background:rgba(20,19,18,.88);padding:10px 16px;font-size:14px;line-height:1.35;max-width:92%">Carregando…</span>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelectorAll('button').forEach(b => b.addEventListener('beforexrselect', e => e.preventDefault()));
  const msgEl = overlay.querySelector('#xr-msg');
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%';
  document.body.insertBefore(canvas, overlay);

  let session: any;
  try {
    session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay', 'light-estimation'], domOverlay: { root: overlay },
    });
  } catch (e) { overlay.remove(); canvas.remove(); throw e; }

  let renderer: any;
  const cleanup = () => { try { renderer?.setAnimationLoop(null); renderer?.dispose(); } catch {} overlay.remove(); canvas.remove(); onEnd?.(); };
  session.addEventListener('end', cleanup);

  try {
    const { THREE, gltf } = await prepareWebXRAR(glbUrl);

    // Modelo: mede, calibra pelo tamanho cadastrado e apoia a base em y = 0.
    const model = gltf.scene.clone(true);
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    const c = calibrate({ width: size.x, depth: size.z, height: size.y }, physicalCm);
    model.scale.multiplyScalar(c.factor);
    const holder = new THREE.Group(); holder.add(model);
    const b = new THREE.Box3().setFromObject(holder); const ctr = b.getCenter(new THREE.Vector3());
    model.position.x -= ctr.x; model.position.z -= ctr.z; model.position.y -= b.min.y;

    // Régua de 10 cm (segmentos de 1 cm) ao lado do item, para comparar com objetos reais.
    const ruler = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.003, 0.012), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xF2EDE4 : 0xB3361F }));
      seg.position.set(i * 0.01 + 0.005 - 0.05, 0.0015, 0); ruler.add(seg);
    }
    ruler.position.set(0, 0, physicalCm.depth / 200 + 0.03); holder.add(ruler);

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio); renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local');
    const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(1, 2, 1); scene.add(sun);
    const reticle = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.08, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xC9A24B }));
    reticle.matrixAutoUpdate = false; reticle.visible = false; scene.add(reticle);

    await renderer.xr.setSession(session);
    const hitSource = await session.requestHitTestSource({ space: await session.requestReferenceSpace('viewer') });

    let placed = false, last = '', lastAt = 0;
    const say = (t: string, now = performance.now()) => { if (t !== last && (now - lastAt > 300 || !last)) { msgEl.textContent = t; last = t; lastAt = now; } };
    overlay.querySelector('#xr-exit').addEventListener('click', () => session.end());
    overlay.querySelector('#xr-rot').addEventListener('click', () => { holder.rotation.y += Math.PI / 6; });
    overlay.querySelector('#xr-re').addEventListener('click', () => { placed = false; scene.remove(holder); });
    session.addEventListener('select', () => {
      if (!placed && reticle.visible) { holder.position.setFromMatrixPosition(reticle.matrix); scene.add(holder); placed = true; reticle.visible = false; }
    });

    const cam = new THREE.Vector3();
    renderer.setAnimationLoop((now: number, frame: any) => {
      if (frame) {
        if (!placed) {
          const hits = frame.getHitTestResults(hitSource);
          if (hits.length) { reticle.visible = true; reticle.matrix.fromArray(hits[0].getPose(renderer.xr.getReferenceSpace()).transform.matrix); say('Superfície encontrada. Toque na tela para posicionar.', now); }
          else { reticle.visible = false; say('Mova o celular devagar, em círculos, até a superfície ser reconhecida.', now); }
        } else {
          cam.setFromMatrixPosition(renderer.xr.getCamera().matrixWorld);
          say(distanceGuidance(cam.distanceTo(holder.position), physicalCm.width), now);
        }
      }
      renderer.render(scene, camera);
    });
  } catch (e) { try { session.end(); } catch {} cleanup(); throw e; }
}
