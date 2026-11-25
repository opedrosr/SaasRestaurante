import { closestRef, fmtCm } from '../lib/arGuide';

interface Props { widthCm: number; heightCm: number; onStart: () => void; onClose: () => void }

/** Passo a passo mostrado antes de abrir a câmera (vale para iPhone e Android). */
export default function ARGuide({ widthCm, heightCm, onStart, onClose }: Props) {
  const ref = closestRef(widthCm);
  return (
    <div className="fixed inset-0 z-[60] bg-black/80 grid place-items-end md:place-items-center" onClick={onClose}>
      <div className="rise bg-navy text-white w-full md:max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-display text-2xl uppercase">Antes de abrir a câmera</h3>
        <p className="text-sm text-white/70">
          Este item mede {fmtCm(widthCm)} cm de largura por {fmtCm(heightCm)} cm de altura, parecido com {ref.name} ({fmtCm(ref.cm)} cm).
        </p>
        <ol className="list-decimal pl-5 space-y-2 text-sm">
          <li>Fique em um lugar bem iluminado e escolha uma superfície plana e com textura, como toalha ou madeira. Superfícies lisas, brilhantes ou escuras atrapalham.</li>
          <li>Aponte a câmera para a mesa, a uns 40 a 60 cm, e mova o celular devagar em círculos até a superfície ser reconhecida.</li>
          <li>Toque na mesa para posicionar o hambúrguer.</li>
          <li>Confira o tamanho colocando um objeto real ao lado, como prato, copo ou talher.</li>
        </ol>
        <p className="text-xs text-white/50">
          O tamanho do hambúrguer é fixo: aproximar ou afastar o celular muda só o ângulo de visão, não o tamanho real. A precisão depende de o seu aparelho reconhecer bem a mesa.
        </p>
        <button className="btn w-full" onClick={onStart}>Abrir câmera</button>
        <button className="btn-ghost w-full" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}
