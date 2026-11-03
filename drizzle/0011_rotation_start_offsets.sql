-- Establish fresh Easy->Hard->Medium->Mixed order for users and rooms that already have history.
-- Does not clear seen passages, attempts, race rooms or session records.
ALTER TABLE practice_cycles ADD COLUMN rotation_base integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE race_cycles ADD COLUMN rotation_base integer NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE practice_cycles SET rotation_base=(
 SELECT count(*) FROM practice_seen s WHERE s.user_id=practice_cycles.user_id AND s.cycle=practice_cycles.cycle
);
--> statement-breakpoint
UPDATE race_cycles SET rotation_base=(
 SELECT count(*) FROM race_seen s WHERE s.pool=race_cycles.pool AND s.cycle=race_cycles.cycle
);
