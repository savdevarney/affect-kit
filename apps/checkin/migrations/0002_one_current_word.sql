-- At most one current row per word per check-in. Two overlapping reviews (a
-- retry while the first is in flight) could otherwise both add the same word;
-- now the second batch fails as a whole and the client asks again.
create unique index feeling_words_one_current on feeling_words (checkin_id, name) where superseded_at is null;
