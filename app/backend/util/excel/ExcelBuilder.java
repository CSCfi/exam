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
import java.util.List;
import java.util.Collection;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Stream;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import io.ebean.Ebean;
import io.vavr.Tuple2;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import backend.models.ExamRecord;
import backend.models.Exam;
import backend.models.dto.ExamScore;
import backend.models.sections.ExamSectionQuestion;
import backend.models.User;

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

    public static ByteArrayOutputStream buildScoreExcel(Long examId, Collection<Long> childIds) throws IOException {
        List<Exam> childExams = Ebean.find(Exam.class)
                .fetch("examParticipation.user")
                .fetch("examSections.sectionQuestions.question")
                .where()
                .eq("parent.id", examId)
                .in("id", childIds)
                .findList();

        Exam parentExam = Ebean.find(Exam.class)
                .fetch("examSections.sectionQuestions.question")
                .where()
                .eq("id", examId)
                .findOne();

        List<Long> parentQuestionIds = parentExam
                .getExamSections()
                .stream()
                .flatMap(es -> es.getSectionQuestions().stream())
                .filter(esq -> esq.getQuestion() != null)
                .map(esq -> esq.getQuestion().getId())
                .collect(Collectors.toList());

        List<Long> deletedQuestionIds = childExams.stream()
                .flatMap(exam -> exam.getExamSections().stream())
                .flatMap(es -> es.getSectionQuestions().stream())
                .filter(esq -> isQuestionRemoved(esq, parentQuestionIds))
                .map(esq -> getQuestionId(esq))
                .distinct()
                .collect(Collectors.toList());

        /* Concatenate parent exam question ids with deleted question ids for spreadsheet headers */
        List<Long> questionIds = Stream
                .concat(parentQuestionIds.stream(), deletedQuestionIds.stream())
                .collect(Collectors.toList());

        /* List students for spreadsheet rows */
        List<User> students = childExams.stream().map(exam -> exam.getExamParticipation().getUser()).collect(Collectors.toList());

        /* Helper hashmap for printing scores to excel */
        Map<Long, Map<Long, String>> studentScoresByQuestionId = new HashMap<Long, Map<Long, String>>();
        childExams.stream()
                .forEach(exam -> {
                    if(exam.getExamParticipation() == null || exam.getExamParticipation().getUser() == null) {
                        return;
                    }

                    Long studentId = exam.getExamParticipation().getUser().getId();

                    boolean isGraded = (exam.getState() == Exam.State.GRADED ||
                            exam.getState() == Exam.State.GRADED_LOGGED ||
                            exam.getState() == Exam.State.ARCHIVED);

                    Map<Long, String> questionScores = exam
                            .getExamSections()
                            .stream()
                            .flatMap(es -> es.getSectionQuestions().stream())
                            .collect(Collectors.toMap(
                                    esq -> getQuestionId(esq),
                                    esq -> isGraded ? esq.getAssessedScore().toString() : "-"
                            ));
                    studentScoresByQuestionId.put(studentId, questionScores);
                });

        Workbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet("Question scores");

        /* Create header row */
        Row headerRow = sheet.createRow(0);
        headerRow.createCell(0).setCellValue("studentId");
        headerRow.createCell(1).setCellValue("eppn");
        for(int i = 0; i < questionIds.size(); i++) {
            int currentCellIndex = i + 2;
            Long questionId = questionIds.get(i);
            String header = parentQuestionIds.contains(questionId) ? "questionId_" + questionId : "removed";
            headerRow.createCell(currentCellIndex).setCellValue(header);
        }

        /* Create score rows */
        students.forEach(student -> {
            int rowId = students.indexOf(student) + 1;
            Long studentId = student.getId();
            Row dataRow = sheet.createRow(rowId);
            dataRow.createCell(0).setCellValue(student.getId());
            dataRow.createCell(1).setCellValue(student.getEppn());
            questionIds.forEach(questionId -> {
                int cellIndex = questionIds.indexOf(questionId) + 2;
                Cell cell = dataRow.createCell(cellIndex);
                String cellValue = studentScoresByQuestionId.get(studentId).get(questionId);
                CellType cellType = cellValue == "" || cellValue == "-" || cellValue == null ? CellType.STRING : CellType.DECIMAL;
                setValue(cell, cellValue, cellType);
            });
        });

        /* Autosize cells */
        IntStream.range(0, questionIds.size() + 2).forEach(i -> sheet.autoSizeColumn(i, true));

        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        wb.write(bos);
        bos.close();

        return bos;
    }

    private static Long getQuestionId(ExamSectionQuestion question) {
        if(question.getQuestion() == null) {
            return question.getId();
        }

        if(question.getQuestion().getParent() == null) {
            return question.getQuestion().getId();
        }

        return question.getQuestion().getParent().getId();
    }

    private static boolean isQuestionRemoved(ExamSectionQuestion question, List<Long> parentIds) {
        if(question.getQuestion() == null) {
            return true;
        }

        if(question.getQuestion().getParent() == null) {
            return true;
        }

        return !parentIds.contains(question.getQuestion().getParent().getId());

    }

}
