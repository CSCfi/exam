/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

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
