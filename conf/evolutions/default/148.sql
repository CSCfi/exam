-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

-- Versions before 6.4.0 could store the same option several times for a section question.
-- Remove the extra rows from teachers' exams, keeping an answered row or else the oldest one.
-- Student exams are left alone, scores of taken exams are derived from these rows.
-- Questions whose copies disagree on a score are left alone too, the teacher has to pick one.
DELETE FROM exam_section_question_option d
USING exam_section_question_option k, exam_section_question esq, exam_section es, exam e
WHERE k.exam_section_question_id = d.exam_section_question_id
  AND k.option_id = d.option_id
  AND k.id <> d.id
  AND NOT COALESCE(d.answered, false)
  AND (COALESCE(k.answered, false) OR k.id < d.id)
  AND esq.id = d.exam_section_question_id
  AND es.id = esq.exam_section_id
  AND e.id = es.exam_id
  AND e.parent_id IS NULL
  AND e.state IN (1, 2, 3, 13)
  AND NOT EXISTS (
    SELECT 1
    FROM exam_section_question_option x
    JOIN exam_section_question_option y
      ON y.exam_section_question_id = x.exam_section_question_id
      AND y.option_id = x.option_id
      AND y.id <> x.id
    WHERE x.exam_section_question_id = d.exam_section_question_id
      AND x.score IS DISTINCT FROM y.score
  );

# --- !Downs

-- The removed rows were redundant copies, nothing to restore
