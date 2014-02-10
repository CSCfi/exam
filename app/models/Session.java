package models;

import org.joda.time.DateTime;

public class Session {
    private Long userId;
    private DateTime since;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public DateTime getSince() {
        return since;
    }

    public void setSince(DateTime since) {
        this.since = since;
    }
}
