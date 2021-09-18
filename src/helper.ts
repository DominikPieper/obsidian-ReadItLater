export const isValidUrl = (url: string) => {
	try {
		new URL(url);
	} catch (e) {
		return false;
	}
	return true;
};