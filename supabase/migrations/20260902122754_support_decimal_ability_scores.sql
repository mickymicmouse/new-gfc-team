alter table public.players
  drop constraint if exists players_defense_check,
  drop constraint if exists players_passing_check,
  drop constraint if exists players_shooting_check,
  drop constraint if exists players_control_check,
  drop constraint if exists players_activity_check;

alter table public.players
  alter column defense type numeric(2, 1) using defense::numeric(2, 1),
  alter column passing type numeric(2, 1) using passing::numeric(2, 1),
  alter column shooting type numeric(2, 1) using shooting::numeric(2, 1),
  alter column control type numeric(2, 1) using control::numeric(2, 1),
  alter column activity type numeric(2, 1) using activity::numeric(2, 1),
  add constraint players_defense_check check (defense between 1.0 and 5.0),
  add constraint players_passing_check check (passing between 1.0 and 5.0),
  add constraint players_shooting_check check (shooting between 1.0 and 5.0),
  add constraint players_control_check check (control between 1.0 and 5.0),
  add constraint players_activity_check check (activity between 1.0 and 5.0);

alter table public.match_players
  drop constraint if exists match_players_guest_defense_check,
  drop constraint if exists match_players_guest_passing_check,
  drop constraint if exists match_players_guest_shooting_check,
  drop constraint if exists match_players_guest_control_check,
  drop constraint if exists match_players_guest_activity_check;

alter table public.match_players
  alter column guest_defense type numeric(2, 1) using guest_defense::numeric(2, 1),
  alter column guest_passing type numeric(2, 1) using guest_passing::numeric(2, 1),
  alter column guest_shooting type numeric(2, 1) using guest_shooting::numeric(2, 1),
  alter column guest_control type numeric(2, 1) using guest_control::numeric(2, 1),
  alter column guest_activity type numeric(2, 1) using guest_activity::numeric(2, 1),
  add constraint match_players_guest_defense_check check (guest_defense between 1.0 and 5.0),
  add constraint match_players_guest_passing_check check (guest_passing between 1.0 and 5.0),
  add constraint match_players_guest_shooting_check check (guest_shooting between 1.0 and 5.0),
  add constraint match_players_guest_control_check check (guest_control between 1.0 and 5.0),
  add constraint match_players_guest_activity_check check (guest_activity between 1.0 and 5.0);
