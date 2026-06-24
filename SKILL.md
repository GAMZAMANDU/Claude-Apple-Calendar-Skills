---
name: apple-calendar
description: Create, search, update, and delete events in macOS Calendar.app and reminders in Reminders.app from natural-language requests (Korean/English). Triggers on phrases like "일정 등록해줘", "회의 잡아줘", "약속 추가", "미리알림 추가해줘", "할일 추가", "캘린더 확인해줘", "오늘 일정 뭐있어", "schedule a meeting", "add a reminder", "what's on my calendar today".
---

# Apple Calendar & Reminders Skill

macOS의 **Calendar.app**(일정)과 **Reminders.app**(미리알림/할일)을 자연어 요청으로 조작하는 스킬. `osascript -l JavaScript`(JXA)로 두 앱을 제어한다. AppleScript 순수 문법은 날짜 리터럴이 시스템 로캘에 의존해 파싱 버그가 잦으므로 사용하지 않는다 — JXA는 표준 JS `Date` 객체를 쓰므로 안전하다.

## 1. Calendar vs Reminders 선택 기준

사용자 요청을 보고 둘 중 하나로 분류한다.

| 신호 | 대상 |
|---|---|
| 특정 시작/종료 시각이 있는 약속, 회의, 미팅 ("3시에", "2시~3시", "내일 오전 회의") | **Calendar event** |
| 마감일/할 일 위주, 시각이 없거나 "그 시간에 알려줘"가 핵심 ("쓰레기 버리기", "보고서 제출", "장보기 리마인드") | **Reminders** |
| "미리알림"이라는 단어가 명시적으로 쓰임 | **Reminders** |
| 모호한 경우 | 기본은 Calendar event. 단, 지속시간이 없고 단일 행동(할 일)이면 Reminders로 판단 |

## 2. 데이터 모델 (macOS `sdef`로 실측, 추측 금지)

### Calendar.app `event` (calendar 앱 dictionary 기준)
- `summary` (제목), `start date`, `end date`, `allday event`
- `location`, `description`(=notes), `url`, `status`
- `uid` (읽기 전용, 식별자 — update/delete 시 반드시 이걸로 타겟팅)
- 소속 `calendar` — **이것이 카테고리다.** event 자체에 별도 category 필드는 없음.
- alarm (`display alarm` 등): `trigger interval`(분 단위 정수, **음수=이벤트 전, 양수=이벤트 후**)

### Reminders.app `reminder`
- `name`, `body`(=notes)
- `due date`(날짜+시간), `allday due date`(날짜만), `remind me date`(실제 알림이 뜨는 시각 — "미리알림"의 핵심 필드)
- `priority` (정수: 0=없음, 1–4=high, 5=medium, 6–9=low)
- `flagged`, `completed`
- 소속 `container` = `list` — **이것이 카테고리다.**
- `id` (읽기 전용 식별자 — update/delete 시 반드시 이걸로 타겟팅)

주의: event엔 priority 없음, reminder엔 카테고리 전용 필드 없음(list가 곧 카테고리). 둘 다 "category"라는 이름의 필드는 존재하지 않는다 — 헷갈리지 말 것.

## 3. 카테고리(캘린더/리스트) 결정 로직

1. `scripts/list_calendars.sh` 또는 `scripts/list_reminder_lists.sh`로 **실제 이 Mac에 존재하는** 캘린더/리스트 이름을 가져온다. 존재하지 않는 캘린더를 지어내지 않는다.
2. `mapping/category_map.json`의 키워드 힌트를 참고해 가장 그럴듯한 캘린더/리스트를 고른다.
3. 매핑에 없거나 모호하면, 가능성 높은 후보를 골라 4단계 plan에 포함시키고 사용자가 확인 단계에서 정정할 수 있게 한다. 추측만으로 조용히 진행하지 않는다.

## 4. 실행 흐름

- **생성 / 수정 / 삭제**: 항상 아래 형식으로 plan을 먼저 보여주고 사용자 확인을 받은 뒤에만 스크립트를 실행한다.
  ```
  [Calendar] 회의 일정 등록
  제목: 팀 주간회의
  시간: 2026-06-26 (금) 15:00–16:00
  캘린더: Work
  위치: (없음)
  알림: 10분 전
  → 등록할까요?
  ```
- **조회 / 검색**: 비파괴적이므로 확인 없이 즉시 실행하고 결과를 보여준다.
- **수정/삭제**는 먼저 `find_events.sh` / `find_reminders.sh`로 대상을 검색해 `uid`/`id`를 특정한 뒤, 그 식별자로 update/delete를 호출한다. 제목만으로 매칭해 동명 이벤트를 잘못 건드리지 않는다.

## 5. 스크립트 인터페이스 (구현 완료)

모든 스크립트는 `scripts/`에 위치한 실행 가능한 JXA 파일(`#!/usr/bin/osascript -l JavaScript` 셔뱅, `chmod +x` 완료). 직접 실행 가능: `./scripts/list_calendars.js`. argv로 `--key value` 형태 인자를 받고 stdout으로 JSON을 반환한다.

| 스크립트 | 인자 | 반환 |
|---|---|---|
| `list_calendars.js` | (없음) | `[{name, color}]` |
| `list_reminder_lists.js` | (없음) | `[{name, color}]` |
| `find_events.js` | `--from`, `--to` (ISO8601), `--calendar`(옵션), `--query`(옵션, 제목 키워드) | `[{uid, summary, start, end, calendar, location}]` |
| `find_reminders.js` | `--from`, `--to`(옵션), `--list`(옵션), `--query`(옵션), `--include-completed`(옵션) | `[{id, name, due, remindAt, list, completed, priority}]` |
| `create_event.js` | `--title --start --end --calendar [--location] [--notes] [--alarm-minutes-before] [--allday]` | `{uid}` |
| `create_reminder.js` | `--name --list [--due] [--remind-at] [--notes] [--priority]` | `{id}` |
| `update_event.js` | `--uid --calendar [필드별 옵션]` | `{ok}` |
| `update_reminder.js` | `--id [필드별 옵션]` | `{ok}` |
| `delete_event.js` | `--uid --calendar` | `{ok}` |
| `delete_reminder.js` | `--id` | `{ok}` |
| `move_event.js` | `--uid --from-calendar --to-calendar` | `{uid}` (새 uid — 원본은 재생성 후 삭제됨, 아래 참고) |

`move_event.js` 주의: Calendar.app의 표준 `move` 커맨드는 event 클래스에 실제로 구현 안 돼 있어 항상 에러난다(-10014 / -1700 확인됨). 그래서 목적지 캘린더에 동일 속성으로 새로 만들고 원본을 지우는 방식으로 동작 — **uid가 바뀐다.**

날짜 인자는 ISO8601 (`2026-06-26T15:00:00+09:00`) 형식.

## 6. 사전 준비 (1회성)

최초 실행 시 macOS가 터미널/Claude Code의 Calendar·Reminders 접근 권한을 묻는다. 시스템 설정 > 개인정보 보호 및 보안 > 캘린더/미리 알림에서 허용 필요.

## 7. `mapping/category_map.json`

키워드 → 캘린더/리스트 이름 힌트 테이블. 사용자가 직접 편집 가능. 형식은 `mapping/category_map.json` 참고.

## 8. 알려진 한계: 캘린더를 특정 계정(iCloud 등)으로 지정/이동 불가

Calendar.app의 AppleScript/JXA 딕셔너리에는 **account(계정) 클래스/속성이 없다** (Reminders.app과 달리). 그래서 `create_event.js`/임시 캘린더 생성 코드로 새 캘린더를 만들면 항상 기본 위치(보통 로컬 "On My Mac")에 생기고, 스크립트로 "이 캘린더를 iCloud 계정에 넣어라" 지정할 방법이 없다. GUI 메뉴 자동화(System Events)로 우회하는 것도 가능은 하지만 Accessibility 권한(손쉬운 사용)이 추가로 필요하고 메뉴 텍스트/macOS 버전에 취약해서 권장하지 않음.

**사용자가 "이 캘린더 iCloud로 옮겨줘" 같은 요청을 하면**, 이렇게 안내할 것:
1. 사용자가 Calendar.app 사이드바에서 원하는 계정(예: iCloud) 섹션의 "+"로 같은 이름의 새 캘린더를 직접 만들게 한다.
2. 그 다음 `move_event.js`로 기존 캘린더의 이벤트들을 새 캘린더로 옮긴다 (이름만 맞으면 계정 무관하게 동작).
3. 빈 채로 남은 기존(로컬) 캘린더는 `delete` 명령으로 정리한다(필요하면 — 현재 `delete_event.js`만 있고 캘린더 자체를 지우는 스크립트는 없음, 필요 시 같은 패턴으로 추가).
