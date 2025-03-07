'use strict';

angular.module('forms').directive('submitFormDirective', ['$http', 'TimeCounter', '$filter', '$rootScope', 'Auth',
    function ($http, TimeCounter, $filter, $rootScope, Auth) {
        return {
            templateUrl: 'modules/forms/views/directiveViews/form/submit-form.client.view.html',    
            restrict: 'E',
            scope: {
                myform:'='
            },
            controller: function($document, $window, $scope){
                $scope.authentication = $rootScope.authentication;
		        $scope.noscroll = false;
                $scope.forms = {};                
                $scope.form_fields_count = $scope.myform.visible_form_fields.filter(function(field){
                    if(field.fieldType === 'statement' || field.fieldType === 'rating'){
                        return false;
                    }	
                    return true;
                }).length;
		
                $scope.reloadForm = function(){
                    //Reset Form
                    $scope.myform.submitted = false;
                    $scope.myform.form_fields = _.chain($scope.myform.visible_form_fields).map(function(field){
                            field.fieldValue = '';
                            return field;
                        }).value();

					$scope.loading = false;
                    $scope.error = '';
                    
                    $scope.selected = {
                        _id: '',
                        index: 0
                    };
                    $scope.setActiveField($scope.myform.visible_form_fields[0]._id, 0, false);    
                
                    console.log($scope.selected);
                    //Reset Timer
                    TimeCounter.restartClock(); 
                };
				
				$window.onscroll = function(){
            		$scope.scrollPos = document.body.scrollTop || document.documentElement.scrollTop || 0;
					var elemBox = document.getElementsByClassName('activeField')[0].getBoundingClientRect();
					$scope.fieldTop = elemBox.top;
					$scope.fieldBottom = elemBox.bottom;
			        
                    //console.log($scope.forms.myForm);

                    if(!$scope.noscroll){
                        //Focus on submit button
                        if( $scope.selected.index === $scope.myform.form_fields.length-1 && $scope.fieldBottom < 200){
                            var field_index = $scope.selected.index+1;
                            var field_id = 'submit_field';
                            $scope.setActiveField(field_id, field_index, false);
                        } 
                        //Focus on field above submit button
                        else if($scope.selected.index === $scope.myform.form_fields.length){
                            if($scope.fieldTop > 200){    
                                var field_index = $scope.selected.index-1;
                                var field_id = $scope.myform.form_fields[field_index]._id;
                                $scope.setActiveField(field_id, field_index, false);
                            }
                        }else if( $scope.fieldBottom < 0){
                            var field_index = $scope.selected.index+1;
                            var field_id = $scope.myform.form_fields[field_index]._id;
                            $scope.setActiveField(field_id, field_index, false);
                        }else if ( $scope.selected.index !== 0 && $scope.fieldTop > 0) {
                            var field_index = $scope.selected.index-1;
                            var field_id = $scope.myform.form_fields[field_index]._id;
                            $scope.setActiveField(field_id, field_index, false); 
                        }
                        //console.log('$scope.selected.index: '+$scope.selected.index);
					    //console.log('scroll pos: '+$scope.scrollPos+' fieldTop: '+$scope.fieldTop+' fieldBottom: '+$scope.fieldBottom);
            		    $scope.$apply(); 
                    }
        		};

                /*
                ** Field Controls
                */
                $scope.setActiveField = $rootScope.setActiveField = function(field_id, field_index, animateScroll) {
                    if($scope.selected === null || $scope.selected._id === field_id){
						console.log('not scrolling');
						console.log($scope.selected);
						return;
		    		}
                    console.log('field_id: '+field_id);
                    console.log('field_index: '+field_index);
                    console.log($scope.selected);

                    $scope.selected._id = field_id;
                    $scope.selected.index = field_index;

                    if(animateScroll){
                        $scope.noscroll=true;
                        setTimeout(function() {
                            $document.scrollToElement(angular.element('.activeField'), -10, 200).then(function(){
                                $scope.noscroll = false;
                                document.querySelectorAll('.activeField .focusOn')[0].focus();
                            });
                        }, 20);
                    }
                };

                $rootScope.nextField = $scope.nextField = function(){
                    console.log('nextfield');
                    //console.log($scope.selected.index);
					//console.log($scope.myform.form_fields.length-1);
					if($scope.selected.index < $scope.myform.form_fields.length-1){
                        var selected_index = $scope.selected.index+1;
                        var selected_id = $scope.myform.form_fields[selected_index]._id;
                        $rootScope.setActiveField(selected_id, selected_index, true);
                    } else if($scope.selected.index === $scope.myform.form_fields.length-1) {
						var selected_index = $scope.selected.index+1;
						var selected_id = 'submit_field';
						$rootScope.setActiveField(selected_id, selected_index, true);
					}
                };

                $rootScope.prevField = $scope.prevField = function(){
                    if($scope.selected.index > 0){
                        var selected_index = $scope.selected.index - 1;
                        var selected_id = $scope.myform.form_fields[selected_index]._id;
                        $scope.setActiveField(selected_id, selected_index, true);
                    }
                };
                
                /*
                ** Form Display Functions
                */
                $scope.exitStartPage = function(){
                    $scope.myform.startPage.showStart = false;
                    if($scope.myform.form_fields.length > 0){ 
                        $scope.selected._id = $scope.myform.form_fields[0]._id;
                    }
                };

                $scope.submitForm = function(){
                    var _timeElapsed = TimeCounter.stopClock();
					$scope.loading = true;	
                    var form = _.cloneDeep($scope.myform);
                    form.timeElapsed = _timeElapsed;
                
                    form.percentageComplete = $filter('formValidity')($scope.myform)/$scope.myform.visible_form_fields.length*100;
                    delete form.visible_form_fields;

                    $scope.submitPromise = $http.post('/forms/'+$scope.myform._id, form)
                        .success(function(data, status, headers){
                            console.log('form submitted successfully');
                            setTimeout(function() {
                                $scope.myform.submitted = true;
                                $scope.loading = false;
                            }, 20);
                        })
                        .error(function(error){
                            setTimeout(function(){
                                $scope.loading = false;
                                console.log(error);
                                $scope.error = error.message;
                            }, 20);
                        });
                };

                //Load our form when the page is ready
                //angular.element(document).ready(function() {
                    $scope.reloadForm();
                //});

            }
        };
    }
]);
