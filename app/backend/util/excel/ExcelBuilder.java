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

package backend.util.excel;


import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Collection;
import java.util.List;
import java.util.stream.IntStream;

import io.ebean.Ebean;
import io.vavr.Tuple2;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import backend.models.ExamRecord;
import backend.models.dto.ExamScore;

public class ExcelBuilder {

    public enum CellType {
        DECIMAL, STRING
    }

    private static void setValue(Cell cell, String value, CellType type) {
        if (type == CellType.DECIMAL) {
            cell.setCellValue(Double.parseDouble(value));
        } else {
            cell.setCellValue(value);
        }
    }

    public static ByteArrayOutputStream build(Long examId, Collection<Long> childIds) throws IOException {

        List<ExamRecord> examRecords = Ebean.find(ExamRecord.class)
                .fetch("examScore")
                .where()
                .eq("exam.parent.id", examId)
                .in("exam.id", childIds)
                .findList();
        Workbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet("Exam records");
        String[] headers = ExamScore.getHeaders();
        Row headerRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            headerRow.createCell(i).setCellValue(headers[i]);
        }
        for (ExamRecord record : examRecords) {
            List<Tuple2<String, CellType>> data = record.getExamScore().asCells(
                    record.getStudent(), record.getTeacher(), record.getExam());
            Row dataRow = sheet.createRow(examRecords.indexOf(record) + 1);
            int index = 0;
            for (Tuple2<String, CellType> entry : data) {
                Cell cell = dataRow.createCell(index++);
                setValue(cell, entry._1, entry._2);
            }
        }
        // HOX! autosize apparently crashes OpenJDK-11 for some reason
        IntStream.range(0, headers.length).forEach(i -> sheet.autoSizeColumn(i, true));
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        wb.write(bos);
        bos.close();
        return bos;
    }

}
