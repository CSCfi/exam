package models.api;


public interface Scorable {

    Double getAssessedScore();
    Double getMaxAssessedScore();
    boolean isRejected();
    boolean isApproved();
    String getValidationResult();

}
