package models.questions;

public interface QuestionInterface {


//    public String getContent();

    // each question should return its type
	public String getType();

    // each question generates hash in a different manner, depending on attributes it has
    public String generateHash();
	
}
