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
const sleep = (millisecond) => {
    const now = new Date().valueOf();
    while (now + millisecond - new Date().valueOf() < 0) { }
};
class LibGenToAutomate {
    constructor() {
        this.years = [
            2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020,
        ];
        this.references = [
            {
                i: 9,
                jid: "17006",
                data: [],
            },
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
            // {
            // 	i: 10,
            // 	jid: "15255",
            // 	data: [],
            // },
            // {
            // 	i: 11,
            // 	jid: "13708",
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
                    ref.data.push(extractedData);
                }
                this.writeJournalInfoToCSV(ref, ref.i);
            }
            // for (const ref of this.references) {
            // 	for (const d of ref.data) {
            // 		for (const journal of d.journals) {
            // 			console.log('Authors >>', journal.authors, d.year, journal.journal, '\n');
            // 		}
            // 	}
            // }
            // console.log(
            // 	this.references[this.references.length - 1].data[
            // 		this.references[0].data.length - 1
            // 	]
            // );
        });
    }
    writeJournalInfoToCSV(ref, index) {
        return __awaiter(this, void 0, void 0, function* () {
            const csvFilePath = path.join(__dirname, "..", "output", `${index}.csv`);
            console.log("here");
            const header = "Year,Journal,Author,Download link";
            const rows = [];
            for (const data of ref.data) {
                let row = "";
                row += data.year + ",";
                for (const journalData of data.journals) {
                    row += '"' + journalData.journal + '"' + ",";
                    for (const author of journalData.authors) {
                        row +=
                            '"' + author + '"' + "," + '"' + journalData.downloadLink + '"';
                        rows.push(row);
                        row = data.year + "," + '"' + journalData.journal + '"' + ",";
                    }
                    row = data.year + ",";
                }
            }
            const csv = header + "\n" + rows.join("\n");
            fs.writeFileSync(csvFilePath, csv, { encoding: "utf-8" });
        });
    }
    extractJournalsFromReference(jid, year) {
        return __awaiter(this, void 0, void 0, function* () {
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
                        }
                    }
                }
                return finalResult;
            }
            catch (err) {
                throw err;
            }
        });
    }
}
new LibGenToAutomate().start();
// getHtmlFromLibGen('20506', 2010)
