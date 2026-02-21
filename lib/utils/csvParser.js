"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCsvFile = parseCsvFile;
exports.parseCsvString = parseCsvString;
var papaparse_1 = require("papaparse");
var vocaSchemas_1 = require("@/lib/schemas/vocaSchemas");
function normalizeRow(row, isCollocation) {
    var normalized = {};
    // Alias mappings
    var wordAliases = ['word', '_1'];
    var collocationAliases = ['collocation', '_1'];
    var meaningAliases = ['meaning', '_2'];
    var pronunciationAliases = ['pronunciation', 'pronounciation', '_3'];
    var explanationAliases = ['explanation', '_3']; // _3 is explanation for collocation, pronunciation for word
    var exampleAliases = ['example', 'example sentence', '_4'];
    var translationAliases = ['translation', '_5'];
    for (var _i = 0, _a = Object.entries(row); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        var cleanKey = key.trim().toLowerCase();
        var cleanValue = typeof value === 'string' ? value.trim() : value;
        // Map to definitive keys
        if (isCollocation && collocationAliases.includes(cleanKey))
            normalized['collocation'] = cleanValue;
        else if (!isCollocation && wordAliases.includes(cleanKey))
            normalized['word'] = cleanValue;
        else if (meaningAliases.includes(cleanKey))
            normalized['meaning'] = cleanValue;
        else if (!isCollocation && pronunciationAliases.includes(cleanKey))
            normalized['pronunciation'] = cleanValue;
        else if (isCollocation && explanationAliases.includes(cleanKey))
            normalized['explanation'] = cleanValue;
        else if (exampleAliases.includes(cleanKey))
            normalized['example'] = cleanValue;
        else if (translationAliases.includes(cleanKey))
            normalized['translation'] = cleanValue;
        else
            normalized[cleanKey] = cleanValue; // Fallback
    }
    return normalized;
}
function detectAndParse(data, rawHeaders) {
    var headers = rawHeaders.map(function (h) { return h.trim().toLowerCase(); });
    var isCollocation = headers.includes('collocation');
    var schema = isCollocation ? vocaSchemas_1.collocationWordSchema : vocaSchemas_1.standardWordSchema;
    var words = [];
    var errors = [];
    data.forEach(function (row, index) {
        var normalized = normalizeRow(row, isCollocation);
        var parsed = schema.safeParse(normalized);
        if (parsed.success) {
            words.push(parsed.data);
        }
        else {
            errors.push("Row ".concat(index + 1, ": ").concat(parsed.error.issues.map(function (i) { return i.message; }).join(', ')));
        }
    });
    return { words: words, isCollocation: isCollocation, errors: errors };
}
function processParsedArray(data) {
    if (data.length === 0)
        return { words: [], isCollocation: false, errors: [] };
    var firstRow = data[0].map(function (h) { return (h === null || h === void 0 ? void 0 : h.trim().toLowerCase()) || ''; });
    var allAliases = [
        'word', '_1', 'collocation', 'meaning', '_2',
        'pronunciation', 'pronounciation', '_3', 'explanation',
        'example', 'example sentence', '_4', 'translation', '_5'
    ];
    var hasHeaders = firstRow.some(function (h) { return allAliases.includes(h); });
    var headers;
    var rows;
    if (hasHeaders) {
        headers = firstRow;
        rows = data.slice(1);
    }
    else {
        headers = ['_1', '_2', '_3', '_4', '_5'];
        rows = data;
    }
    var objects = rows.map(function (rowArray) {
        var obj = {};
        headers.forEach(function (h, i) {
            obj[h] = rowArray[i];
        });
        return obj;
    });
    return detectAndParse(objects, headers);
}
function parseCsvFile(file) {
    return new Promise(function (resolve) {
        papaparse_1.default.parse(file, {
            header: false,
            skipEmptyLines: true,
            complete: function (results) {
                resolve(processParsedArray(results.data));
            },
            error: function (err) {
                resolve({ words: [], isCollocation: false, errors: [err.message] });
            },
        });
    });
}
function parseCsvString(csvString) {
    var results = papaparse_1.default.parse(csvString, {
        header: false,
        skipEmptyLines: true,
    });
    return processParsedArray(results.data);
}
