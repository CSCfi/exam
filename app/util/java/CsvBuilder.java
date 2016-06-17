package util.java;


import au.com.bytecode.opencsv.CSVReader;
import au.com.bytecode.opencsv.CSVWriter;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import models.*;
import models.dto.ExamScore;
import play.Logger;
import util.AppUtil;

import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.util.Date;
import java.util.List;

public class CsvBuilder {

    public static File build(Long startDate, Long endDate) throws IOException {
        Date start = new Date(startDate);
        Date end = new Date(endDate);
        List<ExamRecord> examRecords = Ebean.find(ExamRecord.class)
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

    public static File build(Long examId, List<Long> childIds) throws IOException {

        List<ExamRecord> examRecords = Ebean.find(ExamRecord.class)
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

    public static void parseGrades(File csvFile, User user, Role.Name role) throws IOException {
        CSVReader reader = new CSVReader(new FileReader(csvFile));
        String[] records;
        while ((records = reader.readNext()) != null) {
            if (records.length < 2) {
                Logger.warn("Mandatory information missing, unable to grade");
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
                Logger.warn("Invalid input, unable to grade");
                continue;
            }
            ExpressionList<Exam> el = Ebean.find(Exam.class).where()
                    .idEq(examId)
                    .isNotNull("parent")
                    .disjunction()
                    .eq("state", Exam.State.REVIEW)
                    .eq("state", Exam.State.REVIEW_STARTED)
                    .endJunction();
            if (role == Role.Name.ADMIN) {
                el = el.eq("parent.examOwners", user);
            }
            Exam exam = el.findUnique();
            if (exam == null) {
                Logger.warn("Exam with id {} not found or inaccessible, unable to grade it", examId);
                continue;
            }
            String gradeName = records[1];
            List<Grade> grades = Ebean.find(Grade.class).where()
                    .eq("name", gradeName)
                    .eq("gradeScale", exam.getGradeScale())
                    .findList();
            if (grades.isEmpty()) {
                Logger.warn("No grade found with name {}", gradeName);
            }
            else if (grades.size() > 1) {
                Logger.warn("Multiple grades found with name {}", gradeName);
            } else {
                exam.setGrade(grades.get(0));
                exam.setGradedByUser(user);
                exam.setGradedTime(new Date());
                exam.setState(Exam.State.GRADED);
                exam.setAnswerLanguage(exam.getExamLanguages().get(0).getCode());
                exam.setCreditType(exam.getExamType());
                String feedback = records.length > 2 ? records[2] : null;
                if (feedback != null && !feedback.isEmpty()) {
                    Comment comment = exam.getExamFeedback();
                    if (comment == null) {
                        comment = new Comment();
                        AppUtil.setCreator(comment, user);
                    }
                    AppUtil.setModifier(comment, user);
                    comment.setComment(feedback);
                    comment.save();
                    exam.setExamFeedback(comment);
                }
                exam.update();
            }
        }
        reader.close();
    }
}
