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

import backend.models.Exam;
import backend.models.ExamRecord;
import backend.models.User;
import backend.models.dto.ExamScore;
import backend.models.questions.Question;
import backend.models.sections.ExamSection;
import backend.models.sections.ExamSectionQuestion;
import backend.util.config.ConfigReader;
import backend.util.config.ConfigReaderImpl;
import io.ebean.Ebean;
import io.vavr.Tuple;
import io.vavr.Tuple2;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.apache.poi.common.usermodel.HyperlinkType;
import org.apache.poi.hssf.usermodel.HSSFFont;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Hyperlink;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import play.i18n.Lang;
import play.i18n.MessagesApi;

public class ExcelBuilder {

    public enum CellType {
        DECIMAL,
        STRING
    }

    private static final String[] ScoreReportDefaultHeaders = new String[] {
        "studentInternalId",
        "student",
        "studentFirstName",
        "studentLastName",
        "studentEmail",
        "studentId",
        "examState",
        "submissionId"
    };

    private static Map<String, String> getStudentReportHeaderMap(User student) {
        Map<String, String> studentReportDefaultHeaders = new LinkedHashMap<>();
        studentReportDefaultHeaders.put("reports.studentFirstName", student.getFirstName());
        studentReportDefaultHeaders.put("reports.studentLastName", student.getLastName());
        studentReportDefaultHeaders.put("reports.studentEmail", student.getEmail());
        studentReportDefaultHeaders.put("reports.studentId", student.getUserIdentifier());
        return studentReportDefaultHeaders;
    }

    private static List<Tuple2<String, CellType>> getScoreReportDefaultCells(
        User student,
        Exam exam,
        Optional<ExamScore> examScore
    ) {
        List<Tuple2<String, CellType>> scoreReportCells = new ArrayList<>();
        scoreReportCells.add(Tuple.of(student.getId().toString(), CellType.STRING));
        scoreReportCells.add(Tuple.of(student.getEppn(), CellType.STRING));
        scoreReportCells.add(Tuple.of(student.getFirstName(), CellType.STRING));
        scoreReportCells.add(Tuple.of(student.getLastName(), CellType.STRING));
        scoreReportCells.add(Tuple.of(student.getEmail(), CellType.STRING));
        scoreReportCells.add(Tuple.of(student.getIdentifier(), CellType.STRING));
        scoreReportCells.add(Tuple.of(exam.getState().name(), CellType.STRING));
        scoreReportCells.add(Tuple.of(examScore.map(score -> score.getId().toString()).orElse(""), CellType.STRING));
        return scoreReportCells;
    }

    private static void setValue(Cell cell, String value, CellType type) {
        if (type == CellType.DECIMAL) {
            cell.setCellValue(Double.parseDouble(value));
        } else {
            cell.setCellValue(value);
        }
    }

    private static void appendCell(Row row, String value) {
        int cellIndex = row.getLastCellNum() < 0 ? 0 : row.getLastCellNum();
        Cell cell = row.createCell(cellIndex);
        cell.setCellValue(value);
    }

    private static void appendCell(Row row, Double value) {
        int cellIndex = row.getLastCellNum() < 0 ? 0 : row.getLastCellNum();
        Cell cell = row.createCell(cellIndex);
        cell.setCellValue(value);
    }

    private static Tuple2<String, CellType> getScoreTuple(ExamSectionQuestion esq) {
        if (esq.getEvaluationType() == Question.EvaluationType.Selection) {
            if (esq.isApproved() && !esq.isRejected()) {
                return Tuple.of("APPROVED", CellType.STRING);
            } else {
                return Tuple.of("REJECTED", CellType.STRING);
            }
        } else {
            return Tuple.of(esq.getAssessedScore().toString(), CellType.DECIMAL);
        }
    }

    private static void appendCellsToRow(Row row, List<Tuple2<String, CellType>> cells) {
        int currentIndex = row.getLastCellNum() > 0 ? row.getLastCellNum() : 0;
        for (Tuple2<String, CellType> cell : cells) {
            Cell cellRef = row.createCell(currentIndex);
            setValue(cellRef, cell._1, cell._2);
            currentIndex++;
        }
    }

    public static ByteArrayOutputStream build(Long examId, Collection<Long> childIds) throws IOException {
        List<ExamRecord> examRecords = Ebean
            .find(ExamRecord.class)
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
            List<Tuple2<String, CellType>> data = record
                .getExamScore()
                .asCells(record.getStudent(), record.getTeacher(), record.getExam());
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

    public static ByteArrayOutputStream buildStudentReport(Exam exam, User student, MessagesApi messages)
        throws IOException {
        Lang lang;

        if (student.getLanguage() != null && student.getLanguage().getCode() != null) {
            lang = Lang.forCode(student.getLanguage().getCode());
        } else {
            lang = Lang.forCode("en");
        }

        Workbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet(messages.get(lang, "reports.scores"));
        Map<String, String> defaultHeaders = getStudentReportHeaderMap(student);
        Row headerRow = sheet.createRow(sheet.getLastRowNum());
        Row valueRow = sheet.createRow(sheet.getLastRowNum() + 1);

        for (Map.Entry<String, String> entry : defaultHeaders.entrySet()) {
            String header = entry.getKey();
            String value = entry.getValue();
            appendCell(headerRow, messages.get(lang, header));
            appendCell(valueRow, value);
        }
        int questionNumber;
        for (ExamSection es : exam.getExamSections()) {
            questionNumber = 1;
            for (ExamSectionQuestion esq : es.getSectionQuestions()) {
                String questionType = "";
                switch (esq.getQuestion().getType()) {
                    case EssayQuestion:
                        questionType = messages.get(lang, "reports.question.type.essay");
                        break;
                    case ClozeTestQuestion:
                        questionType = messages.get(lang, "reports.question.type.cloze");
                        break;
                    case MultipleChoiceQuestion:
                        questionType = messages.get(lang, "reports.question.type.multiplechoice");
                        break;
                    case WeightedMultipleChoiceQuestion:
                        questionType = messages.get(lang, "reports.question.type.weightedmultiplechoide");
                        break;
                    case ClaimChoiceQuestion:
                        questionType = messages.get(lang, "reports.question.type.claim");
                        break;
                }

                appendCell(
                    headerRow,
                    String.format("%s %d: %s", messages.get(lang, "reports.question"), questionNumber, questionType)
                );
                questionNumber++;
                Tuple2<String, CellType> scoreCellTuple = getScoreTuple(esq);
                Cell valueCell = valueRow.createCell(valueRow.getLastCellNum());
                setValue(valueCell, scoreCellTuple._1, scoreCellTuple._2);
            }
            appendCell(headerRow, messages.get(lang, "reports.scores.sectionScore", es.getName()));
            appendCell(valueRow, es.getTotalScore());
        }
        appendCell(headerRow, messages.get(lang, "reports.scores.totalScore"));
        appendCell(valueRow, exam.getTotalScore());

        IntStream.range(0, headerRow.getLastCellNum()).forEach(i -> sheet.autoSizeColumn(i, true));
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        wb.write(bos);
        bos.close();
        return bos;
    }

    public static ByteArrayOutputStream buildScoreExcel(Long examId, Collection<Long> childIds) throws IOException {
        String parentQuestionIdSql = String.join(
            " ",
            "select q.id from exam",
            "inner join exam_section as es on es.exam_id = exam.id",
            "inner join exam_section_question as esq on es.id = esq.exam_section_id",
            "inner join question as q on esq.question_id = q.id",
            "where exam.id = :id"
        );
        List<Long> parentQuestionIds = new LinkedList<>();
        Ebean
            .createSqlQuery(parentQuestionIdSql)
            .setParameter("id", examId)
            .findEachRow(
                (
                    (resultSet, rowNum) -> {
                        Long questionId = resultSet.getLong(1);
                        parentQuestionIds.add(questionId);
                    }
                )
            );
        List<Exam> childExams = Ebean
            .find(Exam.class)
            .fetch("examParticipation.user")
            .fetch("examSections.sectionQuestions.question")
            .fetch("examRecord.examScore")
            .where()
            .eq("parent.id", examId)
            .in("id", childIds)
            .findList();

        List<Long> deletedQuestionIds = childExams
            .stream()
            .flatMap(exam -> exam.getExamSections().stream())
            .flatMap(es -> es.getSectionQuestions().stream())
            .filter(esq -> isQuestionRemoved(esq, parentQuestionIds))
            .map(ExcelBuilder::getQuestionId)
            .distinct()
            .collect(Collectors.toList());

        /* Get question IDs by numbering duplicates */
        List<String> parentQuestionKeys = getListWithNumberedDuplicates(parentQuestionIds);
        List<String> deletedQuestionKeys = getListWithNumberedDuplicates(deletedQuestionIds);

        List<String> questionHeaderKeys = Stream
            .concat(parentQuestionKeys.stream(), deletedQuestionKeys.stream())
            .collect(Collectors.toList());

        Workbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet("Question scores");

        ConfigReader configReader = new ConfigReaderImpl();
        String hostname = configReader.getHostName();

        CellStyle linkStyle = wb.createCellStyle();
        Font linkFont = wb.createFont();
        linkFont.setColor(IndexedColors.BLUE.getIndex());
        linkFont.setUnderline(HSSFFont.U_SINGLE);
        linkStyle.setFont(linkFont);

        /* Create header row */
        Row headerRow = sheet.createRow(0);
        /* Set default header cells */
        for (int i = 0; i < ScoreReportDefaultHeaders.length; i++) {
            headerRow.createCell(i).setCellValue(ScoreReportDefaultHeaders[i]);
        }

        questionHeaderKeys
            .stream()
            .forEach(
                id -> {
                    if (deletedQuestionKeys.contains(id)) {
                        headerRow.createCell(headerRow.getLastCellNum()).setCellValue("removed");
                    } else {
                        Hyperlink link = wb.getCreationHelper().createHyperlink(HyperlinkType.URL);
                        link.setAddress(hostname + "/questions/" + id);
                        Cell cell = headerRow.createCell(headerRow.getLastCellNum());
                        cell.setCellStyle(linkStyle);
                        cell.setHyperlink(link);
                        cell.setCellValue("questionId_" + id);
                    }
                }
            );

        /* Iterate child exams and create excel rows */
        for (Exam exam : childExams) {
            // Skip exam if there is no participation
            if (exam.getExamParticipation() == null || exam.getExamParticipation().getUser() == null) {
                continue;
            }

            User student = exam.getExamParticipation().getUser();
            Optional<ExamScore> examScore = Optional.ofNullable(exam.getExamRecord()).map(ExamRecord::getExamScore);
            boolean isGraded =
                (
                    exam.getState() == Exam.State.GRADED ||
                    exam.getState() == Exam.State.GRADED_LOGGED ||
                    exam.getState() == Exam.State.ARCHIVED
                );

            /* Get non-score cells and append them to a new excel row */
            List<Tuple2<String, CellType>> defaultCells = getScoreReportDefaultCells(student, exam, examScore);
            Row currentRow = sheet.createRow(sheet.getLastRowNum() + 1);
            appendCellsToRow(currentRow, defaultCells);

            /* Create and append score rows */
            if (!isGraded) {
                /* Set "-" for questions that were included in the child exam but aren't yet graded */
                List<Long> questionIds = exam
                    .getExamSections()
                    .stream()
                    .flatMap(es -> es.getSectionQuestions().stream())
                    .map(ExcelBuilder::getQuestionId)
                    .collect(Collectors.toList());
                List<String> questionKeys = getListWithNumberedDuplicates(questionIds);
                for (String key : questionKeys) {
                    int currentIndex = ScoreReportDefaultHeaders.length + questionHeaderKeys.indexOf(key);
                    currentRow.createCell(currentIndex).setCellValue("-");
                }
            } else {
                /* Set scores for questions that were included in the child exam */
                Map<String, Tuple2<String, CellType>> scoreCells = getScoreCellMapWithDuplicateKeysNumbered(exam);
                for (String key : scoreCells.keySet()) {
                    if (questionHeaderKeys.contains(key)) {
                        int index = ScoreReportDefaultHeaders.length + questionHeaderKeys.indexOf(key);
                        Cell currentCell = currentRow.createCell(index);
                        Tuple2<String, CellType> cellTuple = scoreCells.get(key);
                        setValue(currentCell, cellTuple._1, cellTuple._2);
                    }
                }
            }
        }

        /* Autosize cells */
        IntStream
            .range(0, questionHeaderKeys.size() + ScoreReportDefaultHeaders.length)
            .forEach(i -> sheet.autoSizeColumn(i, true));

        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        wb.write(bos);
        bos.close();

        return bos;
    }

    /* Returns a new list from given list with duplicate IDs numbered as 2, 2#2, 2#3 etc. */
    private static List<String> getListWithNumberedDuplicates(List<Long> questionIds) {
        Set<String> questionKeys = new LinkedHashSet<>();
        Map<Long, Integer> duplicates = new HashMap<>();
        for (Long questionId : questionIds) {
            if (!questionKeys.add(questionId.toString())) {
                int duplicateCount = duplicates.get(questionId) != null ? duplicates.get(questionId) + 1 : 1;
                duplicates.put(questionId, duplicateCount);
                questionKeys.add(questionId + "#" + (duplicateCount + 1));
            }
        }
        return new ArrayList<>(questionKeys);
    }

    /* Returns a map of score cells with duplicate IDs as keys (also numbered in the same way as the method above) */
    private static Map<String, Tuple2<String, CellType>> getScoreCellMapWithDuplicateKeysNumbered(Exam childExam) {
        Map<String, Tuple2<String, CellType>> cellMap = new HashMap<>();
        Map<Long, Integer> duplicates = new HashMap<>();
        List<ExamSectionQuestion> questionList = childExam
            .getExamSections()
            .stream()
            .flatMap(es -> es.getSectionQuestions().stream())
            .collect(Collectors.toList());

        for (ExamSectionQuestion esq : questionList) {
            Long questionId = getQuestionId(esq);
            String questionKey = questionId.toString();
            Tuple2<String, CellType> scoreCell = getScoreTuple(esq);
            if (cellMap.get(questionKey) == null) {
                cellMap.put(questionId.toString(), scoreCell);
            } else {
                int duplicateCount = duplicates.get(questionId) != null ? duplicates.get(questionId) + 1 : 1;
                duplicates.put(questionId, duplicateCount);
                cellMap.put(questionId.toString() + "#" + (duplicateCount + 1), scoreCell);
            }
        }

        return cellMap;
    }

    private static Long getQuestionId(ExamSectionQuestion question) {
        if (question.getQuestion() == null) {
            return question.getId();
        }

        if (question.getQuestion().getParent() == null) {
            return question.getQuestion().getId();
        }

        return question.getQuestion().getParent().getId();
    }

    private static boolean isQuestionRemoved(ExamSectionQuestion question, List<Long> parentIds) {
        if (question.getQuestion() == null) {
            return true;
        }

        if (question.getQuestion().getParent() == null) {
            return true;
        }

        return !parentIds.contains(question.getQuestion().getParent().getId());
    }
}
