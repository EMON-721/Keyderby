-- Preserve random internal user IDs, sessions and recovery secrets. Only update public labels.
UPDATE `users` SET `public_id` = 'KD-' || printf('%05d', 22300 + (SELECT `number` FROM `driver_numbers` WHERE `user_id`=`users`.`id`)) WHERE `id` IN (SELECT `user_id` FROM `driver_numbers`);
