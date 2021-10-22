package athenarc.imsi.sdl.service.util;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.apache.commons.lang3.RandomStringUtils;
import org.bson.Document;

/**
 * Utility class for generating random Strings.
 */
public final class RandomUtil {

    private static final int DEF_COUNT = 20;

    private static final SecureRandom SECURE_RANDOM;

    static {
        SECURE_RANDOM = new SecureRandom();
        SECURE_RANDOM.nextBytes(new byte[64]);
    }

    private RandomUtil() {
    }

    private static String generateRandomAlphanumericString() {
        return RandomStringUtils.random(DEF_COUNT, 0, 0, true, true, null, SECURE_RANDOM);
    }

    /**
     * Generate a password.
     *
     * @return the generated password.
     */
    public static String generatePassword() {
        return generateRandomAlphanumericString();
    }

    /**
     * Generate an activation key.
     *
     * @return the generated activation key.
     */
    public static String generateActivationKey() {
        return generateRandomAlphanumericString();
    }

    /**
     * Generate a reset key.
     *
     * @return the generated reset key.
     */
    public static String generateResetKey() {
        return generateRandomAlphanumericString();
    }

    public static String getAnalysisDescription(final Document config, boolean completed) {
        String description = (completed) ? "Completed " : "Executing ";

        description += String.join(", ", (ArrayList<String>) config.get("analyses"));
        description += " with metapath(s): ";

        final List<Document> queries = (List<Document>) config.get("queries");
        List<String> metapathDescriptions = new ArrayList<>();
        for (Document query : queries) {

            String descr = (String) query.get("metapath");

            final ArrayList<String> constraints = new ArrayList<>();
            for (final Map.Entry<String, Object> entry : ((Document)query.get("constraints")).entrySet()) {
                constraints.add(entry.getKey().trim() + "." + ((String)entry.getValue()).trim());
            }
            descr += " { " + String.join(", ", constraints) + " }";
            metapathDescriptions.add(descr);
        }
        description += String.join(", ", metapathDescriptions);

        return description;
    }
}
