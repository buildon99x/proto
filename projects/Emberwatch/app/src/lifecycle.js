// Korean player-facing goals and retention previews. No save mutation.
export const KO_RESOURCE={gold:'금화',wood:'목재',stone:'석재',iron:'철광석',health:'회복'};
export const KO_SLOT={weapon:'무기',armor:'방어구',charm:'장신구'};
export const KO_RARITY={common:'일반',rare:'희귀',epic:'영웅',legendary:'전설'};
export function resourceLine(values){return ['gold','wood','stone','iron'].map(k=>`${KO_RESOURCE[k]} ${Math.max(0,Math.floor(values?.[k]||0))}`).join(' · ');}
export function retentionRate(save,won=false){return won?1:Math.min(.85,.6+.05*(save.buildings?.chapel||0)+.025*(save.buildings?.treasury||0));}
export function nextJourneyGoal(save,classId=save.classId){
 const h=save.heroes?.[classId]||{level:1,skills:{q:1,e:0}},skills=h.skills||{},buildings=save.buildings||{};
 if(!save.milestones?.firstChestGear)return {id:'first-chest',title:'첫 보물상자 찾기',detail:'길을 탐색하고 상자 곁에서 F. 첫 상자에는 무기가 반드시 있습니다.',key:'F'};
 if(!(save.gear||[]).some(g=>g.id===save.equipped?.weapon))return {id:'equip',title:'발견한 무기 장착',detail:'Tab으로 현재 장비와 비교한 뒤 장착하세요. 얻기만 해서는 능력치가 오르지 않습니다.',key:'Tab'};
 if(h.level<2)return {id:'level-two',title:'2레벨에 도달하기',detail:'적을 쓰러뜨려 경험치를 모으세요. 레벨이 오르면 기술·능력치 포인트를 각각 3점 얻습니다.',key:'전투'};
 if(!skills.e)return {id:'learn-e',title:'두 번째 기술 배우기',detail:'K → E 기술 습득. 기술 포인트 3점이 필요합니다. Q 강화와 어느 쪽을 먼저 배울지 선택하세요.',key:'K'};
 if((buildings.training||0)<1&&(skills.q||1)>=2)return {id:'training-ground',title:'훈련장 건설로 진화 준비',detail:'금화·목재·석재를 피난처에 보관하세요. 훈련장을 건설하면 기술 3등급이 열립니다.',key:'피난처'};
 if(save.bosses<1)return {id:'guardian',title:'2층 수호자에게 도전',detail:'위험하면 운반꾼에게 자원 절반을 맡기세요. 장비와 레벨은 쓰러져도 남습니다.',key:'M'};
 if((buildings.guild||0)<1)return {id:'guild',title:'길드 회관 건설',detail:'여러 원정에서 모은 자원으로 피난처를 키우세요. 길드 회관은 전문화와 상위 건설을 엽니다.',key:'피난처'};
 if((skills.q||0)<3)return {id:'evolve-q',title:'Q 기술 3등급 진화',detail:'훈련장 조건과 기술 포인트를 확인하세요. 진화는 피해량뿐 아니라 기술의 사용 방식도 바꿉니다.',key:'K'};
 if(h.level<10)return {id:'specialization',title:'10레벨 전문화 준비',detail:'선호하는 장비·유물 조합으로 다음 원정을 준비하세요. 10레벨과 길드 회관 1단계에서 C가 열립니다.',key:'K'};
 return save.wins?{id:'new-cycle',title:`강화 원정 ${save.wins+1}회차`,detail:'다른 유물과 기술 조합을 시험하세요. 지형과 전리품은 원정마다 새로 정해집니다.',key:'원정'}:{id:'crown',title:'6층의 공허한 왕 처치',detail:'공격·회피·함성을 연계하고 운반꾼으로 손실을 줄이세요. 승리하면 소지 자원을 모두 가져옵니다.',key:'원정'};
}
export const WARRIOR_STYLES=[
 {title:'검격 연계',text:'기본 공격 3타의 강타로 틈을 만들고, 회수 동작 중 Q/E로 연계합니다. 힘·민첩과 공격력·치명타 장비를 활용하세요.'},
 {title:'회피 반격',text:'회피로 공격을 흘리면 잠시 반격이 강화됩니다. 회피 중 공격으로 전환하면 남은 무적은 끝납니다. 활력·방어력은 실수의 위험을 줄입니다.'},
 {title:'도끼 견제',text:'Q로 거리를 두고 여러 적을 맞힙니다. E 함성으로 공격 속도와 이동 속도를 높여 진입합니다. 지능·집중과 Q 3등급으로 기술 중심 조합을 준비하세요.'}
];
