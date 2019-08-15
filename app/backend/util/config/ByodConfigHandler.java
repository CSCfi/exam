package backend.util.config;

import java.io.IOException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Optional;
import javax.xml.parsers.ParserConfigurationException;

import com.google.inject.ImplementedBy;
import org.cryptonode.jncryptor.CryptorException;
import org.xml.sax.SAXException;
import play.mvc.Http;
import play.mvc.Result;

@ImplementedBy(ByodConfigHandlerImpl.class)
public interface ByodConfigHandler {

    byte[] getExamConfig(String hash, byte[] pwd, String salt) throws IOException, CryptorException;
    String calculateConfigKey(String hash) throws IOException, ParserConfigurationException, SAXException,
            InvalidKeyException, NoSuchAlgorithmException;
    String getPlaintextPassword(byte[] pwd, String salt) throws CryptorException;
    byte[] getEncryptedPassword(String pwd, String salt) throws CryptorException;
    Optional<Result> checkUserAgent(Http.RequestHeader request, String examConfigKey);

}
