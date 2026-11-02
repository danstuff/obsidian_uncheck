import { App, PluginSettingTab, Setting } from 'obsidian';
import type UncheckPlugin from './main';
import { parseTimeOfDay } from './rrule-utils';
import { UncheckSettings } from './types';

export const DEFAULT_SETTINGS: UncheckSettings = {
	checkIntervalMinutes: 5,
	dayStartTime: '00:00',
};

export class UncheckSettingTab extends PluginSettingTab {
	plugin: UncheckPlugin;

	constructor(app: App, plugin: UncheckPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('p', {
			text: 'Uncheck checklist items on a recurring schedule. Add a %% @uncheck <period> %% comment to the end of a checklist line, where <period> is a plain-English recurrence rule, for example:',
		});
		containerEl.createEl('pre', {
			text: '- [ ] water the plants %% @uncheck every day %%',
		});

		new Setting(containerEl)
			.setName('Check interval')
			.setDesc('How often, in minutes, to scan the vault for items due to be unchecked.')
			.addText((text) =>
				text
					.setPlaceholder(String(DEFAULT_SETTINGS.checkIntervalMinutes))
					.setValue(String(this.plugin.data.settings.checkIntervalMinutes))
					.onChange(async (value) => {
						const parsed = Number.parseInt(value, 10);
						if (!Number.isFinite(parsed) || parsed < 1) return;
						this.plugin.data.settings.checkIntervalMinutes = parsed;
						await this.plugin.saveSettings();
						this.plugin.restartInterval();
					}),
			);

		new Setting(containerEl)
			.setName('Start of day')
			.setDesc(
				'The time a new day begins. Items due "every day" uncheck at this time instead of midnight. Use a later time like 04:00 if you often stay up past midnight.',
			)
			.addText((text) => {
				text.inputEl.type = 'time';
				text
					.setValue(this.plugin.data.settings.dayStartTime)
					.onChange(async (value) => {
						if (parseTimeOfDay(value) === null) return;
						this.plugin.data.settings.dayStartTime = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Run now')
			.setDesc('Immediately scan the vault and uncheck any items that are due.')
			.addButton((button) =>
				button.setButtonText('Run now').onClick(() => {
					void this.plugin.runPass(true);
				}),
			);
	}
}
