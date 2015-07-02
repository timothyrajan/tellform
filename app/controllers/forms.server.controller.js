'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	errorHandler = require('./errors.server.controller'),
	Form = mongoose.model('Form'),
	FormSubmission = mongoose.model('FormSubmission'),
	pdfFiller = require( 'pdffiller' ),
	config = require('../../config/config'),
	fs = require('fs-extra'),
	async = require('async'),
	path = require('path'),
	_ = require('lodash');

/**
 * Create a new form
 */
exports.create = function(req, res) {
	var form = new Form(req.body);
	form.admin = req.user;

	form.save(function(err) {
		if (err) {
			console.log(err);
			res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
		} else {
			res.json(form);
		}
	});
};

/**
 * Upload PDF 
 */
exports.uploadPDF = function(files, user, cb) {
	var _user = JSON.parse(''+user);
	console.log(_user.username);
	console.log(config.tmpUploadPath);

	if(files) { 

		console.log('inside uploadPDF');
		console.log(files.file[0]);
		var pdfFile = files.file[0];

		if (pdfFile.size === 0) {
			throw new Error('Files uploaded are EMPTY');
		}
		fs.exists(pdfFile.path, function(exists) { 
			//If file exists move to user's tmp directory
			if(exists) { 

				var newDestination = path.join(config.tmpUploadPath, _user.username);
			    var stat = null;
			    try {
			        stat = fs.statSync(newDestination);
			    } catch (err) {
			        fs.mkdirSync(newDestination);
			    }
			    if (stat && !stat.isDirectory()) {
			    	console.log('Directory cannot be created');
			        throw new Error('Directory cannot be created because an inode of a different type exists at "' + newDestination + '"');
			    }
			    
			    fs.move(pdfFile.path, path.join(newDestination, pdfFile.name), function (err) {
					if (err) {
						throw new Error(err.message);
					}
					pdfFile.path = path.join(newDestination, pdfFile.name);

					return cb(pdfFile);
				});				

			} else { 
				throw new Error('Did NOT get your file!');
			} 
		}); 
	}else {
		throw new Error('File NOT uploaded');
	}

};

/**
 * Show the current form
 */
exports.read = function(req, res) {
	res.json(req.form);
};

/**
 * Submit a form entry
 */
exports.createSubmission = function(req, res) {

	var submission = new FormSubmission(),
		form = req.form, 
		fdfData,
		fdfTemplate;

	submission.form = form;
	submission.admin = req.user;
	submission.form_fields = req.body.form_fields;
	submission.title = req.body.title;
	submission.timeElapsed = req.body.timeElapsed;
	console.log(req.body);
	// submission.ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

	if (form.isGenerated){
		fdfTemplate = form.convertToFDF();
	} else {
		try {
			fdfTemplate = pdfFiller.mapForm2PDF(form.convertToFDF(), form.pdfFieldMap);
		} catch(err){
			throw new Error(err.message);
		}
	}

	if(form.autofillPDFs){
		fdfData = pdfFiller.fillFdfTemplate(fdfTemplate, submission.form_fields, null);
		submission.fdfData = fdfData;
	}

	submission.save(function(err){
		if (err) {
			console.error(err);
			res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
		} else {
			console.log('Form Submission CREATED');
			res.status(200).send('Form submission successfully saved');
		}            
	});	
};


/**
 * Get List of Submissions for a given Template Form
 */
exports.listSubmissions = function(req, res) {
	var _form = req.form;

	FormSubmission.find({ form: req.form }).populate('admin.username').exec(function(err, submissions) {
		if (err) {
			console.log(err);
			res.status(500).send({
				message: errorHandler.getErrorMessage(err)
			});
		} else {
			res.json(submissions);
		}
	});
};


/**
 * Update a form
 */
exports.update = function(req, res) {
	
	var form = req.form;
	form = _.extend(form, req.body);
	form.admin = req.user;

	//If any form fields are changed, update submissions 
	async.waterfall([ 
		function(callback){
			if(req.form.form_fields !== form.form_fields){
				FormSubmission.find({ form: req.form }).exec(function(err, submissions) {
					if (err) {
						callback(err);
					} else {
						//DAVID: TODO: We are doing this at O(n^2). Seems like we could improve efficiency somehow
						var updateSubmission = function (submission, callback) {
							var old_fields = submissions.form_fields;
							var new_fields = req.form.form_fields;

							//Zip the new_fields with old_fieds (order matters here because of _.merge)
							var field_sort = _.zip(new_fields, old_fields);
							for(var x = 0; x < field_sort.length; x++){
								var field_pair = field_sort[x];
								if(field_pair.length === 2){
									//Merge new and old form fields together
									submission.form_fields[x] = _.merge(field_pair[0], field_pair[1]);
								}
							}

							//Save submissions after updating sumbission.form_fields
							submission.save(function(err){
								if (err) {
									// console.error(err);
									callback(err);
								} else {
									callback(null);
									// console.log('Form Submission CREATED');
									// res.status(200).send('Form submission successfully saved');
								}            
							});	
						};

						async.each(submissions, updateSubmission, function(err){
							callback(null);
						});
					}
				});
			}
			callback(null);
		},
		function(callback){
			form.save(function(err) {
				if (err) {
					callback(err);
					// console.log(err);
					// res.status(400).send({
					// 	message: errorHandler.getErrorMessage(err)
					// });
				} else {
					callback(err, form);
				}
			});
		}
	], function(err, result){
		if(err){
			console.log(err);
			res.status(500).send({
				message: err.message
			});
		}else {
			res.status(200).send({
				message: 'Form successfully updated'
			});
		}
	});
};

/**
 * Delete a form
 */
exports.delete = function(req, res) {
	var form = req.form;
	console.log('deleting form');
	Form.remove({_id: form._id}, function(err) {
		if (err) {
			res.status(500).send({
				message: err.message
			});
		} else {
			console.log('Form successfully deleted');
			res.status(200).send('Form successfully deleted');
		}
	});
};

/**
 * Get All of Users' Forms
 */
exports.list = function(req, res) {
	//Allow 'admin' user to view all forms
	var searchObj = {admin: req.user};
	if(req.user.isAdmin()) searchObj = {};

	Form.find({}).sort('-created').populate('admin').exec(function(err, forms) {
		if (err) {
			res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
		} else {
			res.json(forms);
		}
	});
};


/**
 * Form middleware
 */
exports.formByID = function(req, res, next, id) {

	if (!mongoose.Types.ObjectId.isValid(id)) {
		res.status(400).send({
			message: 'Form is invalid'
		});
	}

	Form.findById(id).populate('admin').exec(function(err, form) {
		if (err) {
			return next(err);
		} else if (!form || form === null) {
			res.status(404).send({
				message: 'Form not found'
			});
		}
		else {
			if(!form.admin){
				form.admin = req.user;
				form.save(function(err) {
					if (err) {
						console.log(err);
						res.status(400).send({
							message: errorHandler.getErrorMessage(err)
						});
					} else {
						//Remove sensitive information from User object
						form.admin.password = null;
						form.admin.created = null;
						form.admin.salt = null;

						req.form = form;
						next();
					}
				});
			}

			//Remove sensitive information from User object
			form.admin.password = null;
			form.admin.created = null;
			form.admin.salt = null;

			req.form = form;
			next();
		}
	});
};

/**
 * Form authorization middleware
 */
exports.hasAuthorization = function(req, res, next) {

	var form = req.form;
	if (req.form.admin.id !== req.user.id && req.user.roles.indexOf('admin') === -1) {
		res.status(403).send({
			message: 'User '+req.user.username+' is not authorized'
		});
	}
	next();
};
