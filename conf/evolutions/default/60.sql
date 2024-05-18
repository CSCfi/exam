-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exception_working_hours ADD mass_edited BOOLEAN DEFAULT false NULL;

# --- !Downs
ALTER TABLE exception_working_hours DROP mass_edited;
