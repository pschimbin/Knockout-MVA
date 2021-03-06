﻿/// <reference path="models.js" />
/// <reference path="jquery-2.1.4.js" />
/// <reference path="jquery.signalR-2.2.0.js" />


var serviceRoot = 'http://localhost:55555';

var AppViewModel = function () {
	var self = this;

	self.developers = ko.observableArray([]);
	self.bugs = ko.observableArray([]);

	self.isModifyDeveloper = false;
	self.currentDeveloper = ko.observable(new Developer());
	self.saveDeveloper = function () {
	    var id = self.currentDeveloper().id;
	    var updateData = ko.toJSON(self.currentDeveloper);
	    if (self.isModifyDeveloper) {
	        $.ajax({
	            method: "PUT",
	            url: serviceRoot + '/api/developers/' + id,
	            data: ko.toJSON(self.currentDeveloper)
	        });
	    } else {
	        $.post(serviceRoot + '/api/developers', ko.toJSON(self.currentDeveloper));
	    }

		// add developer
		if(!self.isModifyDeveloper) self.developers.unshift(self.currentDeveloper());

	    // reset developer
		self.currentDeveloper(new Developer());
		self.isModifyDeveloper = false;
	}
	self.modifyDeveloper = function(developer) {
		// developer will automatically be the one the user clicked on
		self.currentDeveloper(developer);
		self.isModifyDeveloper = true;
	}

	self.currentBug = ko.observable(new Bug());
	self.saveBug = function () {
	    var id = self.currentBug().id;
	    if (Math.floor(id) === id) {
	        // Valid integer ID - this is an update
	        $.ajax({
	            method: "PUT",
	            url: serviceRoot + '/api/bugs/' + id,
	            data: ko.toJSON(self.currentBug)
	        });
	    } else {
	        $.post(serviceRoot + '/api/bugs', ko.toJSON(self.currentBug));
	    }

	    self.bugs.unshift(self.currentBug());
		self.currentBug(new Bug());
	}

	ko.components.register('display-developers', {
		viewModel: function (params) {
			this.developers = params.developers;
		},
		template: 
			'<ul data-bind="foreach: developers" class="list-group">\
				<li class="list-group-item btn" data-bind="text: fullName, click: $root.modifyDeveloper"></li>\
			</ul>'
	});

	$.getJSON(serviceRoot + '/api/developers', function (data) {
	    var mappedDevs = $.map(data, function (item) {
	        return new Developer(item.firstName, item.lastName, item.id);
	    });
	    self.developers(mappedDevs);
	});

	$.getJSON(serviceRoot + '/api/bugs', function (data) {
	    var mappedBugs = $.map(data, function (item) {
	        return new Bug(item.description, item.id, item.status, item.assignedTo, item.dateClosed);
	    });
	    self.bugs(mappedBugs);
	});

	self.showDebug = ko.observable(false);
	self.toggleDebug = function () {
	    self.showDebug(!self.showDebug());
	};


	self.saveDeveloperSignalR = function () {
		// ko.toJS converts a "Knockout object" to a regular JavaScript object
		// SignalR wants a regular object, not JSON string
		// must use ko.toJS
		developerHub.server.addDeveloper(ko.toJS(self.currentDeveloper()));
	};

	self.developerAdded = function (developer) {
		// add the new developer to the list
		self.developers.unshift(new Developer(developer.FirstName, developer.LastName, developer.ID));
		// reset the display
		self.currentDeveloper(new Developer());
	};
}

// Bind up the view model
var appViewModel = new AppViewModel();
ko.applyBindings(appViewModel);

var developerHub = null;

$(function () {
	$.connection.hub.url = serviceRoot + '/signalr/hubs';
	developerHub = $.connection.developerHub;

	// called when developer is saved
	developerHub.client.developerAdded = appViewModel.developerAdded;
	$.connection.hub.start().done(function () { });
});