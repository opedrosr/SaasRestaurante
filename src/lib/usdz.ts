// @ts-nocheck — 'three' sem tipos instalados; arquivo isolado.
/** Converte um GLB em USDZ (para o AR Quick Look do iPhone), no navegador do painel. */
export async function glbToUsdz(glb: ArrayBuffer): Promise<ArrayBuffer> {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const { USDZExporter } = await import('three/examples/jsm/exporters/USDZExporter.js');
  const gltf = await new GLTFLoader().parseAsync(glb, '');
  const scene = new THREE.Scene(); scene.add(gltf.scene);
  const exporter = new USDZExporter();
  const out = exporter.parseAsync ? await exporter.parseAsync(scene) : await exporter.parse(scene);
  return out.buffer ? out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) : out;
}
