package models.answers;

/**
 * Created by avainik on 3/10/14.
 */
public interface AnswerInterface {

    // each question should return its type
    public String getType();

    // each question generates hash in a different manner, depending on attributes it has
    public String generateHash();

}
