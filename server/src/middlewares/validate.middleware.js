export function validate(schema) {
	return (req, res, next) => {
		const { error, value } = schema.validate(req.body);
		if (error) return res.status(400).json({ error: error.message });
		req.validatedBody = value;
		return next();
	};
}
