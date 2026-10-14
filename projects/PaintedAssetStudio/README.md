# Painted Asset Studio

원본 [claude-paint](https://github.com/aliceisjustplaying/claude-paint) Rust/Lua 물리 회화 엔진으로 게임용 이미지를 제작하는 로컬 CLI입니다. 비용·키·LLM·외부 서비스 없이 세 가지 독자적 프리셋을 실행합니다. 기존 게임 리소스를 수정하지 않는 별도 프로젝트입니다.

완성 파일은 `assets/samples/`에 있습니다. `python3 app/build.py` 후 `app/dist/index.html`을 열면 갤러리에서 각 PNG와 manifest를 직접 볼 수 있습니다. 또는 `python3 -m http.server 8080 --bind 127.0.0.1 --directory app/dist`로 로컬에서 확인하세요.

| 용도 | 작품 | 파일 | 크기 |
|---|---|---|---|
| 게임 배경 | Ember Valley | `assets/samples/ember-valley/ember-valley.png` | 960 × 540 |
| 카드 원화 | The Lantern Keeper | `assets/samples/lantern-keeper/lantern-keeper.png` | 600 × 900 |
| 독립 인벤토리 아이콘 | Copper Lantern | `assets/samples/copper-lantern/copper-lantern.png` | 384 × 384 |

## 설치

Python 3.10+, Rust 최신 stable(검증 시 1.99.0), C compiler, Git이 필요합니다. Python 패키지는 Pillow만 사용합니다. Rust가 없다면 공식 rustup 지침으로 설치하세요. 설치 스크립트를 원격 파이프로 실행하지 않습니다.

```bash
cd projects/PaintedAssetStudio
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install -r requirements.txt
./tools/bootstrap-engine.sh
export PAINT_EASEL="$PWD/.engine/target/release/easel"
python3 studio/cli.py presets
```

엔진은 공식 저장소의 `8ee1cdd67f510a55eb6dc279e7113c593e1b282a`에 고정됩니다. 수정되지 않은 소스와 Cargo.lock으로 release 빌드합니다. Cargo를 엔진 디렉터리 안에서 실행해야 `.cargo/config.toml`의 고정 Lua 해시 시드 설정이 적용됩니다. 기존에 설정 없이 빌드했다면 엔진 디렉터리에서 `cargo clean --release -p mlua-sys` 후 다시 빌드해야 합니다. 잘못된 Lua 빌드는 엔진 자체가 실행을 거부합니다.

이미 같은 버전의 공식 엔진을 빌드했다면 `--engine /absolute/source/target/release/easel` 또는 `PAINT_EASEL`로 선택할 수 있습니다. CLI는 소스 commit, dirty 상태와 바이너리 SHA256을 기록하고 검사합니다. 설치에는 최초 공식 GitHub/crates.io 다운로드가 필요하지만, 설치 후 이미지 제작은 로컬에서만 수행합니다.

## 작업 명세

`jobs/*.json`을 복사해 JSON으로 입력합니다. 임의 프롬프트를 해석하는 범용 생성 모델은 아닙니다.

```json
{
  "id": "copper-lantern",
  "preset": "icon",
  "style": "oil-nocturne",
  "palette": "dusk-ochre",
  "seed": 99,
  "width": 384,
  "height": 384,
  "filename": "copper-lantern.png",
  "max_revisions": 1,
  "timeout_seconds": 600
}
```

`preset`: background/card/icon. 현재 스타일과 팔레트는 각 한 개입니다. 팔레트는 HEX가 아닌 실물 안료의 혼합 비율이며 `presets`로 확인합니다. seed는 0..2147483647, width/height는 128..1536, 총 150만 픽셀 이하, aspect는 0.4..2.5입니다. 반복 상한은 0 또는 1, 각 렌더 타임아웃은 10..1800초입니다. 최대 한 번의 준비된 보정 패스를 제공하며 자유 문장으로 원하는 수정을 자동 해석하지 않습니다. 새로운 구도·스타일은 `studio/recipes.py`에서 독자적 붓질 코드로 추가할 수 있습니다.

## 생성 → 관측 → 수정 기록 → 승인 → 내보내기

```bash
python3 studio/cli.py generate jobs/copper-lantern.json --run runs/my-lantern
python3 studio/cli.py look runs/my-lantern
python3 studio/cli.py status runs/my-lantern
python3 studio/cli.py log runs/my-lantern
python3 studio/cli.py note runs/my-lantern --note 'PNG를 직접 보고 관측한 내용'
python3 studio/cli.py revise runs/my-lantern --note '손잡이와 유리 테두리 대비 보강'
```

`look`가 반환하는 파일을 이미지 뷰어 또는 갤러리로 직접 확인하세요. `revise`는 동일 시드/해상도로 처음부터 로그를 재생하고 준비된 하이라이트/실루엣 보정 chunk를 추가합니다. revision-0 PNG/Lua와 revision-1 PNG/Lua가 모두 보존됩니다. 실행 영수증과 관측 메모는 `state.json`에 기록합니다. 실제 PNG를 보고 승인자가 이름·검수 메모·최신 이미지 SHA256을 명시해야 내보내기가 열립니다.

```bash
# 최신 해시는 status의 checks.sha256에 있습니다.
python3 studio/cli.py approve runs/my-lantern \
  --sha256 '<checks.sha256>' --reviewer '검수자 이름' \
  --note '직접 이미지 검수 완료: 실루엣, 초점, 크기와 용도 확인'
python3 studio/cli.py export runs/my-lantern exports/my-lantern
python3 studio/cli.py reproduce runs/my-lantern
```

실제 검수 없이 승인 명령을 자동 실행하지 마세요. 제공 샘플은 assistant가 직접 관측하고 승인한 예시로, 사용자 최종 승인을 대신하지 않습니다. 승인 이후 입력/PNG/Lua 변경은 내보내기를 거부하고 새 run을 요구합니다. run/export 디렉터리가 이미 있으면 덮어쓰지 않습니다. PNG 무결성·RGB8·크기·색 통계 검사는 미적 품질과 별개입니다. 실패한 렌더는 영수증만 남기며, 해당 run에는 승인할 결과가 없습니다.

`manifest.json`은 작업 명세, 안료 비율, 시드, 해상도, 엔진 commit/바이너리/Cargo.lock 해시, 붓질 로그 해시, 이미지 파일/픽셀 해시, 수정 기록, 승인 기록과 출처를 포함합니다. `painting.lua`와 원본 PNG를 함께 보관하세요.

## 재현 및 검증

```bash
python3 -m unittest discover -s tests -v
python3 tools/check-delivery.py
# 동일 엔진으로 내보낸 로그를 정확히 지정한 너비에서 재생합니다.
"$PAINT_EASEL" run assets/samples/copper-lantern/painting.lua \
  --width 384 --out /tmp/copper-lantern-replay.png
# 원본 엔진의 live 도구도 확인할 수 있습니다. 출력 경로는 새 경로여야 합니다.
python3 tools/prove-engine.py "$PAINT_EASEL" /tmp/new-easel-proof
```

제공 샘플은 각각 동일 바이너리·로그·해상도에서 재생하여 decoded RGB 픽셀이 동일한지 검사했습니다. `notes/`의 실제 실행 영수증과 샘플별 `reproduction.json`을 확인하세요. 새 OS/compiler/CPU 빌드 사이의 바이트 동일성은 보장하지 않습니다. 더 작은 크기의 미리보기는 완성 PNG를 리사이즈하세요. 다른 너비로 엔진을 재생하면 픽셀 단위 물감 물리가 달라지므로 같은 그림의 단순 확대/축소가 아닙니다. upstream의 기본 live 캔버스는 2400px, sketch는 600px이며, 이 CLI는 선택한 native replay 해상도를 결과물의 기준으로 삼습니다.

## 사용 제한과 선택적 확장

- 결과는 RGB8 PNG이며 알파가 없습니다. 아이콘은 불투명 배경을 포함합니다. 투명 마스크/알파 경로는 구현하지 않았습니다.
- 물감 혼합은 안료 광학·젖은 붓의 잔색·표면 영향을 받으므로 정확한 HEX 매칭이 아닙니다.
- 회화풍 붓질을 만드는 도구입니다. 셀 애니메이션의 깨끗한 외곽선이나 24프레임 캐릭터 모션을 만들었다고 주장하지 않습니다. 프레임 재생은 그리기 타임랩스입니다.
- 세 프리셋과 한 보정 패스가 현재 범위입니다. 범용 생성형 모델·LLM 연결과 HTTP API는 포함하지 않았습니다. 향후 LLM이 Lua 후보를 제안하더라도 비용/키 연결은 별도 명시적 선택으로 두고, 현재 로컬 경로와 승인 게이트를 유지해야 합니다.
- 갤러리는 정적 읽기 전용입니다. 인증키 생성, 공개 배포, main merge, 유료 API 사용은 하지 않았습니다.

코드 MIT, 원본 샘플 이미지/붓질 로그 CC BY 4.0입니다. 상세 출처는 `ATTRIBUTION.md`와 각 manifest에 있습니다.
