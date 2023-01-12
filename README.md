# Libgen Exporter
This project created for exporting data of journals in specific categories from site with kindness by years as you need. Data contains **Year**, **Journal**, **Authors**, **Emails**, **Download Link**.
<br>

## Usage
After clone or download project, in project directory:
1. Run `npm ci`
2. Open `config.jsonc` somewhere and edit it by your target `years` and `journal_ids`
   - `journal_ids` are libgen ids for each categories. You can find it in site url
3. Run `npm start` or `npm run start` to gather all information
4. Run `npm run start:emails` to export only years, journals and emails.

<br><br>
Use With Pleasure 😊