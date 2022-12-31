import axios from "axios";
import * as cheerio from "cheerio";
import * as path from "path";
import * as fs from "fs";

type Reference = {
	i: number;
	jid: string;
	data: { year: number; journals: JournalInfo[] }[];
};

type JournalInfo = {
	journal?: string;
	authors?: string[];
	downloadLink?: string;
};

const sleep = (millisecond: number) => {
	const now = new Date().valueOf();
	while (now + millisecond - new Date().valueOf() < 0) {}
};

class LibGenToAutomate {
	private readonly years: number[] = [
		2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020,
	];
	private readonly references: Reference[] = [
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

	async start(): Promise<void> {
		for (let i = 0; i < this.references.length; i++) {
			const ref = this.references[i];
			for (const year of this.years) {
				const extractedData = await this.extractJournalsFromReference(
					ref.jid,
					year
				);
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
						'"' + author + '"' + "," + '"' + journalData.downloadLink + '"';
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
					}
				}
			}

			return finalResult;
		} catch (err) {
			throw err;
		}
	}
}

new LibGenToAutomate().start();

// getHtmlFromLibGen('20506', 2010)
