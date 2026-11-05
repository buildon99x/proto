# 비주얼 품질 설정

갤러리나 각 도시의 단독 화면에서 **비주얼 품질**을 펼친 후 **부드럽게** 또는 **선명하게**를 선택합니다. 기본값은 **원본**입니다. 설정은 현재 열린 장면에서만 유지됩니다. 모음으로 나갔다 다시 열거나 페이지를 새로고침하면 원본으로 돌아옵니다.

- **부드럽게:** AgX + 약한 하이라이트 bloom + 절제된 채도/대비.
- **선명하게:** Neutral + 약한 bloom + 조금 더 선명한 채도/대비.
- 노출, bloom 사용/강도/밝기 기준/반경, 채도, 대비, 따뜻함을 개별 조절할 수 있습니다.
- **자동**은 너비 600 CSS px 미만에서 낮음, 나머지에서 균형입니다. 낮음은 bloom/MSAA를 끄고 DPR 상한 1.25, 균형은 MSAA 최대 2/DPR 1.5, 높음은 MSAA 최대 4/DPR 2입니다. 실제 지원 샘플 수는 기기에서 검사합니다. 이 수치는 성능 보장이나 실측 FPS가 아닙니다.
- 효과는 Miniature에만 적용됩니다. Pixel/Halftone/Blueprint는 기존 렌더링을 유지하고 선택한 설정은 기억합니다. 다시 Miniature로 바꾸면 재적용됩니다.
- 지원하지 않는 HDR 또는 불완전한 framebuffer는 원본으로 복귀합니다. bloom 버퍼만 실패하면 HDR/색 보정은 유지하고 bloom만 끕니다. 패널의 실제 HDR/bloom 상태를 확인하세요.
- 화면 전체를 흐리지 않습니다. bloom 선택은 tone mapping 전 HDR 휘도 기준이며, 특정 물체만 선택하는 mask 방식이 아닙니다. 하늘·날씨·밝은 흰색 물체도 기준을 넘으면 포함될 수 있습니다. 기본값은 출발점이며 도시별 낮/밤에서 비교 조절이 필요합니다.

## 엔진 API

기존 definition에 `rendering.visual`을 선택적으로 추가할 수 있습니다. 생략하면 원본 경로입니다. `runtime.getVisualSettings()`로 복사본을 받고 `runtime.setVisualSettings(partial)`로 변경합니다. `runtime.stats().visual.effective`는 실제 지원/적용 상태를 제공합니다. 설정 변경은 장면 시간, 정지 상태, 재생 속도, 카메라, 날씨를 초기화하지 않습니다.

```js
runtime.setVisualSettings({
  enabled: true, quality: 'balanced', toneMapping: 'neutral', exposure: 1,
  bloomEnabled: true, bloomStrength: 0.16, bloomRadius: 0.3,
  bloomThreshold: 1.15, saturation: 1.1, contrast: 1.06, warmth: 0.025
});
```

linear HalfFloat scene → optional half-resolution highlight extraction and separable blur → additive HDR composite → Neutral/AgX → one sRGB encoding → display-space color grade. Renderer tone mapping stays off; no OutputPass is stacked on the old manual encoding. No shared scene materials are modified. All buffers are owned and released on changes/disposal. Original keeps its existing restrained focus; new AO and DOF are deferred.

## 검증 한계

CPU/가짜 GPU I/O 테스트는 설정, 패스 순서, 자원 정리, fallback 및 상태 보존을 검증합니다. 실제 GLSL 컴파일·사진 품질·번짐 모양·모바일 GPU 성능을 입증하지 않습니다. 일반 WebGL2 브라우저에서 Original/Soft/Vivid를 같은 시간과 시점으로 비교해야 합니다. 안전 제한을 우회하지 않습니다.
