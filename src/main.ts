import axios from "axios";
import * as cheerio from "cheerio";
import * as path from "path";
import * as fs from "fs";
//@ts-ignore
import pdf2html from "pdf2html";
import JSON5 from "json5";

type Reference = {
	i: number;
	jid: string;
	data: { year: number; journals: JournalInfo[] }[];
};

type JournalInfo = {
	journal?: string;
	authors?: string[];
	email?: string;
	downloadLink?: string;
};

const sleep = (millisecond: number) => {
	const now = new Date().valueOf();
	while (now + millisecond - new Date().valueOf() < 0) {}
};

class LibGenToAutomate {
	private readonly years: number[] = [];
	private readonly references: Reference[] = [];

	constructor() {
		const configFilePath = path.join(__dirname, "..", "config.jsonc");
		const configRawContent = fs.readFileSync(configFilePath, {
			encoding: "utf8",
		});
		const config: { years: number[]; journal_ids: number[] } =
			JSON5.parse(configRawContent);

		this.years = config.years;
		this.references = config.journal_ids.map((jid, index) => ({
			i: index + 1,
			jid: `${jid}`,
			data: [],
		}));

		const pdfsPath = path.join(__dirname, "..", "pdfs");
		const pdfsFolderExistence = fs.existsSync(pdfsPath);
		if (!pdfsFolderExistence) {
			fs.mkdirSync(pdfsPath, { recursive: true });
		}
		fs.readdir(pdfsPath, (err, files) => {
			if (err) throw err;
			for (const file of files) {
				fs.unlink(path.join(pdfsPath, file), (err) => {
					if (err) throw err;
				});
			}
			fs.writeFileSync(path.join(pdfsPath, ".gitignore"), "*\n!.gitignore");
		});

		const outputPath = path.join(__dirname, "..", "output");
		const outputFolderExistence = fs.existsSync(outputPath);
		if (!outputFolderExistence) {
			fs.mkdirSync(outputPath, { recursive: true });
		}
		fs.readdir(outputPath, (err, files) => {
			if (err) throw err;
			for (const file of files) {
				fs.unlink(path.join(outputPath, file), (err) => {
					if (err) throw err;
				});
			}
			fs.writeFileSync(path.join(outputPath, ".gitignore"), "*\n!.gitignore");
		});
	}

	async start(): Promise<void> {
		for (let i = 0; i < this.references.length; i++) {
			const ref = this.references[i];
			console.log("new ref ---------------------------");
			for (const year of this.years) {
				const extractedData = await this.extractJournalsFromReference(
					ref.jid,
					year
				);
				console.log(`year ${year} completed =========================`);

				ref.data.push(extractedData);
			}
			console.log("write csv -----------------------------");
			this.writeJournalInfoToCSV(ref, ref.i);
		}
	}

	private async writeJournalInfoToCSV(
		ref: Reference,
		index: number
	): Promise<void> {
		const csvFilePath = path.join(__dirname, "..", "output", `${index}.csv`);
		console.log("here");

		const header = "Year,Journal,Author,Email,Download link";
		const rows: string[] = [];
		for (const data of ref.data) {
			let row = "";
			row += data.year + ",";
			for (const journalData of data.journals) {
				row += '"' + journalData.journal + '"' + ",";
				for (const author of journalData.authors as string[]) {
					row +=
						'"' +
						author +
						'"' +
						"," +
						'"' +
						journalData.email +
						'"' +
						"," +
						'"' +
						journalData.downloadLink +
						'"';
					rows.push(row);
					row = data.year + "," + '"' + journalData.journal + '"' + ",";
				}
				row = data.year + ",";
			}
		}

		const csv = header + "\n" + rows.join("\n");
		fs.writeFileSync(csvFilePath, csv, { encoding: "utf-8" });
	}

	private async extractJournalsFromReference(
		jid: string,
		year: number
	): Promise<{ year: number; journals: JournalInfo[] }> {
		console.log(`year ${year} ----------------------------`);
		const content = await this.getHtmlFromLibGen(jid, year);
		const resultList = await this.parseLibGenSinglePageHtmlContentToData(
			content
		);
		return { year: year, journals: resultList };
	}

	private async getHtmlFromLibGen(
		journalId: string,
		year: number
	): Promise<string> {
		try {
			const url = `http://libgen.rs/scimag/?journal=${journalId}&year=${year}`;
			sleep(1000);
			const result = await axios.get<string>(url);
			console.log(`response of ${journalId}-${year} received :)`);

			return result.data;
		} catch (err) {
			throw err;
		}
	}

	private async getJournalDownloadLink(DOI: string): Promise<string> {
		try {
			const url = `http://library.lol/scimag/${DOI}`;
			sleep(1000);
			const result = await axios.get<string>(url);
			const htmlPage = result.data;
			const $ = cheerio.load(htmlPage);
			const downloadLink = (
				$("#download").children("h2").children("a").attr() as { href: string }
			).href;
			return downloadLink;
		} catch (err) {
			throw err;
		}
	}

	private async parseLibGenSinglePageHtmlContentToData(
		html: string
	): Promise<JournalInfo[]> {
		const finalResult: JournalInfo[] = [];

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
						finalResult[i].downloadLink = await this.getJournalDownloadLink(
							doi
						);

						const shortPDFFilePath = path.join(
							__dirname,
							"..",
							"pdfs",
							`${new Date().valueOf()}.pdf`
						);
						const exist = fs.existsSync(shortPDFFilePath);
						try {
							if (!exist)
								await this.downloadFilePDF(
									finalResult[i].downloadLink as string,
									shortPDFFilePath
								);
							const pdfContent = await this.convertPDFToTxt(shortPDFFilePath);
							const emails = pdfContent.match(
								/(?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/g
							) as string[];
							const uniqueEmails = new Set(emails);
							console.log(
								"emails >> ",
								uniqueEmails,
								[...uniqueEmails].join(";")
							);
							finalResult[i].email = [...uniqueEmails].join(";");
						} catch (err) {
							console.log("error to parse file", jTitle, err);
							finalResult[i].email = "[]";
						}
						// console.log("pdf content >>", pdfContent);
					}
				}
			}

			console.log("return final data");

			return finalResult;
		} catch (err) {
			throw err;
		}
	}

	private async downloadFilePDF(
		url: string,
		filePathWithName: string
	): Promise<void> {
		console.log("download started ..................");
		const file = fs.createWriteStream(filePathWithName);
		sleep(2000);
		return axios
			.get(url, { timeout: 10000000, responseType: "stream" })
			.then((res) => {
				return new Promise((resolve, reject) => {
					res.data.pipe(file);
					let error: any = null;
					file.on("error", (err) => {
						error = err;
						file.close();
						console.log(".....................download failed");
						reject(err);
					});
					file.on("close", () => {
						if (!error) {
							console.log("..................download completed");
							resolve();
						}
					});
				});
			});
	}

	private async convertPDFToTxt(filePath: string): Promise<string> {
		return new Promise((resolve, reject) => {
			pdf2html.text(filePath, (err: any, txt: string) => {
				if (err) return reject(err);
				resolve(txt);
			});
		});
	}
}

new LibGenToAutomate().start();
