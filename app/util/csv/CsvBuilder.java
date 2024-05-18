// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package util.csv;

import com.fasterxml.jackson.databind.JsonNode;
import com.google.inject.ImplementedBy;
import com.opencsv.exceptions.CsvException;
import java.io.File;
import java.io.IOException;
import java.util.Collection;
import models.Role;
import models.User;

@ImplementedBy(CsvBuilderImpl.class)
public interface CsvBuilder {
    File build(Long startDate, Long endDate) throws IOException;
    File build(Long examId, Collection<Long> childIds) throws IOException;
    File build(JsonNode node) throws IOException;
    void parseGrades(File csvFile, User user, Role.Name role) throws IOException, CsvException;
}
