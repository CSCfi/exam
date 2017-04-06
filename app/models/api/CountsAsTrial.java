package models.api;


import org.joda.time.DateTime;

public interface CountsAsTrial {

    DateTime getTrialTime();

    boolean isProcessed();
}
