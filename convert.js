let parse = require("./ParseMongoJson/MongoParse.js")
fs = require("fs")

var Collection;

/**
 * 
 * 
 * @param {any} obj 
 * @param {number} padval 
 * @param {boolean} isValue 
 * @returns 
 */
function AddCSharpMongoSyntax(obj, padval, isValue, isInArray, depth, num) {
    depth++;

    var padBase = "    "
    var pad = ""
    for (i = 0; i < padval; i++) {
        pad += padBase
    }
    var output = ""
    if (Array.isArray(obj)) {
        if (isValue) {
            output += "new BsonArray()\n" + pad + "{\n"
        } else {
            output += pad + "new BsonArray()\n" + pad + "{\n"
        }
        for (var i = 0; i < obj.length; i++) {

            output += AddCSharpMongoSyntax(obj[i], padval + 1, false, true, depth, i + 1)

            if (!(i + 1 >= obj.length)) {
                output += ",\n"
            }
        }
        output += "\n" + pad + "}"
    } else if (typeof obj == 'object') {
        var valuePadding = pad + padBase
        if (isValue) {
            output += "new BsonDocument()\n"
        } else {
            if (depth == 2) output += pad + "// Stage " + num + "\n"
            output += pad + "new BsonDocument()\n"
        }

        for (var keys = Object.keys(obj), i = 0, end = keys.length; i < end; i++) {
            var key = keys[i],
                value = obj[key]
            // console.log(key + " and " + value)
            if (value != null) {
                if (Array.isArray(value) || typeof value == 'object') {
                    output += valuePadding + ".Add(\"" + key.trim() + "\", " + AddCSharpMongoSyntax(value, padval + 1, true, depth) + ")"
                } else {
                    if (typeof value == 'number') {
                        //console.log(typeof value + " : " + value)
                        output += valuePadding + ".Add(\"" + key.trim() + "\", " + value + ")"
                    } else {
                        if (value == "null") {
                            output += valuePadding + ".Add(\"" + key.trim() + "\", " + "BsonNull.Value)"
                        } else if (value === true) {
                            output += valuePadding + ".Add(\"" + key.trim() + "\", " + "BsonBoolean.True)"
                        } else if (value === false) {
                            output += valuePadding + ".Add(\"" + key.trim() + "\", " + "BsonBoolean.False)"
                        } else {
                            output += valuePadding + ".Add(\"" + key.trim() + "\", \"" + value.trim() + "\")"
                        }
                    }
                }
            }

            if (i != end - 1) {
                output += "\n"
            }
        }
    } else {
        if (isInArray) {
            if (typeof obj == 'number') {
                output += pad + obj
            } else if (obj.includes("{Variable: ")) {
                output += pad + obj.substring(10, obj.length - 1).trim()
            } else {
                output += pad + "\"" + obj.trim() + "\""
            }
        } else {
            if (typeof obj == 'number') {
                output += pad + ".Add(" + obj + ")"
            } else {
                output += pad + ".Add(\"" + obj.trim() + "\")"
            }
        }
    }

    return output
}

/**
 * Processes a Json into a valid C# class file
 * @param {string} fileName 
 * @param {string} content 
 */
function ExportToC(fileName, content) {
    var className = fileName.substring(0, fileName.length - 3).replace(/3T|^[0-9]+|([\W])|v\d\.\d/g, "");
    const header = "// Requires official C# and .NET MongoDB Driver 2.5+\n" +
        "using MongoDB.Bson;\n" +
        "using MongoDB.Driver;\n" +
        "using static CHAD.DBConnections.DB.DashboardContext;\n" +
        "using CHAD.Aggregation;\n" +
        "using CHAD.DataModels.Requests;\n" +
        "\n" +
        "namespace MongoDBQuery\n" +
        "{\n" +
        "    public class " + className + " : AggregationBase\n" +
        "    {\n" +
        "        /// <summary>\n" +
        "        /// Initializes a new instance of " + className + "\n" +
        "        /// </summary>\n" +
        "        /// <param name=\"ids\">Ids to search</param>\n" +
        "        /// <param name=\"searchBy\">Company to search</param>\n" +
        "        public " + className + " (AggRequest req) : base (req, CollectionList." + Collection + ") { }\n" +
        "\n" +
        "        /// <summary>\n" +
        "        /// Gets the pipeline\n" +
        "        /// </summary>\n" +
        "        protected override PipelineDefinition<BsonDocument, object> Pipeline\n" +
        "        {\n" +
        "            get\n" +
        "            {\n" +
        "                return "

    const footer = "\n" +
        "            }\n" +
        "        }\n" +
        "    }\n" +
        "}\n"

    var result = AddCSharpMongoSyntax(content, 4, "", '', 0)
    result = result.replace(/[ ​\n]+,/g, ",") // move commas to preceding line

    // result = result.replace(/[ ]+ new BsonArray\(\)/g, "new BsonDocument[]") // Replace First Array
    result = "new BsonDocument[]" + result.substring(result.indexOf(")") + 1)
    result = header + result + ";" + footer

    if (!fs.existsSync("./Export")) {
        fs.mkdirSync("./Export")
    }
    fs.writeFileSync("./Export/" + fileName.substring(0, fileName.length - 3).replace(/3T|^[0-9]+|([\W])|v\d\.\d/g, "") + ".cs", result)
}

/**
 * Processes each file in folder scrubs their contents
 * and inputs them into an array as Jsons
 * Requires that every file in the folder is from 3T and has proper formatting
 * @param {string} path 
 * @param {string} donePath 
 * @param {function} callback 
 */
function Read3TExportJSFiles(path, donePath, callback) {
    fs.readdir(path, function (err, files) {
        if (err) {
            console.exception("path does not exist")
        } else {
            files.forEach(file => {
                let currentFile

                var lines = require('fs').readFileSync(path + "/" + file, 'utf-8')
                    .split('\n')
                    .filter(Boolean);
                var found = false;
                lines.forEach(line => {
                    var matchThis = /let myArray =/g;
                    //if (line.match(matchThis))
                    //{
                    //    Collection = matchThis.exec(line)[1]
                    //}

                    if (line.search('let aggArray =') != -1) {
                        found = true;
                    }

                    if (found) {
                        currentFile += line.replace(/\/\/.+/g, "")
                    }

                })

                if (!found)
                {
                    console.error("\t" + file + " contains improper formatting.");
                    return;
                }

                currentFile = currentFile.substring(currentFile.indexOf("["), currentFile.lastIndexOf("]") + 1)

                currentFile = parse(currentFile)

                if (typeof callback === 'function') {
                    callback(file, currentFile)
                }
                fs.rename(path + "/" + file, donePath + "/" + file, function (err) {
                    if (err) {
                        console.error("\tMove " + file + " failed.")
                    } else {
                        console.log("\t" + file + ": Moved Successfully")
                    }
                })
            })
        }
    })
}

const convertPath = "./Import"
const donePath = "./done"

if (!fs.existsSync(donePath)) {
    fs.mkdirSync(donePath)
}
if (!fs.existsSync(convertPath)) {
    console.log(convertPath + " must exist and contain files to process.")
} else {
    Read3TExportJSFiles(convertPath, donePath, ExportToC)
}
