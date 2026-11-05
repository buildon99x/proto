import parisTimelapse, {PARIS_MOMENTS} from './paris-timelapse.js';
import dubaiTimelapse from './dubai-timelapse.js';
import {PHASES} from './dubai-timeline.js';
import dubai from './dubai.js';
import harbor from './harbor.js';
import singapore from './singapore.js';
export const worlds = [
 {id:'harbor',definition:harbor,number:'01',category:'MARITIME / MINIATURE',title:'상자 속 항구',subtitle:'화물과 배, 작은 움직임으로 살아 있는 항구.',label:'THE GOLDEN SHIFT',caption:'CONTAINER TERMINAL / 01',file:'harbor.html',description:'오렌지색 크레인이 컨테이너를 부두와 화물선 사이로 옮깁니다. 청록색 수로에는 화물선과 예인선이 움직입니다.'},
 {id:'singapore',definition:singapore,number:'02',category:'SINGAPORE / GARDEN CITY',title:'싱가포르, 정원의 도시',subtitle:'마리나 베이의 빛과 건축, 지도 위에 피어난 작은 도시.',label:'THE GARDEN CITY',caption:'MARINA BAY / SINGAPORE',file:'singapore.html',description:'마리나 베이 샌즈와 하얀 연꽃 미술관, 슈퍼트리와 온실, 관람차와 시계탑을 지도 위에 담았습니다. 머라이언의 물줄기와 작은 유람선, 고가철도가 도시를 천천히 움직입니다.'},
 {id:'dubai',definition:dubai,number:'03',category:'DUBAI / CITY OF DREAMS',title:'두바이, 꿈의 도시',subtitle:'황금빛 지도 위로 솟은 마천루, 청록빛 바다와 작은 도시의 리듬.',label:'THE CITY OF DREAMS',caption:'DOWNTOWN / DUBAI',file:'dubai.html',description:'부르즈 할리파와 돛 모양 호텔, 팜 주메이라와 황금 프레임, 분수 호수와 쇼핑몰을 담았습니다. 열차가 해안에서 도심까지 대각선 고가 노선을 오가며 두 역에 정차합니다. 모래 해안과 야자수 정원 사이로 요트와 나무 배가 움직입니다.'},
 {id:'dubai-timelapse',definition:dubaiTimelapse,number:'04',category:'DUBAI / TIME LAPSE',title:'두바이, 도시가 만들어지는 시간',subtitle:'해안에서 인공섬과 마천루까지, 72초의 도시 형성 타임랩스.',label:'A CITY TAKES SHAPE',caption:'ARTISTIC TIME LAPSE / DUBAI',file:'dubai-timelapse.html',thumbnailTime:60,moments:PHASES,description:'지형과 인공섬, 도로, 건물, 정원과 일상이 차례로 형성됩니다. 실제 연대의 재현이 아닌 예술적 타임랩스입니다. 66초부터 시간을 되감아 다시 시작합니다.'},
 {id:'paris-timelapse',definition:parisTimelapse,number:'05',category:'PARIS / CITY OF LIGHT',title:'파리, 빛의 도시가 만들어지는 시간',subtitle:'센강을 따라 건축이 자라나고, 도시의 창에 따뜻한 불이 켜집니다.',label:'THE CITY OF LIGHT',caption:'ARTISTIC TIME LAPSE / PARIS',file:'paris-timelapse.html',thumbnailTime:60,moments:PARIS_MOMENTS,description:'센강과 다리, 에펠탑과 노트르담, 루브르와 개선문, 언덕 위 사크레쾨르가 차례로 만들어집니다. 눈·비·맑음·흐림과 낮·밤을 자유롭게 바꿔 보세요. 실제 연대를 재현한 역사가 아닌 예술적 도시 형성 타임랩스입니다.'}
];
