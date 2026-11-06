import courtyardEstate from './courtyard-estate.js';
import dubai from './dubai.js';
import desert from './desert.js';
import desertTimelapse from './desert-timelapse.js';
import harbor from './harbor.js';
import singapore from './singapore.js';
import dubaiTimelapse from './dubai-timelapse.js';
import {PHASES} from './dubai-timeline.js';
import istanbulTimelapse from './istanbul-timelapse.js';
import {PHASES as ISTANBUL_PHASES} from './istanbul-timeline.js';
import parisTimelapse, {PARIS_MOMENTS} from './paris-timelapse.js';
import rome from './rome.js';
import romeTimelapse from './rome-timelapse.js';
import {PHASES as ROME_PHASES} from './rome-timeline.js';
export const worlds = [
 {id:'harbor',definition:harbor,number:'01',category:'MARITIME / MINIATURE',title:'상자 속 항구',subtitle:'화물과 배, 작은 움직임으로 살아 있는 항구.',label:'THE GOLDEN SHIFT',caption:'CONTAINER TERMINAL / 01',file:'harbor.html',description:'오렌지색 크레인이 컨테이너를 부두와 화물선 사이로 옮깁니다. 청록색 수로에는 화물선과 예인선이 움직입니다.'},
 {id:'singapore',definition:singapore,number:'02',category:'SINGAPORE / GARDEN CITY',title:'싱가포르, 정원의 도시',subtitle:'마리나 베이의 빛과 건축, 지도 위에 피어난 작은 도시.',label:'THE GARDEN CITY',caption:'MARINA BAY / SINGAPORE',file:'singapore.html',description:'마리나 베이 샌즈와 하얀 연꽃 미술관, 슈퍼트리와 온실, 관람차와 시계탑을 지도 위에 담았습니다. 머라이언의 물줄기와 작은 유람선, 고가철도가 도시를 천천히 움직입니다.'},
 {id:'dubai',definition:dubai,number:'03',category:'DUBAI / CITY OF DREAMS',title:'두바이, 꿈의 도시',subtitle:'황금빛 지도 위로 솟은 마천루, 청록빛 바다와 작은 도시의 리듬.',label:'THE CITY OF DREAMS',caption:'DOWNTOWN / DUBAI',file:'dubai.html',description:'부르즈 할리파와 돛 모양 호텔, 팜 주메이라와 황금 프레임, 분수 호수와 쇼핑몰을 담았습니다. 열차가 해안에서 도심까지 대각선 고가 노선을 오가며 두 역에 정차합니다. 모래 해안과 야자수 정원 사이로 요트와 나무 배가 움직입니다.'},
 {id:'desert',definition:desert,number:'04',category:'DESERT / RIVER CITY',title:'사막의 강과 피라미드',subtitle:'모래 언덕과 강을 따라 펼쳐지는 작은 고대풍 도시.',label:'THE RIVER CITY',caption:'DESERT / IMAGINED WORLD',file:'desert.html',description:'굽이치는 강과 계단식 피라미드, 열주 신전과 강변 마을을 담았습니다. 돛배가 강을 따라 천천히 움직입니다. 실제 유적 복원이 아닌 상상의 도시입니다.'},
 {id:'desert-timelapse',definition:desertTimelapse,number:'05',category:'DESERT / FORMATION',title:'사막 도시의 탄생',subtitle:'모래에서 강과 도시가 생겨나는 상상의 시간 여행.',label:'THE RIVER CITY',caption:'FORMATION / TIMELAPSE',file:'desert-timelapse.html',thumbnailTime:119,moments:desertTimelapse.moments,description:'모래 지형 위에 강과 초목, 마을, 피라미드와 신전이 차례로 모습을 드러냅니다. 상상 속 장면이며 역사적 복원이 아닙니다. 완성 후 잠시 머문 뒤 다시 재생됩니다.'},
 {id:'dubai-timelapse',definition:dubaiTimelapse,number:'06',category:'DUBAI / TIME LAPSE',title:'두바이, 도시가 만들어지는 시간',subtitle:'해안과 마천루에서 은하수 야경까지, 90초의 도시 형성 타임랩스.',label:'A CITY TAKES SHAPE',caption:'ARTISTIC TIME LAPSE / DUBAI',file:'dubai-timelapse.html',thumbnailTime:60,moments:PHASES,description:'지형과 인공섬, 도로, 건물, 정원과 일상이 차례로 형성됩니다. 실제 연대의 재현이 아닌 예술적 타임랩스입니다. 55~80초에 낮에서 밤으로 바뀌고 84초부터 시간을 되감아 다시 시작합니다.'},
 {id:'istanbul-timelapse',definition:istanbulTimelapse,number:'07',category:'ISTANBUL / NIGHT TIME LAPSE',title:'이스탄불, 불이 켜지는 시간',subtitle:'보스포루스 해안 위로 자라나는 도시, 푸른 밤을 밝히는 수천 개의 창.',label:'WHEN THE CITY LIGHTS UP',caption:'ARTISTIC TIME LAPSE / İSTANBUL',file:'istanbul-timelapse.html',thumbnailTime:60,moments:ISTANBUL_PHASES,description:'아야 소피아와 블루 모스크, 갈라타 타워, 궁전과 해안 상가가 차례로 만들어집니다. 트램과 배가 움직이고, 완성된 도시의 창과 미나레트에 따뜻한 불이 켜집니다. 실제 지리나 연대의 재현이 아닌 시안 기반의 예술적 타임랩스입니다.'},
 {id:'paris-timelapse',definition:parisTimelapse,number:'08',category:'PARIS / CITY OF LIGHT',title:'파리, 빛의 도시가 만들어지는 시간',subtitle:'센강을 따라 건축이 자라나고, 도시의 창에 따뜻한 불이 켜집니다.',label:'THE CITY OF LIGHT',caption:'ARTISTIC TIME LAPSE / PARIS',file:'paris-timelapse.html',thumbnailTime:60,moments:PARIS_MOMENTS,description:'센강과 다리, 에펠탑과 노트르담, 루브르와 개선문, 언덕 위 사크레쾨르가 차례로 만들어집니다. 눈·비·맑음·흐림과 낮·밤을 자유롭게 바꿔 보세요. 실제 연대를 재현한 역사가 아닌 예술적 도시 형성 타임랩스입니다.'},
 {id:'rome',definition:rome,number:'09',category:'ROME / ETERNAL CITY',title:'로마, 영원의 도시',subtitle:'테베레강을 따라 켜지는 불빛, 지도 위에 펼쳐진 로마의 밤.',label:'THE ETERNAL CITY',caption:'ILLUMINATED ATLAS / ROME',file:'rome.html',thumbnailTime:68,moments:rome.moments,description:'콜로세움과 성 베드로 대성당, 판테온과 포로 로마노, 천사의 성과 테베레강의 다리를 담았습니다. 맑음·흐림·비·눈과 낮·밤을 바꾸며 도시를 둘러보세요.'},
 {id:'rome-timelapse',definition:romeTimelapse,number:'10',category:'ROME / TIME LAPSE',title:'로마, 도시가 만들어지는 시간',subtitle:'강과 다리, 고대의 건축과 골목, 불이 켜진 도시까지 84초.',label:'ROME TAKES SHAPE',caption:'ARTISTIC TIME LAPSE / ROME',file:'rome-timelapse.html',thumbnailTime:68,moments:ROME_PHASES,description:'테베레강에서 다리와 고대 건축, 성당과 골목, 정원이 차례로 형성되고 완성된 도시의 건물에 불이 켜집니다. 실제 연대를 재현한 것이 아닌 예술적 타임랩스입니다. 76초부터 시간을 되감습니다.'},
 {id:'courtyard-estate',definition:courtyardEstate,number:'11',category:'COURTYARD / GARDEN RESIDENCE',title:'기와 아래, 고요한 정원',subtitle:'회랑과 안뜰, 버드나무와 잉어 연못으로 이어지는 작은 저택.',label:'A GARDEN WITHIN',caption:'COURTYARD ESTATE / REFERENCE MINIATURE',file:'courtyard-estate.html',thumbnailTime:12,moments:courtyardEstate.moments,description:'겹처마 전각과 대문, 목조 회랑으로 연결된 여러 안뜰을 담았습니다. 아치교 아래 잉어가 헤엄치고 버드나무, 소나무와 꽃나무가 정원을 채웁니다. 첨부 이미지를 바탕으로 만든 상상의 동아시아식 저택입니다.'}
];
