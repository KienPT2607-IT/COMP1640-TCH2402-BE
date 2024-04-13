const path = require("path");

function processContribution(contribution) {
	let _contribution = contribution.toObject();
	const _contributor = _contribution.contributor;
	_contribution.contributor = {};
	_contribution.contributor.full_name = _contributor.full_name;
	if (_contributor.profile_picture) {
		const imageUrl = path.join(
			process.env.HOST_URL,
			"public/uploads/profile_pictures",
			_contributor.profile_picture
		);
		_contribution.contributor.profile_picture = imageUrl;
	}
	delete _contribution.is_accepted;
	return _contribution;
}

module.exports = { processContribution };
