-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
-- Convert MathJax markup (<span class="math-tex">...</span>) to MathLive markup (<math-field>...</math-field>)

UPDATE question
SET question = regexp_replace(question, '<span class="math-tex">(.*?)</span>', '<math-field>\1</math-field>', 'g')
WHERE question LIKE '%<span class="math-tex">%';

UPDATE question
SET default_answer_instructions = regexp_replace(default_answer_instructions, '<span class="math-tex">(.*?)</span>', '<math-field>\1</math-field>', 'g')
WHERE default_answer_instructions LIKE '%<span class="math-tex">%';

UPDATE question
SET default_evaluation_criteria = regexp_replace(default_evaluation_criteria, '<span class="math-tex">(.*?)</span>', '<math-field>\1</math-field>', 'g')
WHERE default_evaluation_criteria LIKE '%<span class="math-tex">%';

UPDATE essay_answer
SET answer = regexp_replace(answer, '<span class="math-tex">(.*?)</span>', '<math-field>\1</math-field>', 'g')
WHERE answer LIKE '%<span class="math-tex">%';

UPDATE multiple_choice_option
SET option = regexp_replace(option, '<span class="math-tex">(.*?)</span>', '<math-field>\1</math-field>', 'g')
WHERE option LIKE '%<span class="math-tex">%';

UPDATE comment
SET comment = regexp_replace(comment, '<span class="math-tex">(.*?)</span>', '<math-field>\1</math-field>', 'g')
WHERE comment LIKE '%<span class="math-tex">%';

UPDATE exam
SET instruction = regexp_replace(instruction, '<span class="math-tex">(.*?)</span>', '<math-field>\1</math-field>', 'g')
WHERE instruction LIKE '%<span class="math-tex">%';

UPDATE exam
SET enroll_instruction = regexp_replace(enroll_instruction, '<span class="math-tex">(.*?)</span>', '<math-field>\1</math-field>', 'g')
WHERE enroll_instruction LIKE '%<span class="math-tex">%';

UPDATE exam_room
SET room_instruction = regexp_replace(room_instruction, '<span class="math-tex">(.*?)</span>', '<math-field>\1</math-field>', 'g')
WHERE room_instruction LIKE '%<span class="math-tex">%';

UPDATE exam_room
SET room_instruction_en = regexp_replace(room_instruction_en, '<span class="math-tex">(.*?)</span>', '<math-field>\1</math-field>', 'g')
WHERE room_instruction_en LIKE '%<span class="math-tex">%';

UPDATE exam_room
SET room_instruction_sv = regexp_replace(room_instruction_sv, '<span class="math-tex">(.*?)</span>', '<math-field>\1</math-field>', 'g')
WHERE room_instruction_sv LIKE '%<span class="math-tex">%';

UPDATE external_reservation
SET room_instruction = regexp_replace(room_instruction, '<span class="math-tex">(.*?)</span>', '<math-field>\1</math-field>', 'g')
WHERE room_instruction LIKE '%<span class="math-tex">%';

UPDATE external_reservation
SET room_instruction_en = regexp_replace(room_instruction_en, '<span class="math-tex">(.*?)</span>', '<math-field>\1</math-field>', 'g')
WHERE room_instruction_en LIKE '%<span class="math-tex">%';

UPDATE external_reservation
SET room_instruction_sv = regexp_replace(room_instruction_sv, '<span class="math-tex">(.*?)</span>', '<math-field>\1</math-field>', 'g')
WHERE room_instruction_sv LIKE '%<span class="math-tex">%';

# --- !Downs
-- Revert MathLive markup (<math-field>...</math-field>) to MathJax markup (<span class="math-tex">...</span>)

UPDATE question
SET question = regexp_replace(question, '<math-field>(.*?)</math-field>', '<span class="math-tex">\1</span>', 'g')
WHERE question LIKE '%<math-field>%';

UPDATE question
SET default_answer_instructions = regexp_replace(default_answer_instructions, '<math-field>(.*?)</math-field>', '<span class="math-tex">\1</span>', 'g')
WHERE default_answer_instructions LIKE '%<math-field>%';

UPDATE question
SET default_evaluation_criteria = regexp_replace(default_evaluation_criteria, '<math-field>(.*?)</math-field>', '<span class="math-tex">\1</span>', 'g')
WHERE default_evaluation_criteria LIKE '%<math-field>%';

UPDATE essay_answer
SET answer = regexp_replace(answer, '<math-field>(.*?)</math-field>', '<span class="math-tex">\1</span>', 'g')
WHERE answer LIKE '%<math-field>%';

UPDATE multiple_choice_option
SET option = regexp_replace(option, '<math-field>(.*?)</math-field>', '<span class="math-tex">\1</span>', 'g')
WHERE option LIKE '%<math-field>%';

UPDATE comment
SET comment = regexp_replace(comment, '<math-field>(.*?)</math-field>', '<span class="math-tex">\1</span>', 'g')
WHERE comment LIKE '%<math-field>%';

UPDATE exam
SET instruction = regexp_replace(instruction, '<math-field>(.*?)</math-field>', '<span class="math-tex">\1</span>', 'g')
WHERE instruction LIKE '%<math-field>%';

UPDATE exam
SET enroll_instruction = regexp_replace(enroll_instruction, '<math-field>(.*?)</math-field>', '<span class="math-tex">\1</span>', 'g')
WHERE enroll_instruction LIKE '%<math-field>%';

UPDATE exam_room
SET room_instruction = regexp_replace(room_instruction, '<math-field>(.*?)</math-field>', '<span class="math-tex">\1</span>', 'g')
WHERE room_instruction LIKE '%<math-field>%';

UPDATE exam_room
SET room_instruction_en = regexp_replace(room_instruction_en, '<math-field>(.*?)</math-field>', '<span class="math-tex">\1</span>', 'g')
WHERE room_instruction_en LIKE '%<math-field>%';

UPDATE exam_room
SET room_instruction_sv = regexp_replace(room_instruction_sv, '<math-field>(.*?)</math-field>', '<span class="math-tex">\1</span>', 'g')
WHERE room_instruction_sv LIKE '%<math-field>%';

UPDATE external_reservation
SET room_instruction = regexp_replace(room_instruction, '<math-field>(.*?)</math-field>', '<span class="math-tex">\1</span>', 'g')
WHERE room_instruction LIKE '%<math-field>%';

UPDATE external_reservation
SET room_instruction_en = regexp_replace(room_instruction_en, '<math-field>(.*?)</math-field>', '<span class="math-tex">\1</span>', 'g')
WHERE room_instruction_en LIKE '%<math-field>%';

UPDATE external_reservation
SET room_instruction_sv = regexp_replace(room_instruction_sv, '<math-field>(.*?)</math-field>', '<span class="math-tex">\1</span>', 'g')
WHERE room_instruction_sv LIKE '%<math-field>%';

