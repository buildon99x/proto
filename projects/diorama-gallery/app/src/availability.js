export function unavailableMarkup(preview = false) {
  return `<div class="unavailable-note" role="status"><span class="unavailable-symbol" aria-hidden="true">◇</span><div><strong>${preview ? '3D 미리보기 사용 불가' : '이 브라우저에서는 항구를 표시할 수 없어요'}</strong><p>이 환경은 WebGL 2를 사용할 수 없어 실제 장면이 렌더링되지 않았습니다.<br>WebGL 2를 지원하는 브라우저에서 다시 열어 주세요.</p><small>참고 이미지를 결과 화면으로 대신 표시하지 않습니다.</small></div></div>`;
}
export function showUnavailable(el, preview = false) {
  el.innerHTML = unavailableMarkup(preview);
  el.dataset.state = 'unavailable';
}
