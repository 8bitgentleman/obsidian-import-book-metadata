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
        let options = {
            'option1': 'Option 1',
            'option2': 'Option 2',
            // ...
        };
        let modal = new BookInfoModal(this.app, file, options);
        modal.open();
    }
	
	async importBookInfo(file: TFile) {
		const fname = this.app.workspace.getActiveFile()?.name.replace(".md","")
		const url = "https://openlibrary.org/search.json?title=" + fname + "";
		console.log(url)
		let activeFile = this.app.workspace.getActiveFile();
		if (activeFile) {
			let fileContent = await this.app.vault.read(activeFile);
			console.log(fileContent)
			let newContent = this.addOrUpdateMetadata(fileContent);
			console.log(newContent)
			// await this.app.vault.modify(activeFile, newContent);
		}
	}
	
	addOrUpdateMetadata(content: string): string {
		const results = [
			{value:{
				cover:"COVER_URL",
				title:"Thinking Fast and Slow",
				authors:"Daniel Kahneman",
				firstYear:"YEAR_PUBLISHED",
				pages:100
			}},
			{value:{
				subjects:["BOOK_SUBJECT"],
				description:"BOOK_SUMMARY"
			}}
		];
	
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
		for (let result of results) {
			for (let key in result.value) {
				if (!metadata.hasOwnProperty(key)) {
					metadata[key] = result.value[key];
				}
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

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class BookInfoModal extends Modal {
    file: TFile;
    options: Record<string, string>;

    constructor(app, file, options) {
        super(app);
        this.file = file;
        this.options = options;
    }

    onOpen() {
		let {contentEl} = this;
	
		// Create a header
		contentEl.createEl('h2', { text: 'Open Book Library' });
	
		// Create a label for the dropdown
		contentEl.createEl('p', { text: 'Which do you mean?' });
	
		// Create a div for the dropdown
		let dropdownDiv = contentEl.createDiv();
		let dropdown = new DropdownComponent(dropdownDiv);
	
		// Add options to the dropdown
		for (let value in this.options) {
			dropdown.addOption(value, this.options[value]);
		}
	
		// Create a div for the submit button
		let buttonDiv = contentEl.createDiv({ attr: { style: 'text-align: right;' } });
		let submitButton = buttonDiv.createEl('button', { text: 'Submit' });
		submitButton.onClickEvent(() => {
			let selectedOption = dropdown.getValue();
			this.submit(selectedOption);
		});
	}

    submit(selectedOption) {
        // Here you can run more functions with the selected item as an input
        console.log('Selected option:', selectedOption);
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
