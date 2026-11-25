/** Abre o AR Quick Look (iPhone) com a faixa de orientações do cardápio. Requer USDZ hospedado. */
export function openQuickLook(usdzUrl: string, widthCm: number) {
  const banner = `${location.origin}/ar-banner.html?w=${encodeURIComponent(String(widthCm))}`;
  const url = new URL(usdzUrl, location.href);
  url.hash = `allowsContentScaling=0&custom=${encodeURIComponent(banner)}&customHeight=small`;
  const a = document.createElement('a');
  a.setAttribute('rel', 'ar'); a.setAttribute('href', url.toString()); a.style.display = 'none';
  a.appendChild(document.createElement('img'));
  document.body.appendChild(a); a.click();
  setTimeout(() => a.remove(), 1000);
}
