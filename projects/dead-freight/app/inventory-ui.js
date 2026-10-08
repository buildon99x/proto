(function(root){
'use strict';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render({inventory,stash=[],mode='raid',selected=null,activeSlot=0,message='',canDeploy=true}){
 const I=root.DFInventory,C=I.Catalog,entry=selected?.kind==='stash'?stash.find(s=>s.uid===selected.uid):selected?.location?inventory.get(selected.location):null;
 const labels={weapon:'무기',armor:'방탄',healing:'회복',heal:'회복',health:'회복',throwable:'투척',gadget:'가젯',ammo:'탄약',material:'전리품',loot:'전리품',quest:'증표'};
 const kg=n=>(Number(n)||0).toFixed(2)+' kg';
 const name=s=>s?C[s.itemId]?.name||s.itemId:'비어 있음';
 const detail=s=>!s?'':s.rounds!==undefined?'장전 '+s.rounds+'발':s.durability!==undefined?'방호 '+Math.ceil(s.durability):'×'+s.quantity;
 const action=(text,act,loc='',disabled=false)=>'<button type="button" data-action="'+esc(act)+'" data-location="'+esc(loc)+'"'+(disabled?' disabled':'')+'>'+esc(text)+'</button>';
 function slot(loc,label){const s=inventory.get(loc),chosen=selected?.kind==='carry'&&selected.location===loc;return '<button type="button" class="inv-slot'+(chosen?' selected':'')+(loc==='weapon:'+activeSlot?' active':'')+'" data-action="select" data-location="'+esc(loc)+'" aria-pressed="'+chosen+'"><small>'+esc(label)+'</small><strong>'+esc(name(s))+'</strong><span>'+esc(detail(s))+'</span>'+(s?'<em>'+esc(kg(I.stackWeight(s)))+'</em>':'')+'</button>';}
 const gear=['<h3>장비</h3>',slot('weapon:0','1 · 주무기'),slot('weapon:1','2 · 보조무기'),slot('armor','방탄 장비'),'<h3>빠른 사용 · 3–6</h3><div class="inv-quick-grid">',...[0,1,2,3].map(i=>slot('quick:'+i,String(i+3))),'</div>',slot('safe','보호 포켓 · 사망 시 보존')].join('');
 const bag=Array.from({length:12},(_,i)=>slot('bag:'+i,String(i+1).padStart(2,'0'))).join('');
 const carried=new Set(inventory.all().map(e=>e.stack.uid));
 const stored=mode==='prepare'?'<section class="inv-stash"><h3>보관함 <span>'+stash.length+' 묶음</span></h3><p>출격하기 전까지 보관품은 빠지지 않습니다.</p>'+(stash.length?stash.map(s=>'<button type="button" class="inv-stash-item'+(selected?.kind==='stash'&&selected.uid===s.uid?' selected':'')+'" data-action="select-stash" data-location="'+esc(s.uid)+'"'+(carried.has(s.uid)?' disabled':'')+'><strong>'+esc(name(s))+'</strong><span>'+esc(detail(s))+' · '+esc(kg(I.stackWeight(s)))+'</span><small>'+(carried.has(s.uid)?'출격 준비에 포함':'선택하여 가방으로 이동')+'</small></button>').join(''):'<p class="inv-empty">회수한 장비와 전리품이 여기에 보관됩니다.</p>')+'</section>':'';
 let selection='<h3>물품 정보</h3><p>장비나 가방의 물품을 선택하세요. 빈 칸을 누르면 선택한 물품을 이동합니다.</p>';
 if(entry){const item=C[entry.itemId],equipped=item.category==='weapon'?inventory.get('weapon:'+activeSlot):item.category==='armor'?inventory.get('armor'):null;
  selection='<h3>'+esc(name(entry))+'</h3><p>'+esc(labels[item.category]||item.category)+' · '+esc(detail(entry))+'</p><dl><dt>무게</dt><dd>'+esc(kg(I.stackWeight(entry)))+'</dd><dt>참고 가치</dt><dd>'+I.stackValue(entry)+(entry.issued?' · 보급품':'')+'</dd>'+(item.heal?'<dt>회복량</dt><dd>'+item.heal+'</dd>':'')+(entry.rounds!==undefined?'<dt>탄창 정원</dt><dd>'+item.magazineSize+'</dd>':'')+'</dl>';
  if(equipped&&equipped.uid!==entry.uid)selection+='<p class="inv-compare">현재 '+esc(name(equipped))+' · '+esc(detail(equipped))+' · '+esc(kg(I.stackWeight(equipped)))+'<br>무게 차이 '+(I.stackWeight(entry)-I.stackWeight(equipped)).toFixed(2)+' kg</p>';
  selection+='<div class="inv-actions">';
  if(selected.kind==='stash')selection+=action('가방에 준비','take-stash',entry.uid);
  else{
   if(item.category==='weapon')selection+=action('주무기에 장착','move','weapon:0')+action('보조무기에 장착','move','weapon:1');
   if(item.category==='armor')selection+=action('방탄 장비 착용','move','armor');
   if(['health','healing','heal','throwable','gadget'].includes(item.category)){if(mode==='raid')selection+=action('지금 사용','use',selected.location);for(let i=0;i<4;i++)selection+=action('빠른 사용 '+(i+3),'move','quick:'+i);}
   selection+=action('가방 빈 칸으로','to-bag',selected.location);
   if(!['weapon','armor','quest'].includes(item.category))selection+=action('보호 포켓으로','move','safe');
   if(mode==='raid'&&entry.quantity>1)selection+=action('1개 내려놓기','drop-one',selected.location);
   selection+=action(mode==='raid'?'바닥에 내려놓기':entry.issued?'보급품 제외':'보관함에 남기기','drop',selected.location);
  }
  selection+='</div>';
 }
 const weight=inventory.weight(),used=inventory.usedSlots();
 return '<header class="inv-header"><div><small>DEAD FREIGHT / FIELD EQUIPMENT</small><h2>'+(mode==='raid'?'가방 · 일시정지':'출격 준비')+'</h2></div><div class="inv-capacity"><strong>'+used+' / 12 칸</strong><strong>'+kg(weight)+' / 30 kg</strong><div class="inv-weight"><i style="width:'+Math.min(100,weight/30*100)+'%"></i></div></div></header><p class="inv-message" role="status" aria-live="polite">'+esc(message||(mode==='raid'?'가방을 연 동안 원정 시간이 멈춥니다. 보호 포켓 외 휴대품은 사망 시 잃습니다.':'장비를 선택해 준비하세요. 회수한 물품은 자동 판매되지 않으며 다음 출격에 다시 사용할 수 있습니다.'))+'</p><div class="inv-layout"><section class="inv-gear">'+gear+'</section><section class="inv-bag"><h3>가방 · 장비와 탄약까지 무게에 포함</h3><div class="inv-bag-grid">'+bag+'</div><section class="inv-details">'+selection+'</section></section>'+stored+'</div><footer class="inv-footer">'+(mode==='prepare'?action('기본 보급키트로 준비','starter'):'')+action(mode==='raid'?'원정으로 복귀 · Esc':'출격 메뉴로 돌아가기 · Esc','close')+(mode==='prepare'?action('이 장비로 출격','deploy','',!canDeploy):'')+'</footer>';
}
const api={render};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.DFInventoryUI=api;
})(typeof globalThis!=='undefined'?globalThis:this);
