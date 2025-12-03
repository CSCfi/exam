-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
UPDATE language SET name = 'suomi' WHERE code = 'fi';
UPDATE language SET name = 'svenska' WHERE code = 'sv';
UPDATE language SET name = 'English' WHERE code = 'en';
UPDATE language SET name = 'Deutsch' WHERE code = 'de';

# --- !Downs
