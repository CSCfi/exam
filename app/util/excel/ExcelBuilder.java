// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package util.excel;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Collection;
import models.Exam;
import models.User;
import play.i18n.MessagesApi;

public interface ExcelBuilder {
    enum CellType {
        DECIMAL,
        STRING,
    }

    ByteArrayOutputStream build(Long examId, Collection<Long> childIds) throws IOException;
    ByteArrayOutputStream buildScoreExcel(Long examId, Collection<Long> childIds) throws IOException;
    ByteArrayOutputStream buildStudentReport(Exam exam, User student, MessagesApi messages) throws IOException;
}
