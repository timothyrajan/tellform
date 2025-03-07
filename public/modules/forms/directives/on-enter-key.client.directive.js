'use strict';

angular.module('forms').directive('onEnterKey', ['$rootScope', function($rootScope){
	return {
		restrict: 'A', 
		link: function($scope, $element, $attrs) {
			$element.bind('keydown keypress', function(event) {
				var keyCode = event.which || event.keyCode;
				console.log($attrs.onEnterKey);		
				if(keyCode === 13) {
					$rootScope.$apply(function() {
						$rootScope.$eval($attrs.onEnterKey);
					});
					
					event.preventDefault();
				}
			});
		}
	};	
}]);
