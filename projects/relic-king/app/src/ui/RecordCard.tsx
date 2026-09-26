import { SITE_BY_ID, TIER_NAME, CONDITION_NAME } from "../game/balance";
import { CHECKER, LAST_CHECKED, nextCheckName, worldMonth } from "../game/lore";
import type { Artifact, Condition, SiteId, VaultItem, World } from "../game/types";

/**
 * 기록 카드(spec.md §15.5 ①, §17, G107·G121) — 상자마다 한 장.
 *
 * **점선 위는 실재 기록이다.** 유물명·소장처는 데이터 그대로이고 "마지막 확인"은 모든
 * 유물이 같은 날짜다(월 단위, G107). **점선 아래만 이 세계의 픽션이다** — 확인자(상자를
 * 연 팀의 감정 담당)와 다음 확인(이 물건을 다음에 갖는 이름). 다음 확인 칸이 게임의 세
 * 갈래다: 쥐면 우리 팀, 전시하면 박물관, 팔면 산 사람(`next`로 넘긴다).
 *
 * 새 이벤트·모달·용어를 만들지 않는다. 이미 있는 자리(유물 상세·감정 연출·최근 소장)에
 * 붙을 뿐이다.
 */
export function RecordCard({ artifact, world, ownerName, item, next, condition, compact }: {
  artifact: Artifact;
  world: World;
  ownerName: string;
  /** 소장고 사본 — 전시 중이면 다음 확인 칸이 박물관이 된다 */
  item?: Pick<VaultItem, "displayed" | "museumSite"> | null;
  /** 다음 확인 칸을 직접 채운다(매각 직후의 산 사람 한 줄 등) */
  next?: string;
  condition?: Condition;
  compact?: boolean;
}) {
  const museumLabel = (site: SiteId) => {
    const grade = world.museums.find((m) => m.site === site)?.grade ?? 0;
    return grade === 0 ? `${SITE_BY_ID[site].city} 임시 전시대` : `${SITE_BY_ID[site].city} 박물관`;
  };
  const month = worldMonth(world.t);
  return (
    <div className={`record-card${compact ? " compact" : ""}`} data-aid={artifact.id}>
      <div className="record-card-top">
        <b className="record-card-name">{artifact.name}</b>
        <span className="record-card-tier">{TIER_NAME[artifact.tier]}</span>
      </div>
      <dl className="record-card-rows">
        <div><dt>소장처</dt><dd>{artifact.holder}</dd></div>
        <div className="record-card-last"><dt>마지막 확인</dt><dd>{LAST_CHECKED}</dd></div>
        {!compact && condition !== undefined ? (
          <div><dt>상태</dt><dd>{CONDITION_NAME[condition]}</dd></div>
        ) : null}
      </dl>
      <hr className="record-card-rule" />
      <dl className="record-card-rows record-card-hand">
        <div><dt>확인자</dt><dd>{CHECKER}</dd></div>
        <div className="record-card-next">
          <dt>다음 확인</dt>
          <dd>{month} · {next ?? nextCheckName(item ?? null, ownerName, museumLabel)}</dd>
        </div>
      </dl>
    </div>
  );
}
