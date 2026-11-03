-- Preserve existing user accounts, saved results, profiles and all 4,000 published passages.
-- A passage is consumed when automatically assigned, even if the user later leaves the session.
CREATE TABLE practice_cycles (user_id text PRIMARY KEY NOT NULL REFERENCES users(id), cycle integer NOT NULL DEFAULT 1, last_passage_id text);
--> statement-breakpoint
CREATE TABLE practice_seen (user_id text NOT NULL REFERENCES users(id), cycle integer NOT NULL, passage_id text NOT NULL REFERENCES passages(id), request_key text NOT NULL, assigned_at integer NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX practice_seen_cycle_unique ON practice_seen (user_id,cycle,passage_id);
--> statement-breakpoint
CREATE UNIQUE INDEX practice_seen_request_unique ON practice_seen (user_id,request_key);
--> statement-breakpoint
CREATE INDEX practice_seen_user_cycle_idx ON practice_seen (user_id,cycle);
--> statement-breakpoint
INSERT OR IGNORE INTO practice_cycles(user_id,cycle,last_passage_id)
SELECT id,1,NULL FROM users WHERE status='active';
--> statement-breakpoint
-- Previously finished Practice/Timed Test passages count as seen in the first cycle.
INSERT OR IGNORE INTO practice_seen(user_id,cycle,passage_id,request_key,assigned_at)
SELECT a.user_id,1,a.passage_id,'legacy:' || a.passage_id,MAX(a.finished)
FROM attempts a JOIN passages p ON p.id=a.passage_id
WHERE a.finished IS NOT NULL AND a.mode IN ('practice','test') AND p.pool='practice'
GROUP BY a.user_id,a.passage_id;
--> statement-breakpoint
UPDATE practice_cycles SET last_passage_id=(
  SELECT a.passage_id FROM attempts a JOIN passages p ON p.id=a.passage_id
  WHERE a.user_id=practice_cycles.user_id
    AND a.finished IS NOT NULL AND a.mode IN ('practice','test') AND p.pool='practice'
  ORDER BY a.finished DESC LIMIT 1
);
