'use strict';

// coffeescript's for in loop
var __indexOf = [].indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++) {
        if (i in this && this[i] === item) return i;
    }
    return -1;
};

angular.module('forms').directive('fieldDirective', ['$http', '$compile', '$rootScope', '$templateCache',
    function($http, $compile, $rootScope, $templateCache) {
    
    var getTemplateUrl = function(fieldType) {
        var type = fieldType;
        var templateUrl = 'modules/forms/views/directiveViews/field/';
        var supported_fields = [
            'textfield',
            'textarea',
            'date',
            'dropdown',
            'hidden',
            'password',
            'radio',
            'legal',
            'statement',
            'rating',
            'yes_no',
            'number',
            'natural'
        ];
	if (__indexOf.call(supported_fields, type) >= 0) {
            templateUrl = templateUrl+type+'.html';
        }

   		return $templateCache.get('../public/'+templateUrl);
    };

    return {
        template: '<div>{{field.title}}</div>',
        restrict: 'E',
        scope: {
            field: '=',
            required: '&',
            design: '=',
            index: '=',
        },
        link: function(scope, element) {
            scope.setActiveField = $rootScope.setActiveField;
            
            //Set format only if field is a date
            if(scope.field.fieldType === 'date'){
                scope.dateOptions = {
                    changeYear: true,
                    changeMonth: true,
                    altFormat: 'mm/dd/yyyy',
                    yearRange: '1900:-0',   
                    defaultDate: 0,
                };
            }
		    
            var fieldType = scope.field.fieldType;
	
			if(scope.field.fieldType === 'number' || scope.field.fieldType === 'textfield' || scope.field.fieldType === 'email' || scope.field.fieldType === 'link'){
				switch(scope.field.fieldType){
					case 'textfield':
						scope.field.input_type = 'text';
						break;
					case 'email':
						scope.field.input_type = 'email';
						scope.field.placeholder = 'joesmith@example.com';
						break;
					case 'number':
                        scope.field.input_type = 'number';
                        break;
                    default:
						scope.field.input_type = 'url';
						scope.field.placeholder = 'http://example.com';
						break;
				}
				fieldType = 'textfield';
			}
            var template = getTemplateUrl(fieldType);
           	element.html(template).show();
            $compile(element.contents())(scope);
        },
    };
}]);
