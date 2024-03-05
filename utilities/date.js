function getCurrentDate() {
    const currentDate = new Date();
	return currentDate.toISOString().split(".")[0] + "Z";
}

module.exports = {
    getCurrentDate
}