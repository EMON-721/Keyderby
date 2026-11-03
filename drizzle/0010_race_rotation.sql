-- Record race passages per mode globally, separately from every user's Practice cycle.
-- Existing rooms, users, results and all 4,000 texts remain intact.
CREATE TABLE race_cycles (pool text PRIMARY KEY NOT NULL, cycle integer NOT NULL DEFAULT 1, last_passage_id text);
--> statement-breakpoint
CREATE TABLE race_seen (pool text NOT NULL, cycle integer NOT NULL, passage_id text NOT NULL REFERENCES passages(id), request_key text NOT NULL, assigned_at integer NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX race_seen_cycle_unique ON race_seen(pool,cycle,passage_id);
--> statement-breakpoint
CREATE UNIQUE INDEX race_seen_request_unique ON race_seen(pool,request_key);
--> statement-breakpoint
CREATE INDEX race_seen_pool_cycle_idx ON race_seen(pool,cycle);
--> statement-breakpoint
INSERT OR IGNORE INTO race_cycles(pool,cycle,last_passage_id) VALUES('public_race',1,NULL),('friends_race',1,NULL);
--> statement-breakpoint
INSERT OR IGNORE INTO race_seen(pool,cycle,passage_id,request_key,assigned_at)
SELECT p.pool,1,p.id,'legacy:' || p.id,MAX(r.created)
FROM rooms r JOIN passages p ON r.passage_id=p.id
WHERE p.pool IN('public_race','friends_race')
GROUP BY p.pool,p.id;
--> statement-breakpoint
UPDATE race_cycles SET last_passage_id=(
 SELECT r.passage_id FROM rooms r JOIN passages p ON p.id=r.passage_id
 WHERE p.pool=race_cycles.pool ORDER BY r.created DESC LIMIT 1
);
