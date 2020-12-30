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

    private static int appendCell(Row row, String value) {
        int cellIndex = row.getLastCellNum() < 0 ? 0 : row.getLastCellNum();
        Cell cell = row.createCell(cellIndex);
        cell.setCellValue(value);
        return cellIndex;
    }

    private static int appendCell(Row row, Double value) {
        int cellIndex = row.getLastCellNum() < 0 ? 0 : row.getLastCellNum();
        Cell cell = row.createCell(cellIndex);
        cell.setCellValue(value);
        return cellIndex;
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

        autosizeColumns(headerRow, sheet);
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        wb.write(bos);
        bos.close();
        return bos;
    }

    public static ByteArrayOutputStream buildScoreExcel(Long examId, Collection<Long> childIds) throws IOException {
        /* Create workbook and new sheet */
        Workbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet("Question scores");

        /* Read hostname from config, needed for hyperlinks */
        ConfigReader configReader = new ConfigReaderImpl();
        String hostname = configReader.getHostName();

        /* Create cell style for hyperlinks */
        CellStyle linkStyle = wb.createCellStyle();
        Font linkFont = wb.createFont();
        linkFont.setColor(IndexedColors.BLUE.getIndex());
        linkFont.setUnderline(HSSFFont.U_SINGLE);
        linkStyle.setFont(linkFont);

        Exam parentExam = Ebean
            .find(Exam.class)
            .fetch("examSections.sectionQuestions.question")
            .where()
            .eq("id", examId)
            .findOne();

        List<Exam> childExams = Ebean
            .find(Exam.class)
            .fetch("examParticipation.user")
            .fetch("examSections.sectionQuestions.question")
            .fetch("examRecord.examScore")
            .where()
            .eq("parent.id", examId)
            .in("id", childIds)
            .findList();

        /* Deleted question ids are used to set question headers as "removed" */
        Set<Long> deletedQuestionIds = getDeletedQuestionIds(parentExam, childExams);

        /* First we need to map all question ids to section names from parent and child exams */
        // section name -> question id
        Map<String, Set<Long>> questionIdsBySectionName = new LinkedHashMap<>();

        parentExam
            .getExamSections()
            .stream()
            .forEach(
                es -> {
                    String sectionName = es.getName();
                    Set<Long> questionIds = extractQuestionIdsFromSection(es);
                    questionIdsBySectionName.put(sectionName, questionIds);
                }
            );

        /* Go through child exams and add missing questions/sections to map */
        childExams
            .stream()
            .flatMap(exam -> exam.getExamSections().stream())
            .forEach(
                es -> {
                    String sectionName = es.getName();
                    Set<Long> childQuestionIds = extractQuestionIdsFromSection(es);
                    if (questionIdsBySectionName.containsKey(sectionName)) {
                        /* Section exists, merge question id set from child exam to parent question ids */
                        questionIdsBySectionName.get(sectionName).addAll(childQuestionIds);
                    } else {
                        /* Add new entry since section didn't exist */
                        questionIdsBySectionName.put(sectionName, childQuestionIds);
                    }
                }
            );

        /* Create header row */
        Row headerRow = sheet.createRow(0);
        /* Set default header cells */
        for (int i = 0; i < ScoreReportDefaultHeaders.length; i++) {
            headerRow.createCell(i).setCellValue(ScoreReportDefaultHeaders[i]);
        }

        /* These variables will store spreadsheet column indexes for question/section/total scores */
        // section name -> question id -> column index
        Map<String, Map<Long, Integer>> questionColumnIndexesBySectionName = new HashMap<>();
        // section name -> column index
        Map<String, Integer> sectionTotalIndexesBySectionName = new HashMap<>();
        // index for total score column
        int totalScoreIndex;

        /* Start inserting header columns to spreadsheet, save column indexes to maps above */
        questionIdsBySectionName
            .entrySet()
            .forEach(
                sectionMap -> {
                    String sectionName = sectionMap.getKey();
                    Map<Long, Integer> columnIndexesByQuestionIds = new HashMap<>();
                    for (Long questionId : sectionMap.getValue()) {
                        if (deletedQuestionIds.contains(questionId)) {
                            /* Question is deleted, set header as "removed" */
                            int columnIndex = appendCell(headerRow, "removed");
                            columnIndexesByQuestionIds.put(questionId, columnIndex); // saves the column index
                        } else {
                            /* Question exists on parent, create question header cell with id and add hyperlink to question */
                            Hyperlink link = wb.getCreationHelper().createHyperlink(HyperlinkType.URL);
                            int columnIndex = headerRow.getLastCellNum();
                            link.setAddress(hostname + "/questions/" + questionId);
                            Cell cell = headerRow.createCell(columnIndex);
                            cell.setCellStyle(linkStyle);
                            cell.setHyperlink(link);
                            cell.setCellValue("questionId_" + questionId);
                            columnIndexesByQuestionIds.put(questionId, columnIndex);
                        }
                    }
                    /* Save "question id -> column index" hashmap under current section name */
                    questionColumnIndexesBySectionName.put(sectionName, columnIndexesByQuestionIds);

                    /* Set header cell for section's total score column and save column index again */
                    int sectionTotalIdx = appendCell(headerRow, "Aihealueen " + sectionName + " pisteet");
                    sectionTotalIndexesBySectionName.put(sectionName, sectionTotalIdx);
                }
            );
        /* Also set exam's total score column header and save index */
        totalScoreIndex = appendCell(headerRow, "Kokonaispisteet");

        /* Iterate child exams and create excel rows */
        for (Exam exam : childExams) {
            /* Skip exam if there is no participation */
            if (exam.getExamParticipation() == null || exam.getExamParticipation().getUser() == null) {
                continue;
            }

            User student = exam.getExamParticipation().getUser();
            Optional<ExamScore> examScore = Optional.ofNullable(exam.getExamRecord()).map(ExamRecord::getExamScore);
            boolean isGraded =
                exam.getState() == Exam.State.GRADED ||
                exam.getState() == Exam.State.GRADED_LOGGED ||
                exam.getState() == Exam.State.ARCHIVED;

            /* Get non-score cells and append them to a new excel row */
            List<Tuple2<String, CellType>> defaultCells = getScoreReportDefaultCells(student, exam, examScore);
            Row currentRow = sheet.createRow(sheet.getLastRowNum() + 1);
            appendCellsToRow(currentRow, defaultCells);

            /* Start inserting question/section scores to spreadsheet columns */
            for (ExamSection es : exam.getExamSections()) {
                String sectionName = es.getName();
                for (ExamSectionQuestion esq : es.getSectionQuestions()) {
                    Long questionId = getQuestionId(esq);
                    /* Get column index from nested hashmap with section name and question id */
                    int questionColumnIndex = questionColumnIndexesBySectionName.get(sectionName).get(questionId);

                    /* Set score if exam is graded, otherwise add "-" to the question cell */
                    if (isGraded) {
                        Tuple2<String, CellType> scoreTuple = getScoreTuple(esq);
                        Cell currentCell = currentRow.createCell(questionColumnIndex);
                        setValue(currentCell, scoreTuple._1, scoreTuple._2);
                    } else {
                        currentRow.createCell(questionColumnIndex).setCellValue("-");
                    }
                }
                /* Get the index of section total score column */
                int sectionIndex = sectionTotalIndexesBySectionName.get(sectionName);

                /* Again, set score if exam was graded, otherwise "-" */
                if (isGraded) {
                    currentRow.createCell(sectionIndex).setCellValue(es.getTotalScore());
                } else {
                    currentRow.createCell(sectionIndex).setCellValue("-");
                }
            }

            /* Lastly set exam total score to correct column (or "-" if !isGraded) */
            if (isGraded) {
                currentRow.createCell(totalScoreIndex).setCellValue(exam.getTotalScore());
            } else {
                currentRow.createCell(totalScoreIndex).setCellValue("-");
            }
        }

        /* Autosize cells */
        autosizeColumns(headerRow, sheet);
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        wb.write(bos);
        bos.close();

        return bos;
    }

    private static Set<Long> extractQuestionIdsFromSection(ExamSection es) {
        return es.getSectionQuestions().stream().map(ExcelBuilder::getQuestionId).collect(Collectors.toSet());
    }

    private static Set<Long> getDeletedQuestionIds(Exam parent, List<Exam> childExams) {
        Set<Long> parentQuestionIds = parent
            .getExamSections()
            .stream()
            .flatMap(es -> es.getSectionQuestions().stream())
            .filter(esq -> esq.getQuestion() != null && esq.getQuestion().getId() != null)
            .map(esq -> esq.getQuestion().getId())
            .collect(Collectors.toSet());

        return childExams
            .stream()
            .flatMap(exam -> exam.getExamSections().stream())
            .flatMap(es -> es.getSectionQuestions().stream())
            .filter(esq -> isQuestionRemoved(esq, parentQuestionIds))
            .map(ExcelBuilder::getQuestionId)
            .collect(Collectors.toSet());
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

    private static boolean isQuestionRemoved(ExamSectionQuestion question, Set<Long> parentIds) {
        if (question.getQuestion() == null) {
            return true;
        }

        if (question.getQuestion().getParent() == null) {
            return true;
        }

        return !parentIds.contains(question.getQuestion().getParent().getId());
    }

    private static void autosizeColumns(Row header, Sheet sheet) {
        /* Autosize cells */
        IntStream.range(0, header.getLastCellNum()).forEach(i -> sheet.autoSizeColumn(i, true));
    }
}
