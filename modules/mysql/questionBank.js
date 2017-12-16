const sequelize = require('./db.js');
var Sequelize = require('sequelize');

const cslogger = require('../logModule').cslogger;



const question_bank = sequelize.define('question_banks', {
	id:{
		field: 'id',
		type: Sequelize.STRING,
		allowNull: false,
		primaryKey:true
	},
	analysis: {
		field: 'analysis',
		type: Sequelize.STRING,
		allowNull: false
	},
	answer: {
		field: 'answer',
		type: Sequelize.STRING,
		allowNull: false
	},
	category: {
		field: 'category',
		type: Sequelize.STRING,
		allowNull: false
	},
	option_A: {
		field: 'option_A',
		type: Sequelize.STRING,
		allowNull: false
	},
	option_B: {
		field: 'option_B',
		type: Sequelize.STRING,
		allowNull: false
	},
	option_C: {
		field: 'option_C',
		type: Sequelize.STRING,
		allowNull: false
	},
	option_D: {
		field: 'option_D',
		type: Sequelize.STRING,
		allowNull: false
	},
	province: {
		field: 'province',
		type: Sequelize.STRING,
		allowNull: false
	},
	question: {
		field: 'question',
		type: Sequelize.STRING,
		allowNull: false
	},
	question_point: {
		field: 'question_point',
		type: Sequelize.STRING,
		allowNull: false
	},
	subject: {
		field: 'subject',
		type: Sequelize.STRING,
		allowNull: true
	},
	year: {
		field: 'year',
		type: Sequelize.STRING,
		allowNull: false
	},
	title: {
		field: 'title',
		type: Sequelize.STRING,
		allowNull: false
	},
	question_number: {
		field: 'question_number',
		type: Sequelize.STRING,
		allowNull: false
	},
	question_material: {
		field: "question_material",
		type: Sequelize.STRING,
		allowNull: true
	},
	created_at:{
		field:"created_at",
		type:Sequelize.STRING,
		allowNull:false
	},
	// updated_at:{
	// 	field:"updated_at",
	// 	type:Sequelize.STRING,
	// 	allowNull:false
	// }
});
// const questionBank = question_bank.sync({force:false});

module.exports = {
	create: create
};

function create(argus) {
	return question_bank.create(argus).catch(err => {
		cslogger.trace(err);
	});
}