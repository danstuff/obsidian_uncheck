export interface UncheckSettings {
	/** How often, in minutes, to scan the vault for items due to be unchecked. */
	checkIntervalMinutes: number;
	/**
	 * Local time of day, as `HH:MM` (24-hour), that counts as the start of a new
	 * day for recurrence purposes. `00:00` means midnight.
	 */
	dayStartTime: string;
}

export interface ItemState {
	/** Epoch ms of the last recurrence occurrence that was processed for this item. */
	lastProcessed: number;
}

export interface UncheckData {
	settings: UncheckSettings;
	/** Keyed by a stable identity derived from file path + item text, see checklist.ts. */
	itemState: Record<string, ItemState>;
}
