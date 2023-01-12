"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
//@ts-ignore
const pdf2html_1 = __importDefault(require("pdf2html"));
const sleep = (millisecond) => {
    const now = new Date().valueOf();
    while (now + millisecond - new Date().valueOf() < 0) { }
};
class LibGenToAutomate {
    constructor() {
        this.years = [
            2010,
            // , 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020,
        ];
        this.references = [
            // {
            // 	i: 1,
            // 	jid: "20506",
            // 	data: [],
            // },
            // {
            // 	i: 2,
            // 	jid: "18843",
            // 	data: [],
            // },
            // {
            // 	i: 3,
            // 	jid: "18829",
            // 	data: [],
            // },
            // {
            // 	i: 4,
            // 	jid: "18770",
            // 	data: [],
            // },
            // {
            // 	i: 5,
            // 	jid: "18767",
            // 	data: [],
            // },
            // {
            // 	i: 6,
            // 	jid: "18763",
            // 	data: [],
            // },
            // {
            // 	i: 7,
            // 	jid: "18024",
            // 	data: [],
            // },
            // {
            // 	i: 8,
            // 	jid: "17036",
            // 	data: [],
            // },
            // {
            // 	i: 9,
            // 	jid: "16880",
            // 	data: [],
            // },
            {
                i: 10,
                jid: "15255",
                data: [],
            },
            // {
            // 	i: 11,
            // 	jid: "13708",
            // 	data: [],
            // },
            // {
            // 	i: 12,
            // 	jid: "17006",
            // 	data: [],
            // },
        ];
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < this.references.length; i++) {
                const ref = this.references[i];
                for (const year of this.years) {
                    const extractedData = yield this.extractJournalsFromReference(ref.jid, year);
                    console.log(`year ${year} completed =========================`);
                    ref.data.push(extractedData);
                }
                console.log("write csv -----------------------------");
                this.writeJournalInfoToCSV(ref, ref.i);
            }
        });
    }
    writeJournalInfoToCSV(ref, index) {
        return __awaiter(this, void 0, void 0, function* () {
            const csvFilePath = path.join(__dirname, "..", "output", `${ref.jid}-email.csv`);
            const header = "Year,Journal,Email";
            const rows = [];
            for (const data of ref.data) {
                let row = "";
                row += data.year + ",";
                if (!data.journals || !Array.isArray(data.journals))
                    continue;
                for (const journalData of data.journals) {
                    row +=
                        '"' + journalData.journal + '"' + "," + '"' + journalData.email + '"';
                    rows.push(row);
                    row = data.year + ",";
                }
            }
            // check file exist
            if (fs.existsSync(csvFilePath)) {
                // if exists, remove it
                fs.unlinkSync(csvFilePath);
            }
            const csv = header + "\n" + rows.join("\n");
            fs.writeFileSync(csvFilePath, csv, { encoding: "utf-8" });
        });
    }
    extractJournalsFromReference(jid, year) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Exporting year ${year} of JournalID ${jid} ----------------------------`);
            const content = yield this.getHtmlFromLibGen(jid, year);
            const resultList = yield this.parseLibGenSinglePageHtmlContentToData(content);
            return { year: year, journals: resultList };
        });
    }
    getHtmlFromLibGen(journalId, year) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const url = `http://libgen.rs/scimag/?journal=${journalId}&year=${year}`;
                sleep(1000);
                const result = yield axios_1.default.get(url);
                console.log(`response of ${journalId}-${year} received :)`);
                return result.data;
            }
            catch (err) {
                throw err;
            }
        });
    }
    getJournalDownloadLink(DOI) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const url = `http://library.lol/scimag/${DOI}`;
                sleep(1000);
                const result = yield axios_1.default.get(url);
                const htmlPage = result.data;
                const $ = cheerio.load(htmlPage);
                const downloadLink = $("#download").children("h2").children("a").attr().href;
                return downloadLink;
            }
            catch (err) {
                throw err;
            }
        });
    }
    parseLibGenSinglePageHtmlContentToData(html) {
        return __awaiter(this, void 0, void 0, function* () {
            const finalResult = [];
            try {
                const $ = cheerio.load(html);
                const rowsArray = $("table.catalog tbody tr").toArray();
                for (let i = 0; i < rowsArray.length; i++) {
                    const r = rowsArray[i];
                    const cells = $(r).children("td").toArray();
                    for (let j = 0; j < cells.length; j++) {
                        const cell = cells[j];
                        if (j === 0) {
                            const authors = $(cell).text().replace(",", ".").split("; ");
                            finalResult[i] = { authors };
                        }
                        if (j === 1) {
                            const a = $(cell).children("p");
                            const jTitle = a.children("a").text().replace(",", " and");
                            finalResult[i].journal = jTitle;
                            const doi = a.next().text().replace(/DOI: /, "");
                            finalResult[i].downloadLink = yield this.getJournalDownloadLink(doi);
                            const pdfFile = yield axios_1.default.get(finalResult[i].downloadLink, { responseType: "blob" });
                            const shortPDFFilePath = path.join(__dirname, "..", "pdfs", `${new Date().valueOf()}.pdf`);
                            try {
                                yield this.downloadFilePDF(finalResult[i].downloadLink, shortPDFFilePath, jTitle);
                                const pdfContent = yield this.convertPDFToTxt(shortPDFFilePath);
                                const emails = pdfContent.match(/(?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/g);
                                // remove file after usage
                                fs.unlinkSync(shortPDFFilePath);
                                const uniqueEmails = new Set(emails);
                                console.log("emails >> ", [...uniqueEmails].join("; "));
                                finalResult[i].email = [...uniqueEmails].join(";");
                            }
                            catch (err) {
                                console.log("error to parse file", jTitle, err);
                                finalResult[i].email = "[]";
                            }
                        }
                    }
                }
                console.log("return final data");
                return finalResult;
            }
            catch (err) {
                // throw err;
                console.log("Error in parse reference data > ", err);
            }
        });
    }
    downloadFilePDF(url, filePathWithName, jTitle) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`\nDownloading [${jTitle}] >`);
            console.log(" --------------------------------------");
            console.log("| download started ..................  |");
            const file = fs.createWriteStream(filePathWithName);
            sleep(2000);
            return axios_1.default
                .get(url, { timeout: 10000000, responseType: "stream" })
                .then((res) => {
                return new Promise((resolve, reject) => {
                    res.data.pipe(file);
                    let error = null;
                    file.on("error", (err) => {
                        error = err;
                        file.close();
                        console.log("| ..................download failed!!  |");
                        console.log(" --------------------------------------");
                        reject(err);
                    });
                    file.on("close", () => {
                        if (!error) {
                            console.log("| ..................download completed |");
                            console.log(" --------------------------------------");
                            resolve();
                        }
                        //no need to call the reject here, as it will have been called in the
                        //'error' stream;
                    });
                });
            });
        });
    }
    convertPDFToTxt(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                pdf2html_1.default.text(filePath, (err, txt) => {
                    if (err)
                        return reject(err);
                    resolve(txt);
                });
            });
        });
    }
}
new LibGenToAutomate().start();