package exceptions;

public class MalformedDataException extends SitnetException {
    public MalformedDataException() {
    }

    public MalformedDataException(String message) {
        super(message);
    }
}
