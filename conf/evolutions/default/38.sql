-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exception_working_hours ADD out_of_service BOOLEAN NOT NULL DEFAULT TRUE;

# --- !Downs
ALTER TABLE exception_working_hours DROP out_of_service;
