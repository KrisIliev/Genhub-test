/*
 * Copyright (c) 2018 SAP and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 * Contributors:
 * SAP - initial API and implementation
 */

exports.getPerspective = function () {
	return {
		"name": "home-page",
		"link": "../Home-page/index.html",
		"order": "1",
		"icon": "../Home-page/images/home.svg"
	};
};

if (typeof exports !== 'undefined') {
	exports.getView = function () {
		return viewData;
	}
}