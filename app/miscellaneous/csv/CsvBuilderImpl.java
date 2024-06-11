// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.csv;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.TextNode;
import com.opencsv.CSVParser;
import com.opencsv.CSVParserBuilder;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import com.opencsv.CSVWriter;
import com.opencsv.exceptions.CsvException;
import io.ebean.DB;
import io.ebean.ExpressionList;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import models.admin.ExamScore;
import models.assessment.Comment;
import models.assessment.ExamRecord;
import models.exam.Exam;
import models.exam.Grade;
import models.exam.GradeScale;
import models.user.Role;
import models.user.User;
import org.joda.time.DateTime;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class CsvBuilderImpl implements CsvBuilder {

    private final Logger logger = LoggerFactory.getLogger(CsvBuilderImpl.class);

    @Override
    public File build(Long startDate, Long endDate) throws IOException {
        Date start = new Date(startDate);
        Date end = new Date(endDate);
        List<ExamRecord> examRecords = DB
            .find(ExamRecord.class)
            .fetch("examScore")
            .where()
            .between("timeStamp", start, end)
            .findList();

        File file = File.createTempFile("csv-output", ".tmp");
        CSVWriter writer = new CSVWriter(new FileWriter(file));
        writer.writeNext(ExamScore.getHeaders());
        for (ExamRecord record : examRecords) {
            writer.writeNext(record.getExamScore().asArray(record.getStudent(), record.getTeacher(), record.getExam()));
        }
        writer.close();
        return file;
    }

    @Override
    public File build(Long examId, Collection<Long> childIds) throws IOException {
        List<ExamRecord> examRecords = DB
            .find(ExamRecord.class)
            .fetch("examScore")
            .where()
            .eq("exam.parent.id", examId)
            .in("exam.id", childIds)
            .findList();

        File file = File.createTempFile("csv-output-", ".tmp");
        CSVWriter writer = new CSVWriter(new FileWriter(file));
        writer.writeNext(ExamScore.getHeaders());
        for (ExamRecord record : examRecords) {
            writer.writeNext(record.getExamScore().asArray(record.getStudent(), record.getTeacher(), record.getExam()));
        }
        writer.close();
        return file;
    }

    @Override
    public File build(JsonNode node) throws IOException {
        File file = File.createTempFile("csv-output-", ".tmp");
        CSVWriter writer = new CSVWriter(new FileWriter(file));
        writer.writeNext(getHeaders());
        StreamSupport
            .stream(node.spliterator(), false)
            .forEach(assessment -> writer.writeNext(values(assessment).toArray(String[]::new)));
        writer.close();
        return file;
    }

    private CSVReader detectDelimiter(File csvFile) throws IOException, CsvException {
        final int GRADES_FIRST_ROW_COLUMN_COUNT = 6;

        // Init parsed with colon file
        CSVParser parserColon = new CSVParserBuilder().withSeparator(',').build();
        CSVReader readerColon = new CSVReaderBuilder(new FileReader(csvFile)).withCSVParser(parserColon).build();
        String[] recordFirstRowColon = readerColon.readNext();

        // Init parsed with semicolon file
        CSVParser parserSemicolon = new CSVParserBuilder().withSeparator(';').build();
        CSVReader readerSemicolon = new CSVReaderBuilder(new FileReader(csvFile))
            .withCSVParser(parserSemicolon)
            .build();
        String[] recordFirstRowSemiColon = readerSemicolon.readNext();

        // Test all; return if valid; return null
        if (recordFirstRowColon.length == GRADES_FIRST_ROW_COLUMN_COUNT) {
            return readerColon;
        } else if (recordFirstRowSemiColon.length == GRADES_FIRST_ROW_COLUMN_COUNT) {
            return readerSemicolon;
        } else {
            logger.warn("Invalid column count");
            return null;
        }
    }

    @Override
    public void parseGrades(File csvFile, User user, Role.Name role) throws IOException, CsvException {
        CSVReader reader = detectDelimiter(csvFile);
        if (reader == null) {
            logger.warn("Cannot read grades");
            return;
        }

        String[] records;
        while ((records = reader.readNext()) != null) {
            if (records.length < 2) {
                logger.warn("Mandatory information missing, unable to grade");
                continue;
            }
            if (records[0].equalsIgnoreCase("exam id")) {
                // this appears to be a header
                continue;
            }
            Long examId;
            try {
                examId = Long.parseLong(records[0]);
            } catch (NumberFormatException e) {
                logger.warn("Invalid input, unable to grade");
                continue;
            }
            ExpressionList<Exam> el = DB
                .find(Exam.class)
                .where()
                .idEq(examId)
                .isNotNull("parent")
                .disjunction()
                .eq("state", Exam.State.REVIEW)
                .eq("state", Exam.State.REVIEW_STARTED)
                .endJunction();
            if (role == Role.Name.ADMIN) {
                el = el.eq("parent.examOwners", user);
            }
            Exam exam = el.findOne();
            if (exam == null) {
                logger.warn("Exam with id {} not found or inaccessible, unable to grade it", examId);
                continue;
            }
            String gradeName = records[1];
            GradeScale scale = exam.getGradeScale() == null ? exam.getCourse().getGradeScale() : exam.getGradeScale();
            List<Grade> grades = DB.find(Grade.class).where().eq("name", gradeName).eq("gradeScale", scale).findList();
            if (grades.isEmpty()) {
                logger.warn("No grade found with name {}", gradeName);
            } else if (grades.size() > 1) {
                logger.warn("Multiple grades found with name {}", gradeName);
            } else {
                exam.setGrade(grades.getFirst());
                exam.setGradedByUser(user);
                exam.setGradedTime(DateTime.now());
                exam.setState(Exam.State.GRADED);
                exam.setAnswerLanguage(exam.getExamLanguages().getFirst().getCode());
                exam.setCreditType(exam.getExamType());
                String feedback = records.length > 2 ? records[2] : null;
                if (feedback != null && !feedback.isEmpty()) {
                    Comment comment = exam.getExamFeedback();
                    if (comment == null) {
                        comment = new Comment();
                        comment.setCreatorWithDate(user);
                    }
                    comment.setModifierWithDate(user);
                    comment.setComment(Jsoup.clean(feedback, Safelist.relaxed()));
                    comment.save();
                    exam.setExamFeedback(comment);
                }
                exam.update();
            }
        }
        reader.close();
    }

    private String[] getHeaders() {
        return new String[] {
            "id",
            "studentFirstName",
            "studentLastName",
            "studentEmail",
            "examName",
            "examDate",
            "creditType",
            "credits",
            "creditLanguage",
            "studentGrade",
            "gradeScale",
            "examScore",
            "lecturer",
            "lecturerFirstName",
            "lecturerLastName",
            "lecturerEmail",
            "lecturerEmployeeNumber",
            "date",
            "additionalInfo",
        };
    }

    private Stream<String> values(JsonNode assessment) {
        JsonNode student = assessment.get("user");
        JsonNode exam = assessment.get("exam");
        JsonNode teacher = exam.get("gradedByUser");
        DateTimeFormatter dtf = DateTimeFormat.forPattern("yyyy-MM-dd");
        JsonNode[] nodes = {
            assessment.get("_id"),
            student.get("firstName"),
            student.get("lastName"),
            student.get("email"),
            exam.get("name"),
            new TextNode(dtf.print(assessment.get("ended").asLong())),
            exam.get("creditType").get("type"),
            exam.get("customCredit"),
            exam.get("answerLanguage"),
            exam.get("grade").get("name"),
            exam.get("gradeScale").get("description"),
            exam.get("totalScore"),
            teacher.path("eppn"),
            teacher.get("firstName"),
            teacher.get("lastName"),
            teacher.get("email"),
            teacher.path("employeeNumber"),
            exam.get("gradedTime"),
            exam.path("additionalInfo"),
        };
        return Stream.of(nodes).map(JsonNode::asText);
    }
}
