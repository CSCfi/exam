-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

UPDATE question
SET question = regexp_replace(
    regexp_replace(
        question,
        'class="marker"',
        'class="cloze-test-wrapper"',
        'g'
    ),
    '(<span[^>]*cloze="true"[^>]*)\s*style="[^"]*"',
    '\1',
    'g'
)
WHERE question LIKE '%class="marker"%'
   OR question LIKE '%cloze="true"%';

# --- !Downs

UPDATE question
SET question = regexp_replace(
    question,
    'class="cloze-test-wrapper"',
    'class="marker"',
    'g'
)
WHERE question LIKE '%class="cloze-test-wrapper"%';
