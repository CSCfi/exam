package util.java;


import au.com.bytecode.opencsv.CSVWriter;
import com.avaje.ebean.Ebean;
import models.ExamRecord;
import models.dto.ExamScore;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class CsvBuilder {

    public static File build(Long startDate, Long endDate) throws IOException {
        Date start = new Date(startDate);
        Date end = new Date(endDate);
        List<ExamRecord> examRecords = Ebean.find(ExamRecord.class)
                .select("exam_score")
                .where()
                .between("time_stamp", start, end)
                .findList();

        List<ExamScore> examScores = new ArrayList<>();
        for (ExamRecord record : examRecords) {
            examScores.add(record.getExamScore());
        }
        File file = File.createTempFile("csv-output", ".tmp");
        CSVWriter writer = new CSVWriter(new FileWriter(file));
        writer.writeNext(ExamScore.getHeaders());
        for (ExamScore score : examScores) {
            writer.writeNext(score.asArray());
        }
        writer.close();
        return file;
    }

}
