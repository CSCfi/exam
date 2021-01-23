# --- !Ups

ALTER TABLE exam_room ADD room_instruction_en TEXT;
ALTER TABLE exam_room ADD room_instruction_sv TEXT;

# --- !Downs

ALTER TABLE exam_room DROP room_instruction_en;
ALTER TABLE exam_room DROP room_instruction_sv;