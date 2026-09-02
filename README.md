# GFC 풋살 팀 편성

GFC 정규 멤버와 게스트의 참석 여부를 관리하고, 능력치에 맞춰 2개 또는 3개 팀을 자동 편성하는 모바일 우선 웹앱입니다.

## 배포

- 운영 웹앱: https://new-gfc-team-mickymicmouse-3949.vercel.app/
- Vercel 프로젝트는 GitHub `main` 브랜치와 연결되어 있으며 변경 시 프로덕션 배포가 실행됩니다.

## 현재 기능

- 선수 DB: 이름, 등번호, 수비·패스·슈팅·컨트롤·활동량 관리
- 이번 주 명단: 정규 멤버 참석 체크 및 일회성 게스트 추가
- 자동 편성: 랜덤, 종합 균형, 특정 능력치 우선
- 재편성 번호: 같은 조건을 재현하거나 다른 조합 생성
- 수동 조정: 선수별 최종 팀 변경 및 자동 배정 복원
- 결과 확인: 팀별 선수 명단, 팀 종합, 5개 능력치 평균과 최대 차이
- 편성 확정: 경기와 참가자, 자동·수동 팀 정보를 Supabase에 저장

## 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

기본값은 GFC 프로덕션 Supabase의 공개 URL과 publishable key입니다. 별도 프로젝트를 사용할 때만 `.env.local`로 덮어씁니다.

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

## 검증

```bash
npm test
npm run lint
npm run build
```

## 데이터베이스

프로덕션 프로젝트는 서울 리전을 사용합니다. `supabase/migrations`에는 현재 적용된 스키마를 재현할 수 있는 마이그레이션이 있습니다.

일반 접속자는 활성 선수와 확정 결과를 읽고 브라우저 안에서 팀 편성을 시험할 수 있습니다. 선수 수정과 편성 저장은 관리자 PIN이 필요합니다. 자세한 내용은 [보안 안내](docs/SECURITY.md)를 참고합니다.
