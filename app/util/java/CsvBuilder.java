package util.java;


import au.com.bytecode.opencsv.CSVWriter;
import com.avaje.ebean.Ebean;
import models.ExamRecord;
import models.dto.ExamScore;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

public class CsvBuilder {

    public static File build(Long startDate, Long endDate) throws IOException {
        Date start = new Date(startDate);
        Date end = new Date(endDate);
        List<ExamRecord> examRecords = Ebean.find(ExamRecord.class)
                .select("exam_score")
                .where()
                .between("time_stamp", start, end)
                .findList();

        List<ExamScore> examScores = examRecords.stream().map(ExamRecord::getExamScore).collect(Collectors.toList());
        File file = File.createTempFile("csv-output", ".tmp");
        CSVWriter writer = new CSVWriter(new FileWriter(file));
        writer.writeNext(ExamScore.getHeaders());
        for (ExamScore score : examScores) {
            writer.writeNext(score.asArray());
        }
        writer.close();
        return file;
    }

    public static File build(Long examId, List<Long> childIds) throws IOException {

        List<ExamRecord> examRecords = Ebean.find(ExamRecord.class)
                .where()
                .eq("exam.parent.id", examId)
                .findList();

        List<ExamScore> examScores = new ArrayList<>();
        for (ExamRecord record : examRecords) {
            if(! childIds.isEmpty() && childIds.indexOf(record.getExam().getId()) > -1) {
                examScores.add(record.getExamScore());
            }
        }

        SimpleDateFormat df = new SimpleDateFormat("dd-MM-yyyy");

        File file = File.createTempFile("csv-output-" + df.format(new Date()), ".tmp");
        CSVWriter writer = new CSVWriter(new FileWriter(file));
        writer.writeNext(ExamScore.getHeaders());
        for (ExamScore score : examScores) {
            writer.writeNext(score.asArray());
        }
        writer.close();
        return file;
    }
}
