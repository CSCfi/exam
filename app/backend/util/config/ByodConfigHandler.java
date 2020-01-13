package backend.util.config;

import java.util.Optional;

import play.mvc.Http;
import play.mvc.Result;

public interface ByodConfigHandler {

    byte[] getExamConfig(String hash, byte[] pwd, String salt);
    String calculateConfigKey(String hash);
    String getPlaintextPassword(byte[] pwd, String salt);
    byte[] getEncryptedPassword(String pwd, String salt);
    Optional<Result> checkUserAgent(Http.RequestHeader request, String examConfigKey);

}
