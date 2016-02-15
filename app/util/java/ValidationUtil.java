package util.java;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.Date;

public class ValidationUtil {

    public static String validateExamForm(JsonNode node) {

        Long start, end, now = new Date().getTime();
        long day = 1000 * 60 * 60 * 24;

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

        if(start >= end + day) {
            return "sitnet_error_end_sooner_than_start";
        }

        if(end + day <= now) {
            return "sitnet_error_end_sooner_than_now";
        }

        return null;
    }
}
