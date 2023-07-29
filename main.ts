import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, DropdownComponent } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	
	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'import-book-info',
			name: 'Import Book Info',
			checkCallback: (checking: boolean) => {
				let activeFile = this.app.workspace.getActiveFile();
				
				if (activeFile && activeFile.path.startsWith('Book/')) {
					if (!checking) {
						// this.importBookInfo(activeFile);
						this.bookModal(activeFile);
					}
					return true;
				} else {
					return false;
				}
			}

		});


		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {

	}

	async bookModal(file: TFile) {
		const fname = this.app.workspace.getActiveFile()?.name.replace(".md","")
		const url = "https://openlibrary.org/search.json?title=" + fname + "";
		// console.log(url)

		fetch(url).then(r => r.json()).then((books) => {
			const options = books.docs
				.map(b => ({ 
					label: "" + b.title + " (" + b.author_name + " - " + b.first_publish_year + ")", 
					id: b.key,
					author:b.author_name,}));
			console.log(books)
			let modal = new BookInfoModal(this.app, file, options);
			modal.open();
		})
        // let modal = new BookInfoModal(this.app, file, options);
        // modal.open();
    }
	// async importBookInfo(file: TFile) {
	// 	const fname = this.app.workspace.getActiveFile()?.name.replace(".md","")
	// 	const url = "https://openlibrary.org/search.json?title=" + fname + "";
	// 	console.log(url)
	// 	let activeFile = this.app.workspace.getActiveFile();
	// 	if (activeFile) {
	// 		let fileContent = await this.app.vault.read(activeFile);
	// 		console.log(fileContent)
	// 		let newContent = this.addOrUpdateMetadata(fileContent);
	// 		console.log(newContent)
	// 		// await this.app.vault.modify(activeFile, newContent);
	// 	}
	// }
	
	

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


interface Book {
    id: string;
    label: string;
	author:string;
}
interface BookResults {
	title?: string;
	subtitle?: string;
	subjects?: any;
	description?: string;
	author?:string;
}

const getBook = async (bookId: string): Promise<BookResults> => {
	const worksUrl = `https://openlibrary.org${bookId}.json`;
	const response = await fetch(worksUrl);
	const book = await response.json();
	let {subjects, title, subtitle, description} = book;

	if (description && typeof description === 'object' && description.hasOwnProperty('value')) {
		description = description.value;
	}

	const bookResults: BookResults = { title, subtitle, subjects, description };

	return bookResults;
}

const processResults = async (wholeBook: Book) => {
	const bookId =  wholeBook.id
    const results = await Promise.allSettled([getBook(bookId)]);

	if (results[0].status === 'fulfilled') {
        var bookData = results[0].value;
		//more processing here in the future
		// console.log("whole book", wholeBook)
		bookData.author=wholeBook.author;
		return bookData;
}}

interface Metadata {
	title?: string;
	authors?: string;
	subjects?: string[];
	description?: string;
}

const addOrUpdateMetadata = (content: string, newMetadata: Metadata): string => {
	let metadata = {};
	let body = content;

	// Check if the file already has YAML front matter
	if (content.startsWith('---\n')) {
		let endOfFrontMatter = content.indexOf('\n---', 4);
		if (endOfFrontMatter !== -1) {
			let frontMatter = content.substring(4, endOfFrontMatter);
			body = content.substring(endOfFrontMatter + 4);

			// Parse the existing front matter
			frontMatter.split('\n').forEach(line => {
				let colonIndex = line.indexOf(':');
				if (colonIndex !== -1) {
					let key = line.substring(0, colonIndex).trim();
					let value = line.substring(colonIndex + 1).trim();
					metadata[key] = value;
				}
			});
		}
	}

	// Add the new metadata only if the key does not already exist
	for (let key in newMetadata) {
		if (!metadata.hasOwnProperty(key)) {
			metadata[key] = newMetadata[key];
		}
	}

	// Convert the metadata back to YAML front matter format
	let frontMatter = '---\n';
	for (let key in metadata) {
		frontMatter += `${key}: ${metadata[key]}\n`;
	}
	frontMatter += '---\n';

	return frontMatter + body;
}

class BookInfoModal extends Modal {
    file: TFile;
    options: Book[];

    constructor(app:App, file:TFile, options:Book[]) {
        super(app);
        this.file = file;
        this.options = options;
    }

    onOpen() {
        let {contentEl} = this;
    
        // header
        contentEl.createEl('h2', { text: 'Open Book Library' });
    
        contentEl.createEl('p', { text: 'Which do you mean?' });
    
        let dropdownDiv = contentEl.createDiv();
        let dropdown = new DropdownComponent(dropdownDiv);
    
        // dropdown options
        for (let book of this.options) {
            dropdown.addOption(book.id, book.label);
        }
	
		// submit button
		let buttonDiv = contentEl.createDiv({ attr: { style: 'text-align: right;' } });
		let submitButton = buttonDiv.createEl('button', { text: 'Submit' });
		submitButton.onClickEvent(() => {
			let selectedOption = dropdown.getValue();
			console.log(this.options)
			const selectedBook = this.options.find(book => book.id === selectedOption);
			this.submit(selectedBook);
			
		});
	}

    submit(selectedOption:Book) {
        console.log('Selected option:', selectedOption);
		// you've got the book selected now find all the info about that book
		processResults(selectedOption)
		.then(finalResults => {
			// Do something with finalResults
			console.log("final",finalResults);
			// 		let fileContent = await this.app.vault.read(activeFile);
			// console.log(fileContent)
			// let newContent = this.addOrUpdateMetadata(fileContent);
			// console.log(newContent)
			// await this.app.vault.modify(activeFile, newContent);
		})
		.catch(error => {
			console.error(error);
		});

        this.close();
    }
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
