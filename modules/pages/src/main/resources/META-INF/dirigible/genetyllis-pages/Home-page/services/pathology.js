var dao = require("genetyllis-app/gen/dao/nomenclature/Pathology.js");
var rs = require('http/v4/rs');
var response = require('http/v4/response');

// HTTP 200
var sendResponseOk = function (entity) {
    sendResponse(200, entity);
};

// HTTP 201
var sendResponseCreated = function (entity) {
    sendResponse(201, entity);
};

// HTTP 200
var sendResponseNoContent = function () {
    sendResponse(204);
};

// HTTP 400
var sendResponseBadRequest = function (message) {
    sendResponse(404, {
        'code': 400,
        'message': message
    });
};

// HTTP 404
var sendResponseNotFound = function (message) {
    sendResponse(404, {
        'code': 404,
        'message': message
    });
};

// Generic
var sendResponse = function (status, body) {
    response.setContentType('application/json');
    response.setStatus(status);
    if (body) {
        response.println(JSON.stringify(body));
    }
};

rs.service()
    .resource('')
    .get(function (id) {
        console.log(id)
        var entities = dao.customDataCount("");

        sendResponseOk(entities);
    })
    .resource('{id}')
    .get(function (ctx) {
        var id = ctx.pathParameters.id;
        var entity = dao.get(id);
        console.log(ctx)
        console.log("_------------------------------------------____")
        if (entity) {
            sendResponseOk(entity);
        } else {
            sendResponseNotFound('Books not found');
        }
    })
    .resource('')
    .post(function (ctx, request, response) {
        var entity = request.getJSON();
        entity.id = dao.create(entity);
        response.setHeader('Content-Location', 'genetyllis-app/gen/dao/nomenclature/Pathology.js' + entity.id);
        sendResponseCreated(entity);
    })
    .resource('{id}')
    .put(function (ctx, request) {
        var entity = request.getJSON();
        entity.id = ctx.pathParameters.id;
        dao.update(entity);
        sendResponseOk(entity);
    })
    .resource('{id}')
    .delete(function (ctx) {
        var id = ctx.pathParameters.id;
        var entity = dao.get(id);
        if (entity) {
            dao.delete(id);
            sendResponseNoContent();
        } else {
            sendResponseNotFound('Books not found');
        }
    })
    .execute();