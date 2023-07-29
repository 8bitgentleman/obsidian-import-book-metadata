import { App, Modal, Plugin, TFile, DropdownComponent } from 'obsidian';


export default class MyPlugin extends Plugin {

	
	async onload() {
		this.addCommand({
			id: 'import-book-info',
			name: 'Import Book Info',
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				
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

	}

	onunload() {

	}

	async bookModal(file: TFile) {
		const fname = this.app.workspace.getActiveFile()?.name.replace(".md","")
		const url = "https://openlibrary.org/search.json?title=" + fname + "";

		fetch(url).then(r => r.json()).then((books) => {
			const options = books.docs
				.map(b => ({ 
					label: "" + b.title + " (" + b.author_name + " - " + b.first_publish_year + ")", 
					id: b.key,
					author:b.author_name,}));
			const modal = new BookInfoModal(this.app, file, options);
			modal.open();
		})
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
        const bookData = results[0].value;
		//more processing here in the future
		bookData.author=wholeBook.author;
		if (bookData.description) {
			bookData.description=bookData.description.replace(/\n/g, ' ')
		}
		return bookData;
}}

interface Metadata {
	title?: string;
	authors?: string;
	subjects?: string[];
	description?: string;
}

const addOrUpdateMetadata = (content: string, newMetadata: Metadata): string => {
	const metadata = {};
	let body = content;

	// Check if the file already has YAML front matter
	if (content.startsWith('---\n')) {
		const endOfFrontMatter = content.indexOf('\n---', 4);
		if (endOfFrontMatter !== -1) {
			const frontMatter = content.substring(4, endOfFrontMatter);
			body = content.substring(endOfFrontMatter + 4);

			// Parse the existing front matter
			frontMatter.split('\n').forEach(line => {
				const colonIndex = line.indexOf(':');
				if (colonIndex !== -1) {
					const key = line.substring(0, colonIndex).trim();
					const value = line.substring(colonIndex + 1).trim();
					metadata[key] = value;
				}
			});
		}
	}

	// Add the new metadata only if the key does not already exist
	for (const key in newMetadata) {
		if (!metadata.hasOwnProperty(key)) {
			metadata[key] = newMetadata[key];
		}
	}

	// Convert the metadata back to YAML front matter format
	let frontMatter = '---\n';
	for (const key in metadata) {
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
        const {contentEl} = this;
    
        // header
        contentEl.createEl('h2', { text: 'Open Book Library' });
    
        contentEl.createEl('p', { text: 'Which do you mean?' });
    
        const dropdownDiv = contentEl.createDiv();
        const dropdown = new DropdownComponent(dropdownDiv);
    
        // dropdown options
        for (const book of this.options) {
            dropdown.addOption(book.id, book.label);
        }
	
		// submit button
		const buttonDiv = contentEl.createDiv({ attr: { style: 'text-align: right;' } });
		const submitButton = buttonDiv.createEl('button', { text: 'Submit' });
		submitButton.onClickEvent(() => {
			const selectedOption = dropdown.getValue();
			const selectedBook = this.options.find(book => book.id === selectedOption);
			this.submit(selectedBook);
			
		});
	}

    async submit(selectedOption:Book) {
		// you've got the book selected now find all the info about that book
		processResults(selectedOption)
		.then(async (finalResults) => {
			// Do something with finalResults
			const activeFile = this.app.workspace.getActiveFile();
			
			const fileContent = await this.app.vault.read(activeFile);
			const newContent = addOrUpdateMetadata(fileContent, finalResults);
			await this.app.vault.modify(activeFile, newContent);
		})
		.catch(error => {
			console.error(error);
		});

        this.close();
    }
}

