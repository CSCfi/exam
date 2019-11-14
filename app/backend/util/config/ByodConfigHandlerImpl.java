package backend.util.config;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.zip.GZIPOutputStream;
import javax.inject.Inject;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.commons.codec.digest.DigestUtils;
import org.cryptonode.jncryptor.AES256JNCryptor;
import org.cryptonode.jncryptor.CryptorException;
import org.cryptonode.jncryptor.JNCryptor;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;
import play.Environment;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

import backend.util.file.FileHandler;

public class ByodConfigHandlerImpl implements ByodConfigHandler {

    private static final String START_URL_PLACEHOLDER = "*** startURL ***";
    private static final String QUIT_PWD_PLACEHOLDER = "*** quitPwd ***";
    private static final String PASSWORD_ENCRYPTION = "pswd";

    private FileHandler fileHandler;
    private ConfigReader configReader;
    private Environment env;

    @Inject
    ByodConfigHandlerImpl(FileHandler fileHandler, ConfigReader configReader, Environment env) {
        this.fileHandler = fileHandler;
        this.configReader = configReader;
        this.env = env;
    }

    private String getTemplate(String hash) {
        String path = String.format("%s/conf/seb.template.plist", env.rootPath().getAbsolutePath());
        String startUrl = String.format("%s?exam=%s", configReader.getHostName(), hash);
        String template = fileHandler.read(path).replace(START_URL_PLACEHOLDER, startUrl);
        String quitPwd = DigestUtils.sha256Hex(configReader.getQuitPassword());
        return template.replace(QUIT_PWD_PLACEHOLDER, quitPwd);
    }

    private byte[] compress(byte[] data) throws IOException {
        ByteArrayOutputStream obj = new ByteArrayOutputStream();
        GZIPOutputStream gzip = new GZIPOutputStream(obj);
        gzip.write(data);
        gzip.flush();
        gzip.close();
        return obj.toByteArray();
    }

    private Optional<JsonNode> plistValueToJson(Node valueNode) {
        switch (valueNode.getNodeName()) {
            case "true":
                return Optional.of(JsonNodeFactory.instance.booleanNode(true));
            case "false":
                return Optional.of(JsonNodeFactory.instance.booleanNode(false));
            case "string":
            case "data":
                String value = valueNode.hasChildNodes() ? valueNode.getFirstChild().getNodeValue() : "";
                return Optional.of(JsonNodeFactory.instance.textNode(
                        value.trim().replaceAll("\n", "")
                ));
            case "integer":
                return Optional.of(JsonNodeFactory.instance.numberNode(
                        Integer.parseInt(valueNode.getFirstChild().getNodeValue())
                ));
            case "array":
                ArrayNode an = JsonNodeFactory.instance.arrayNode();
                for (int i = 0; i < valueNode.getChildNodes().getLength(); ++i) {
                    Node child = valueNode.getChildNodes().item(i);
                    if (child.getNodeType() == Node.ELEMENT_NODE) {
                        plistValueToJson(child).ifPresent(an::add);
                    }
                }
                return Optional.of(an);
            case "dict":
                return plistDictToJson(valueNode);
            default:
                throw new IllegalArgumentException();
        }
    }

    private Optional<JsonNode> plistDictToJson(Node dictNode) {
        if (!dictNode.hasChildNodes()) {
            return Optional.empty();
        }
        NodeList nodes = dictNode.getChildNodes();
        ObjectNode jsonNode = JsonNodeFactory.instance.objectNode();
        for (int i = 0; i < nodes.getLength(); ++i) {
            Node n = nodes.item(i);
            if (n.getNodeType() == Node.ELEMENT_NODE && n.getNodeName().equals("key")) {
                String name = n.getFirstChild().getNodeValue();
                if (!name.equals("originatorVersion")) {
                    Node valueNode = nodes.item(i + 2);
                    plistValueToJson(valueNode).ifPresent(v -> jsonNode.set(name, v));
                }
            }
        }
        return Optional.of(jsonNode);
    }

    private String jsonToSortedString(JsonNode node) throws JsonProcessingException {
        ObjectMapper om = new ObjectMapper();
        om.configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
        Map<String, Object> map = om.convertValue(node, new TypeReference<Map<String, Object>>() {
        });
        Map<String, Object> tm = new TreeMap<>(Comparator.comparing(String::toLowerCase));
        tm.putAll(map);
        return om.writeValueAsString(tm);
    }

    @Override
    public byte[] getExamConfig(String hash, byte[] pwd, String salt) throws IOException, CryptorException {
        String template = getTemplate(hash);
        byte[] templateGz = compress(template.getBytes(StandardCharsets.UTF_8));
        JNCryptor crypto = new AES256JNCryptor();

        // Decrypt user defined setting password
        String key = configReader.getSettingsPasswordEncryptionKey();
        byte[] saltedPwd = crypto.decryptData(pwd, key.toCharArray());
        String plainTextPwd = new String(saltedPwd, StandardCharsets.UTF_8).replace(salt, "");

        // Encrypt the config file using unencrypted password
        byte[] cipherText = crypto.encryptData(templateGz, plainTextPwd.toCharArray());
        byte[] header = PASSWORD_ENCRYPTION.getBytes(StandardCharsets.UTF_8);
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            outputStream.write(header);
            outputStream.write(cipherText);
            return compress(outputStream.toByteArray());
        }
    }

    @Override
    public String getPlaintextPassword(byte[] pwd, String salt) throws CryptorException {
        // Decrypt user defined setting password
        JNCryptor crypto = new AES256JNCryptor();
        String key = configReader.getSettingsPasswordEncryptionKey();
        byte[] saltedPwd = crypto.decryptData(pwd, key.toCharArray());
        return new String(saltedPwd, StandardCharsets.UTF_8).replace(salt, "");
    }

    @Override
    public byte[] getEncryptedPassword(String pwd, String salt) throws CryptorException {
        JNCryptor crypto = new AES256JNCryptor();
        String key = configReader.getSettingsPasswordEncryptionKey();
        return crypto.encryptData((pwd + salt).getBytes(StandardCharsets.UTF_8), key.toCharArray());
    }

    @Override
    public Optional<Result> checkUserAgent(Http.RequestHeader request, String examConfigKey) {
        String protocol = request.secure() ? "https://" : "http://";
        String absoluteUrl = String.format("%s%s%s", protocol, request.host(), request.uri());

        Optional<String> oc = request.header("X-SafeExamBrowser-ConfigKeyHash");
        if (oc.isEmpty()) {
            return Optional.of(Results.unauthorized("SEB headers missing"));
        } else {
            String eckDigest = DigestUtils.sha256Hex(absoluteUrl + examConfigKey);
            if (!eckDigest.equals(oc.get())) {
                return Optional.of(Results.unauthorized("Wrong configuration key digest"));
            }
        }
        return Optional.empty();
    }


    @Override
    public String calculateConfigKey(String hash) throws IOException, ParserConfigurationException, SAXException {
        Document doc;
        try (StringReader reader = new StringReader(getTemplate(hash))) {
            InputSource src = new InputSource(reader);
            DocumentBuilder builder = DocumentBuilderFactory.newInstance().newDocumentBuilder();
            doc = builder.parse(src);
        }
        // Construct a Json-like structure out of the plist for encryption, see SEB documentation for details
        Node dictionary = doc.getDocumentElement().getElementsByTagName("dict").item(0);
        Optional<JsonNode> sebJson = plistDictToJson(dictionary);

        if (sebJson.isPresent()) {
            String ordered = jsonToSortedString(sebJson.get());
            String unescaped = ordered.replaceAll("\\\\\\\\", "\\\\");
            return DigestUtils.sha256Hex(unescaped);
        }
        throw new IOException("Failed in converting the seb.plist to json");
    }


}
