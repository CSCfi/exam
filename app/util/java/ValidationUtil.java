package util.java;

import play.data.DynamicForm;

import java.util.Date;

/**
 * Created by Mikko Katajamaki on 05/12/14.
 */
public class ValidationUtil {

    public static String validateExamForm(DynamicForm df) {

        Long start, end, now = new Date().getTime();
        long day = 1000 * 60 * 60 * 24;

        String examName = df.get("name");

        if(examName == null || examName.isEmpty()) {
            return "sitnet_error_exam_empty_name";
        }

        try {
            start = new Long(df.get("examActiveStartDate"));
        } catch(Exception e) {
            return "sitnet_error_start_date";
        }

        try {
            end = new Long(df.get("examActiveEndDate"));
        } catch(Exception e) {
            return "sitnet_error_end_date";
        }

        if(start >= end + day) {
            return "sitnet_error_end_sooner_than_start";
        }

        if(end + day <= now) {
            return "sitnet_error_end_sooner_than_now";
        }

        return "OK";
    }
}