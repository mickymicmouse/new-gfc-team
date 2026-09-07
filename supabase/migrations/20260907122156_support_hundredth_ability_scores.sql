alter table public.players
  alter column defense type numeric(3, 2) using defense::numeric(3, 2),
  alter column passing type numeric(3, 2) using passing::numeric(3, 2),
  alter column shooting type numeric(3, 2) using shooting::numeric(3, 2),
  alter column control type numeric(3, 2) using control::numeric(3, 2),
  alter column activity type numeric(3, 2) using activity::numeric(3, 2);

alter table public.match_players
  alter column guest_defense type numeric(3, 2) using guest_defense::numeric(3, 2),
  alter column guest_passing type numeric(3, 2) using guest_passing::numeric(3, 2),
  alter column guest_shooting type numeric(3, 2) using guest_shooting::numeric(3, 2),
  alter column guest_control type numeric(3, 2) using guest_control::numeric(3, 2),
  alter column guest_activity type numeric(3, 2) using guest_activity::numeric(3, 2);
