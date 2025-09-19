import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
	{
		ownerId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true
		},
		firstName: { type: String, required: true, trim: true },
		lastName: { type: String, required: true, trim: true },
		phone: { type: String, required: true, trim: true },
		email: { type: String, trim: true },
		notes: { type: String, trim: true }
	},
	{ timestamps: true }
);

export const Contact = mongoose.model('Contact', contactSchema); 