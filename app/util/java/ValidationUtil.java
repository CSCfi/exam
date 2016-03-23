package util.java;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.Date;

public class ValidationUtil {

    private static final int MS_IN_DAY = 1000 * 60 * 60 * 24;

    public static String validateExamForm(JsonNode node) {

        Long start, end, now = new Date().getTime();

        String examName = node.has("name") ? node.get("name").asText() : null;

        if(examName == null || examName.isEmpty()) {
            return "sitnet_error_exam_empty_name";
        }

        try {
            start = node.get("examActiveStartDate").asLong();
        } catch(Exception e) {
            return "sitnet_error_start_date";
        }

        try {
            end = node.get("examActiveEndDate").asLong();
        } catch(Exception e) {
            return "sitnet_error_end_date";
        }

        if(start >= end + MS_IN_DAY) {
            return "sitnet_error_end_sooner_than_start";
        }

        if(end + MS_IN_DAY <= now) {
            return "sitnet_error_end_sooner_than_now";
        }

        return null;
    }
}
