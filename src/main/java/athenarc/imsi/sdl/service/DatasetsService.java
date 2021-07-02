package athenarc.imsi.sdl.service;

import java.io.BufferedReader;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;

import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import athenarc.imsi.sdl.config.Constants;
import athenarc.imsi.sdl.service.util.FileUtil;

@Service
public class DatasetsService {

    private final Logger log = LoggerFactory.getLogger(DatasetsService.class);

    public String upload(String filename, byte[] bytes) throws java.io.IOException {
        log.debug("Uploading " + filename);
        String zipFile = Constants.DATA_DIR + filename;
        Path path = Paths.get(zipFile);
        Files.write(path, bytes);
        return zipFile;
    }

    public Document getSchemas() throws FileNotFoundException, IOException {
        Document response = new Document();

        String [] datasetDirs = FileUtil.findSubdirectories(Constants.DATA_DIR);

        for(String dir : datasetDirs) {
            String schemaFile = Constants.DATA_DIR + dir + "/schema.json";
            // System.out.println(FileUtil.readSchema(schemaFile));
            response.append(dir, Document.parse(FileUtil.readJsonFile(schemaFile)));
        }
        return response;
    }

    public List<Document> autocomplete(String dataset, String entity, String field, String term, Boolean uniqueValues) throws IOException {
        List<Document> docs = new ArrayList<>();
        Set<String> values = new HashSet<>();

        BufferedReader reader;
        String filename = Constants.DATA_DIR + dataset + "/nodes/" + entity + ".csv";
        reader = new BufferedReader(new FileReader(filename));

        // read header line and find column of specified field
        String line = reader.readLine();

        String [] columnNames = line.split("\t");
        int i;
        for (i=0; i<columnNames.length; i++) {
            if (columnNames[i].startsWith(field))
                break;
        }

        // loop in lines until find 5 results to return
        while ( ( line = reader.readLine() ) != null) {
            String [] attrs = line.split("\t");

            if (i >= attrs.length) continue;

            if (attrs[i].toLowerCase().contains(term)) {
                // skip if value already exists and we want only unique values
                if (uniqueValues && values.contains(attrs[i]))
                    continue;

                Document doc = new Document();
                doc.append("id", Integer.parseInt(attrs[0]));
                doc.append("name", attrs[i]);
                values.add(attrs[i]);

                docs.add(doc);
                // System.out.println(values.size());
                // if (docs.size() == 5) {
                //    break;
                // }
            }

        }
        reader.close();

        return docs;
    }

    public String[] findFiveNonExistent(String folder, String entity, String field, String[] terms) throws IOException {
        List<Document> docs = new ArrayList<>();
        BufferedReader reader;
        String filename = Constants.DATA_DIR + folder + "/nodes/" + entity + ".csv";
        Set<String> termSet = new HashSet<>(Arrays.asList(terms));
        reader = new BufferedReader(new FileReader(filename));

        // read header line and find column of specified field
        String line = reader.readLine();

        String [] columnNames = line.split("\t");
        int i;
        for (i=0; i<columnNames.length; i++) {
            if (columnNames[i].startsWith(field))
                break;
        }

        while( ( ( line = reader.readLine() ) != null) && (termSet.size()>0)) {
            String [] attrs = line.split("\t");
            termSet.remove(attrs[i].toLowerCase());
        }

        if (termSet.size()>0) {
            String[] result = new String[Math.min(termSet.size(),5)];
            Iterator<String> iter = termSet.iterator();
            i=0;
            while(iter.hasNext() && i<5) {
                result[i++]=(String)iter.next();
            }
            return result;
        } else {
            return null;
        }
    }
}
