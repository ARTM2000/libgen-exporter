import axios from "axios";
import * as cheerio from "cheerio";
import * as path from "path";
import * as fs from "fs";
import download from "downloadjs";
import http from "http";
//@ts-ignore
import pdf2html from "pdf2html";

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
	private readonly years: number[] = [
		2010,
		// , 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020,
	];
	private readonly references: Reference[] = [
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

	async start(): Promise<void> {
		for (let i = 0; i < this.references.length; i++) {
			const ref = this.references[i];
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
		const csvFilePath = path.join(
			__dirname,
			"..",
			"output",
			`${ref.jid}-email.csv`
		);

		const header = "Year,Journal,Email";
		const rows: string[] = [];
		for (const data of ref.data) {
			let row = "";
			row += data.year + ",";
			if (!data.journals || !Array.isArray(data.journals)) continue;
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
	}

	private async extractJournalsFromReference(
		jid: string,
		year: number
	): Promise<{ year: number; journals: JournalInfo[] }> {
		console.log(
			`Exporting year ${year} of JournalID ${jid} ----------------------------`
		);
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
	): Promise<JournalInfo[] | any> {
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
						const pdfFile = await axios.get(
							finalResult[i].downloadLink as string,
							{ responseType: "blob" }
						);

						const shortPDFFilePath = path.join(
							__dirname,
							"..",
							"pdfs",
							`${new Date().valueOf()}.pdf`
						);
						try {
							await this.downloadFilePDF(
								finalResult[i].downloadLink as string,
								shortPDFFilePath,
								jTitle
							);
							const pdfContent = await this.convertPDFToTxt(shortPDFFilePath);
							const emails = pdfContent.match(
								/(?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/g
							) as string[];
							// remove file after usage
							fs.unlinkSync(shortPDFFilePath);
							const uniqueEmails = new Set(emails);
							console.log("emails >> ", [...uniqueEmails].join("; "));
							finalResult[i].email = [...uniqueEmails].join(";");
						} catch (err) {
							console.log("error to parse file", jTitle, err);
							finalResult[i].email = "[]";
						}
					}
				}
			}

			console.log("return final data");

			return finalResult;
		} catch (err) {
			// throw err;
			console.log("Error in parse reference data > ", err);
		}
	}

	private async downloadFilePDF(
		url: string,
		filePathWithName: string,
		jTitle: string
	): Promise<void> {
		console.log(`\nDownloading [${jTitle}] >`);
		console.log(" --------------------------------------");
		console.log("| download started ..................  |");
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
