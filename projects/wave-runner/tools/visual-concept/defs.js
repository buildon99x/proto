/* 공통 SVG 판 정의를 문서 맨 앞에 심는다. file:// 에서도 동작하도록 fetch 대신 주입한다. */
document.addEventListener("DOMContentLoaded", () => {
  document.body.insertAdjacentHTML("afterbegin", `
<!-- 공통 SVG 정의: 종이 결, 잉크 에지의 거친 떨림, 섹터 4유형의 판(스크린) -->
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <!-- 종이 섬유 -->
    <filter id="paper" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="7" result="n"/>
      <feColorMatrix in="n" type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.16" intercept="0"/>
      </feComponentTransfer>
    </filter>

    <!-- 잉크 에지의 거친 떨림. scale 이 클수록 싸게 찍은 판 -->
    <filter id="rough" x="-8%" y="-8%" width="116%" height="116%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035 0.09" numOctaves="3" seed="11" result="t"/>
      <feDisplacementMap in="SourceGraphic" in2="t" scale="3.4" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="rough-fine" x="-8%" y="-8%" width="116%" height="116%">
      <feTurbulence type="fractalNoise" baseFrequency="0.06 0.14" numOctaves="2" seed="3" result="t"/>
      <feDisplacementMap in="SourceGraphic" in2="t" scale="1.8" xChannelSelector="R" yChannelSelector="G"/>
    </filter>

    <!-- 섹터 4유형 = 판 4개. 색이 아니라 결로 구분한다 -->

    <!-- 협곡: 굵은 사선 선망. 각도는 램프 기울기와 같은 방향 -->
    <pattern id="plate-gorge" width="14" height="14" patternUnits="userSpaceOnUse"
             patternTransform="rotate(-38)">
      <rect width="14" height="14" style="fill:var(--ink)"/>
      <rect width="14" height="4.6" style="fill:var(--screen-line)"/>
    </pattern>

    <!-- 회랑: 조밀한 수평 선망. 관의 방향 -->
    <pattern id="plate-corridor" width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" style="fill:var(--ink)"/>
      <rect width="8" height="2.2" style="fill:var(--screen-line-2)"/>
    </pattern>

    <!-- 산개: 불규칙 망점. 흩뿌림 -->
    <pattern id="plate-scatter" width="22" height="22" patternUnits="userSpaceOnUse">
      <rect width="22" height="22" style="fill:var(--ink)"/>
      <circle cx="4"  cy="5"  r="2.6" style="fill:var(--screen-line)" opacity="0.85"/>
      <circle cx="15" cy="3"  r="1.7" style="fill:var(--screen-line)" opacity="0.85"/>
      <circle cx="19" cy="13" r="2.9" style="fill:var(--screen-line)" opacity="0.85"/>
      <circle cx="8"  cy="16" r="2.1" style="fill:var(--screen-line)" opacity="0.85"/>
      <circle cx="2"  cy="19" r="1.4" style="fill:var(--screen-line)" opacity="0.85"/>
      <circle cx="12" cy="10" r="1.2" style="fill:var(--screen-line)" opacity="0.85"/>
    </pattern>

    <!-- 맥동: 주기 밴드. 셔터의 리듬 -->
    <pattern id="plate-pulse" width="30" height="30" patternUnits="userSpaceOnUse">
      <rect width="30" height="30" style="fill:var(--ink)"/>
      <rect y="0"  width="30" height="7" style="fill:var(--screen-line)"/>
      <rect y="11" width="30" height="4" style="fill:var(--screen-line)"/>
      <rect y="19" width="30" height="2" style="fill:var(--screen-line)"/>
    </pattern>

    <!-- 티어 = 잉크 농도. 판을 겹쳐 찍을수록 망점이 메워진다 -->
    <pattern id="tone-1" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="10" height="10" fill="none"/>
      <circle cx="5" cy="5" r="1.6" style="fill:var(--screen-line)" opacity="0.85"/>
    </pattern>
    <pattern id="tone-2" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="10" height="10" fill="none"/>
      <circle cx="5" cy="5" r="2.6" style="fill:var(--screen-line)" opacity="0.85"/>
    </pattern>
    <pattern id="tone-3" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="10" height="10" fill="none"/>
      <circle cx="5" cy="5" r="3.5" style="fill:var(--screen-line)" opacity="0.85"/>
    </pattern>
    <pattern id="tone-4" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="10" height="10" style="fill:var(--dot)"/>
      <circle cx="5" cy="5" r="2.2" style="fill:var(--screen-line)" opacity="0.85"/>
    </pattern>
  </defs>
</svg>
  `);
});
