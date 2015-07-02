'use strict';

// Forms controller
angular.module('forms').controller('ViewFormController', ['$scope', '$stateParams', '$state', 'Forms', 'CurrentForm','$http',
	function($scope, $stateParams, $state, Forms, CurrentForm, $http) {

        // view form submissions
        $scope.form = CurrentForm.getForm();
        $scope.submissions = [];
        $scope.viewSubmissions = false;
        $scope.table = {
            'rows': [],
            'masterChecker': false,
        };


        //Table Methods
        $scope.table.toggleAllCheckers = function(masterChecker){
            for(var i=0; i<$scope.table.rows.length; i++){
                $scope.table.rows[i].selected = $scope.table.masterChecker;
            }
        }
        $scope.table.toggleCheckerSelection = function($event, description) {
            $event.stopPropagation();
            console.log('checkbox clicked');
        }
        $scope.table.rowClicked = function(obj) {
           console.log('row clicked');
           obj.selected = !obj.selected;
        };

        //show submissions of Form
        $scope.showSubmissions = function(){
        	$scope.viewSubmissions = true;
            if(!$scope.submissions.length !== 0){
                $http.get('/forms/'+$scope.form._id+'/submissions')
                    .success(function(data, status, headers){
                        console.log(data);
                        $scope.submissions = data;
                        $scope.table.rows = data;
                        for(var i=0;i<$scope.table.rows.length; i++){
                            $scope.table.rows[i].selected = false;
                        }
                        console.log('form submissions successfully fetched');
                        if(!$scope.$$phase){
                            $scope.$apply();
                        }
                    })
                    .error(function(err){
                        console.log('Could not fetch form submissions.\nError: '+err);
                    });            
            }
        };

        //hide submissions of Form
        $scope.hideSubmissions = function(){
        	$scope.viewSubmissions = false;
        };

		// Return all user's Forms
		$scope.findAll = function() {
			$scope.forms = Forms.query();
		};

		// Find a specific Form
		$scope.findOne = function() {
			$scope.form = Forms.get({
				formId: $stateParams.formId
			});
			CurrentForm.setForm($scope.form);
		};

        // Remove existing Form
        $scope.remove = function() {
            var form = CurrentForm.getForm() || $scope.form;

            $http.delete('/forms/'+$scope.form._id)
                .success(function(data, status, headers){
                    console.log('form deleted successfully');
                    alert('Form deleted..');
                    $state.go('listForms');
                }).error(function(error){
                    console.log('ERROR: Form could not be deleted.');
                    console.error(error);
                });
        };
	}
]);