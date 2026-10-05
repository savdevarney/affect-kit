-- Check-ins, the feeling words found in them, the runs that found them, and
-- the person's corrections (docs/checkin/README.md › The observation schema).
--
-- Their words (checkins.body) are the source of truth; everything else is
-- derived and versioned. Word rows are never edited: a change supersedes the
-- old row and inserts a new one. Deleting a check-in deletes everything below
-- it (foreign keys cascade; D1 enforces them).

create table checkins (
  id text primary key,                 -- UUIDv7 made on the client, so retries are idempotent
  user_id text not null,               -- every query is scoped by it: there's no row-level security in D1
  created_at text not null,            -- ISO 8601, UTC
  local_date text not null,            -- YYYY-MM-DD in their zone; the day starts at 4 a.m.
  timezone text not null,              -- IANA zone at check-in
  face_v real not null check (face_v between -1 and 1),
  face_a real not null check (face_a between -1 and 1),
  body text not null default '',       -- their words, as written
  reviewed_at text                     -- set at Done; null means not reviewed
) strict;
create index checkins_by_user_day on checkins (user_id, local_date, created_at);

create table extraction_runs (
  id text primary key,
  checkin_id text not null references checkins (id) on delete cascade,
  extractor text not null,             -- adapter/model/prompt version
  vocabulary text not null,            -- en-55-<hash of EMOTION_LABELS>
  purpose text not null check (purpose in ('live', 'shadow')),
  outcome text not null check (outcome in ('ok', 'invalid_output', 'error', 'timeout')),
  ms integer,
  input_tokens integer,
  output_tokens integer,
  created_at text not null
) strict;
create index extraction_runs_by_checkin on extraction_runs (checkin_id);

create table feeling_words (
  id text primary key,
  checkin_id text not null references checkins (id) on delete cascade,
  name text not null,                  -- an affect-kit EmotionName, checked in code
  level integer not null check (level between 1 and 3),
  source text not null check (source in ('model', 'person')),
  run_id text references extraction_runs (id) on delete set null,
  evidence text,                       -- the span of their words it came from
  confidence real,
  created_at text not null,
  superseded_at text                   -- set when removed or replaced
) strict;
create index feeling_words_current on feeling_words (checkin_id) where superseded_at is null;

create table unmatched_words (           -- feeling words with no vocabulary fit, in their words
  id text primary key,
  checkin_id text not null references checkins (id) on delete cascade,
  said text not null,
  run_id text references extraction_runs (id) on delete set null
) strict;
create index unmatched_words_by_checkin on unmatched_words (checkin_id);

create table word_feedback (             -- the flywheel's signal: what people kept, changed and added
  id text primary key,
  checkin_id text not null references checkins (id) on delete cascade,
  word_id text references feeling_words (id) on delete cascade,
  action text not null check (action in ('kept', 'removed', 'level_changed', 'added')),
  name text not null,
  from_level integer,
  to_level integer,
  created_at text not null
) strict;
create index word_feedback_by_checkin on word_feedback (checkin_id);
