// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2
package controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.typesafe.config.Config;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import javax.inject.Inject;
import play.mvc.Controller;
import play.mvc.Result;

public class JwksController extends Controller {

    private final Config config;

    @Inject
    public JwksController(Config config) {
        this.config = config;
    }

    public Result jwks() throws Exception {
        String publicKeyPem = config.getString("lti.platform.public-key");
        String keyId = config.getString("lti.platform.key-id");

        RSAPublicKey publicKey = loadRSAPublicKeyFromFile(publicKeyPem);
        RSAKey jwk = new RSAKey.Builder(publicKey).keyID(keyId).algorithm(com.nimbusds.jose.JWSAlgorithm.RS256).build();

        JWKSet set = new JWKSet(jwk);
        ObjectMapper mapper = new ObjectMapper();
        String json = mapper.writeValueAsString(set.toJSONObject());
        return ok(json).as("application/json");
    }

    private RSAPublicKey loadPublicKey(String pem) throws Exception {
        String key = pem
            .replace("-----BEGIN PUBLIC KEY-----", "")
            .replace("-----END PUBLIC KEY-----", "")
            .replaceAll("\\s", "");
        byte[] decoded = Base64.getDecoder().decode(key);
        X509EncodedKeySpec spec = new X509EncodedKeySpec(decoded);
        KeyFactory kf = KeyFactory.getInstance("RSA");
        return (RSAPublicKey) kf.generatePublic(spec);
    }

    public RSAPublicKey loadRSAPublicKeyFromFile(String filePath) throws Exception {
        // Read the PEM file content
        String pem = new String(Files.readAllBytes(Paths.get(filePath)));
        return loadPublicKey(pem);
    }
}
