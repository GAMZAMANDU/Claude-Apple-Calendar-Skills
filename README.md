# Apple Calendar & Reminders Skill

Claude Code용 스킬. 자연어(한/영)로 macOS **Calendar.app**(일정)과 **Reminders.app**(미리알림)을 조작한다. "회의 일정 등록해줘", "미리알림 추가해줘" 같은 요청을 받아 실제 캘린더/리스트에 생성·조회·수정·삭제·이동까지 처리한다.

자세한 동작 규칙(카테고리 판단, 실행 전 확인 흐름, 데이터 모델)은 [`SKILL.md`](./SKILL.md) 참고. 이 파일은 사람이 설치/사용하기 위한 안내다.

## 설치

이 저장소는 Claude Code [플러그인](https://code.claude.com/docs/en/plugins)이다(`.claude-plugin/plugin.json` + `marketplace.json` 포함). 두 가지 설치 방법이 있다.

### 방법 1: 플러그인 마켓플레이스로 설치 (다른 사람에게 공유할 때, 권장)

Claude Code 안에서:

```
/plugin marketplace add GAMZAMANDU/Claude-Apple-Calendar-Skills
/plugin install apple-calendar@apple-calendar-skills
```

### 방법 2: 내 Mac에 직접 설치 (마켓플레이스 등록 없이 바로 쓰기)

```bash
git clone https://github.com/GAMZAMANDU/Claude-Apple-Calendar-Skills.git ~/Apple-Calender_Skills
ln -s ~/Apple-Calender_Skills ~/.claude/skills/apple-calendar
```

`~/.claude/skills/` 아래 디렉터리에 `.claude-plugin/plugin.json`이 있으면 Claude Code가 이를 자동으로 "skills-dir 플러그인"(`apple-calendar@skills-dir`)으로 인식해 로드한다. 마켓플레이스 등록/설치 단계가 필요 없다.

두 방법 모두 적용 후 Claude Code를 재시작(새 세션 시작)해야 스킬이 로드된다. 처음 스크립트가 실행될 때 macOS가 Calendar/Reminders 접근 권한을 묻는다 — 허용해야 동작한다(시스템 설정 > 개인정보 보호 및 보안 > 캘린더 / 미리 알림).

## 사용 예시

```
"내일 3시에 팀 회의 일정 등록해줘"
"이번 주말 장보기 미리알림 추가해줘"
"오늘 일정 뭐있어?"
"아까 등록한 회의 7시로 옮겨줘"
```

생성/수정/삭제 요청은 실행 전에 항상 계획(제목/시간/캘린더/위치 등)을 보여주고 확인을 받은 뒤 실행한다. 조회/검색은 바로 실행된다.

## 동작 원리

`osascript -l JavaScript` (JXA)로 두 앱을 직접 제어한다. 순수 AppleScript 대신 JXA를 쓴 이유는 날짜 리터럴이 시스템 로캘에 의존하지 않게 하기 위함(표준 JS `Date` 사용).

| 스크립트 | 역할 |
|---|---|
| `scripts/list_calendars.js` | 실제 존재하는 캘린더 목록 조회 |
| `scripts/list_reminder_lists.js` | 실제 존재하는 미리알림 리스트 목록 조회 |
| `scripts/find_events.js` | 날짜범위/키워드로 이벤트 검색 |
| `scripts/find_reminders.js` | 날짜범위/키워드로 미리알림 검색 |
| `scripts/create_event.js` | 이벤트 생성 (종일 일정 지원) |
| `scripts/create_reminder.js` | 미리알림 생성 |
| `scripts/update_event.js` / `update_reminder.js` | 기존 항목 수정 |
| `scripts/delete_event.js` / `delete_reminder.js` | 삭제 |
| `scripts/move_event.js` | 이벤트를 다른 캘린더로 이동 |

각 스크립트는 `chmod +x` 된 실행 파일이라 직접 호출 가능: `./scripts/list_calendars.js`. 인자/반환 형식은 `SKILL.md` 5번 항목에 표로 정리돼 있다.

## 카테고리 매핑

`mapping/category_map.json`에 키워드 → 캘린더/리스트 이름 힌트를 등록해두면 더 정확하게 분류한다. 설치 직후엔 예시 값이라 본인 환경의 실제 캘린더/리스트 이름으로 바꿔주는 게 좋다(없어도 동작은 한다 — 매핑이 없으면 실제 목록 조회 + 추론으로 대체).

## 알려진 한계

- **계정 지정 불가**: Calendar.app의 스크립팅 인터페이스엔 account(iCloud 등) 개념이 없어서, 새 캘린더는 항상 기본 위치(보통 로컬)에 생성된다. 특정 계정으로 옮기려면 Calendar.app GUI에서 해당 계정 섹션에 직접 캘린더를 만든 뒤 `move_event.js`로 이벤트를 옮기는 방식으로 우회해야 한다(자세한 내용은 `SKILL.md` 8번 항목).
- **`move_event.js`는 uid가 바뀐다**: Calendar.app의 `move` 커맨드가 event 클래스에 실제로는 구현돼 있지 않아서, 목적지 캘린더에 동일 속성으로 재생성 후 원본을 삭제하는 방식으로 동작한다.
- macOS 전용. Calendar.app / Reminders.app이 설치된 환경에서만 동작한다.
