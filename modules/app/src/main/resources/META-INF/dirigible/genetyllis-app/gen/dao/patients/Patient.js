/*
 * Copyright (c) 2022 codbex or an codbex affiliate company and contributors
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-FileCopyrightText: 2022 codbex or an codbex affiliate company and contributors
 * SPDX-License-Identifier: EPL-2.0
 */
var query = require("db/v4/query");
var producer = require("messaging/v4/producer");
var daoApi = require("db/v4/dao");
var EntityUtils = require("genetyllis-app/gen/dao/utils/EntityUtils");

var filterSql = "";
var filterFamilyHistorySql = "";
var filterSqlParams = [];
var useWhere = true;

var dao = daoApi.create({
	table: "GENETYLLIS_PATIENT",
	properties: [
		{
			name: "Id",
			column: "PATIENT_ID",
			type: "INTEGER",
			id: true,
			autoIncrement: true,
		}, {
			name: "LabId",
			column: "GENETYLLIS_PATIENT_LABID",
			type: "VARCHAR",
		}, {
			name: "BirthDate",
			column: "PATIENT_AGE",
			type: "DATE",
		}, {
			name: "GenderId",
			column: "PATIENT_GENDERID",
			type: "INTEGER",
		}, {
			name: "Info",
			column: "PATIENT_INFO",
			type: "VARCHAR",
		}, {
			name: "PhysicianId",
			column: "GENETYLLIS_PATIENT_PHYSICIANID",
			type: "INTEGER",
		}, {
			name: "PopulationId",
			column: "GENETYLLIS_PATIENT_POPULATIONID",
			type: "INTEGER",
		}]
});

exports.list = function (settings) {
	return dao.list(settings).map(function (e) {
		EntityUtils.setLocalDate(e, "BirthDate");
		return e;
	});
};

exports.get = function (id) {
	var entity = dao.find(id);
	// TODO this produces 500
	// EntityUtils.setLocalDate(entity, "BirthDate");
	return entity;
};

exports.create = function (entity) {
	EntityUtils.setLocalDate(entity, "BirthDate");
	var id = dao.insert(entity);
	triggerEvent("Create", {
		table: "GENETYLLIS_PATIENT",
		key: {
			name: "Id",
			column: "PATIENT_ID",
			value: id
		}
	});
	return id;
};

exports.update = function (entity) {
	EntityUtils.setLocalDate(entity, "BirthDate");
	dao.update(entity);
	triggerEvent("Update", {
		table: "GENETYLLIS_PATIENT",
		key: {
			name: "Id",
			column: "PATIENT_ID",
			value: entity.Id
		}
	});
};

exports.delete = function (id) {
	dao.remove(id);
	triggerEvent("Delete", {
		table: "GENETYLLIS_PATIENT",
		key: {
			name: "Id",
			column: "PATIENT_ID",
			value: id
		}
	});
};

exports.count = function () {
	return dao.count();
};

exports.customDataCount = function () {
	var resultSet = query.execute("SELECT COUNT(*) AS COUNT FROM GENETYLLIS_PATIENT");
	if (resultSet !== null && resultSet[0] !== null) {
		if (resultSet[0].COUNT !== undefined && resultSet[0].COUNT !== null) {
			return resultSet[0].COUNT;
		} else if (resultSet[0].count !== undefined && resultSet[0].count !== null) {
			return resultSet[0].count;
		}
	}
	return 0;
};

exports.getPatientByLabId = function (labId) {
	paramArr = [];
	paramArr.push(labId)
	var resultSet = query.execute("SELECT * FROM GENETYLLIS_PATIENT WHERE GENETYLLIS_PATIENT_LABID = ? LIMIT 1", paramArr);
	return resultSet;
}

exports.getPatientAndHistoryByLabId = function (labId) {
	paramArr = [];
	paramArr.push(labId)
	var resultSet = query.execute("SELECT * FROM GENETYLLIS_PATIENT GP " +
		"JOIN GENETYLLIS_CLINICALHISTORY GC ON GP.PATIENT_ID = GC.CLINICALHISTORY_PATIENTID " +
		"JOIN GENETYLLIS_FAMILYHISTORY GF ON GP.PATIENT_ID = GF.FAMILYHISTORY_FAMILYMEMBERID  WHERE GENETYLLIS_PATIENT_LABID = ?", paramArr);
	return resultSet;
}

exports.suggestLabIds = function (labId) {
	paramArr = [];
	paramArr.push('%' + labId + '%')
	var resultSet = query.execute("SELECT * FROM GENETYLLIS_PATIENT WHERE GENETYLLIS_PATIENT_LABID LIKE ? LIMIT 10", paramArr);
	return resultSet;
}

exports.filterPatients = function (patient) {
	initFilterSql();

	var response = {};

	filterSql = buildFilterSql(patient.GENETYLLIS_PATIENT, filterSql);
	filterSql = buildFilterSql(patient.GENETYLLIS_CLINICALHISTORY, filterSql);
	filterSql = buildFilterSql(patient.GENETYLLIS_VARIANT, filterSql);
	buildFamilyHistoryFilterSql(patient.GENETYLLIS_FAMILYHISTORY);

	filterSql += " LIMIT " + patient.perPage + " OFFSET " + patient.currentPage;

	var resultSet = query.execute(filterSql, filterSqlParams);

	filterSql = filterSql.replace('*', 'COUNT(*)');

	var resultSetCount = query.execute(filterSql, filterSqlParams);

	response.data = resultSet;
	response.totalItems = resultSetCount[0]["COUNT(*)"];
	response.totalPages = Math.floor(response.totalItems / patient.perPage) + (response.totalItems % patient.perPage == 0 ? 0 : 1);

	filterSql = "";

	return response;
}

function buildFilterSql(object, sql) {
	var keys = Object.keys(object);
	for (var i = 0; i < keys.length; i++) {
		var val = object[keys[i]];
		if (Array.isArray(val) ? (val.length > 0) : (val !== undefined && val !== '' && val !== null)) {
			if (useWhere) {
				sql += " WHERE ";
			} else {
				sql += " AND ";
			}

			condition = "";

			if (Array.isArray(val)) {
				condition = keys[i] + addArrayValuesToSql(val);

			} else if (keys[i].toString().endsWith('_TO')) {
				condition = keys[i].slice(0, -3) + " <= ?";
				addFilterParam(val);

			} else if (keys[i].toString().endsWith('_FROM')) {
				condition = keys[i].slice(0, -5) + " >= ?";
				addFilterParam(val);

			} else {
				condition = keys[i] + " = ?";
				addFilterParam(val);
			}

			sql += condition;
			useWhere = false;
		}
	}

	return sql;
}

function buildFamilyHistoryFilterSql(object) {
	if (useWhere) {
		filterSql += " WHERE ";
	} else {
		filterSql += " AND ";
	}

	useWhere = false;

	filterSql += "GF.FAMILYHISTORY_FAMILYMEMBERID IN (";
	filterSql += buildFilterSql(object, filterFamilyHistorySql);
	filterSql += ")"
}

function addArrayValuesToSql(array) {
	var inStatement = " IN (";
	array.forEach(element => {
		inStatement += "?,";
		addFilterParam(element);
	})

	inStatement = inStatement.slice(0, -1)
	inStatement += ")";

	return inStatement;
}

function initFilterSql() {
	useWhere = true;
	filterSqlParams = [];
	filterSql = "SELECT * FROM GENETYLLIS_PATIENT GP " +
		"LEFT JOIN GENETYLLIS_CLINICALHISTORY GC ON GP.PATIENT_ID = GC.CLINICALHISTORY_PATIENTID " +
		"LEFT JOIN GENETYLLIS_FAMILYHISTORY GF ON GP.PATIENT_ID = GF.FAMILYHISTORY_PATIENTID " +
		"LEFT JOIN GENETYLLIS_PATHOLOGY GPT ON GC.CLINICALHISTORY_PATHOLOGYID = GPT.PATHOLOGY_ID " +
		"LEFT JOIN GENETYLLIS_VARIANTRECORD GVR ON GP.PATIENT_ID = GVR.VARIANTRECORD_PATIENTID " +
		"LEFT JOIN GENETYLLIS_VARIANT GV ON GVR.VARIANTRECORD_VARIANTID = GV.VARIANT_ID";
	filterFamilyHistorySql = "SELECT PATIENT_ID " +
		"FROM GENETYLLIS_PATIENT GPF " +
		"JOIN GENETYLLIS_CLINICALHISTORY GCF ON GPF.PATIENT_ID = GCF.CLINICALHISTORY_PATIENTID " +
		"JOIN GENETYLLIS_PATHOLOGY GPTF ON GCF.CLINICALHISTORY_PATHOLOGYID = GPTF.PATHOLOGY_ID";
}

function addFilterParam(param) {
	if (isNaN(param)) {
		filterSqlParams.push(param.toString());
	} else {
		filterSqlParams.push(param);
	}
}

function triggerEvent(operation, data) {
	producer.queue("genetyllis-app/patients/Patient/" + operation).send(JSON.stringify(data));
}
