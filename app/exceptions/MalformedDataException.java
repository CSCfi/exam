package exceptions;

public class MalformedDataException extends RuntimeException {
    public MalformedDataException() {
    }

    public MalformedDataException(String message) {
        super(message);
    }
}
