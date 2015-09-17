(function () {
  'use strict';

  /**
   * @ngdoc overview
   * @name ui.grid.moveColumns
   * @description
   *
   * # ui.grid.moveColumns
   *
   * <div class="alert alert-warning" role="alert"><strong>Alpha</strong> This feature is in development. There will almost certainly be breaking api changes, or there are major outstanding bugs.</div>
   *
   * This module provides column moving capability to ui.grid. It enables to change the position of columns.
   * <div doc-module-components="ui.grid.moveColumns"></div>
   */
  var module = angular.module('ui.grid.moveColumns', ['ui.grid']);

  /**
   *  @ngdoc service
   *  @name ui.grid.moveColumns.service:uiGridMoveColumnService
   *  @description Service for column moving feature.
   */
  module.service('uiGridMoveColumnService', ['$q', '$timeout', '$log', 'ScrollEvent', 'uiGridConstants', 'gridUtil', function ($q, $timeout, $log, ScrollEvent, uiGridConstants, gridUtil) {

    var service = {
      initializeGrid: function (grid) {
        var self = this;
        this.registerPublicApi(grid);
        this.defaultGridOptions(grid.options);
        grid.moveColumns = {orderCache: []}; // Used to cache the order before columns are rebuilt
        grid.registerColumnBuilder(self.movableColumnBuilder);
        grid.registerDataChangeCallback(self.verifyColumnOrder, [uiGridConstants.dataChange.COLUMN]);
      },
      registerPublicApi: function (grid) {
        var self = this;
        /**
         *  @ngdoc object
         *  @name ui.grid.moveColumns.api:PublicApi
         *  @description Public Api for column moving feature.
         */
        var publicApi = {
          events: {
            /**
             * @ngdoc event
             * @name columnPositionChanged
             * @eventOf  ui.grid.moveColumns.api:PublicApi
             * @description raised when column is moved
             * <pre>
             * </pre>
             * @param {object} colDef the column that was moved
             * @param {integer} originalPosition of the column
             * @param {integer} finalPosition of the column
             */
            colMovable: {
              columnPositionChanged: function (colDef, originalPosition, newPosition) {
              }
            }
          },
          methods: {
            /**
             * @ngdoc method
             * @name moveColumn
             * @methodOf  ui.grid.moveColumns.api:PublicApi
             * @description Method can be used to change column position.
             * <pre>
             *      gridApi.colMovable.moveColumn(oldPosition, newPosition)
             * </pre>
             * @param {integer} originalPosition of the column
             * @param {integer} finalPosition of the column
             */
            colMovable: {
              moveColumn: function (originalPosition, finalPosition) {
                var columns = grid.columns;
                if (!angular.isNumber(originalPosition) || !angular.isNumber(finalPosition)) {
                  gridUtil.logError('MoveColumn: Please provide valid values for originalPosition and finalPosition');
                  return;
                }
                var nonMovableColumns = 0;
                for (var i = 0; i < columns.length; i++) {
                  if ((angular.isDefined(columns[i].colDef.visible) && columns[i].colDef.visible === false) || columns[i].isRowHeader === true) {
                    nonMovableColumns++;
                  }
                }
                if (originalPosition >= (columns.length - nonMovableColumns) || finalPosition >= (columns.length - nonMovableColumns)) {
                  gridUtil.logError('MoveColumn: Invalid values for originalPosition, finalPosition');
                  return;
                }
                var findPositionForRenderIndex = function (index) {
                  var position = index;
                  for (var i = 0; i <= position; i++) {
                    if (angular.isDefined(columns[i]) && ((angular.isDefined(columns[i].colDef.visible) && columns[i].colDef.visible === false) || columns[i].isRowHeader === true)) {
                      position++;
                    }
                  }
                  return position;
                };
                self.redrawColumnAtPosition(grid, findPositionForRenderIndex(originalPosition), findPositionForRenderIndex(finalPosition));
              }
            }
          }
        };
        grid.api.registerEventsFromObject(publicApi.events);
        grid.api.registerMethodsFromObject(publicApi.methods);
      },
      defaultGridOptions: function (gridOptions) {
        /**
         *  @ngdoc object
         *  @name ui.grid.moveColumns.api:GridOptions
         *
         *  @description Options for configuring the move column feature, these are available to be
         *  set using the ui-grid {@link ui.grid.class:GridOptions gridOptions}
         */
        /**
         *  @ngdoc object
         *  @name enableColumnMoving
         *  @propertyOf  ui.grid.moveColumns.api:GridOptions
         *  @description If defined, sets the default value for the colMovable flag on each individual colDefs
         *  if their individual enableColumnMoving configuration is not defined. Defaults to true.
         */
        gridOptions.enableColumnMoving = gridOptions.enableColumnMoving !== false;
      },
      movableColumnBuilder: function (colDef, col, gridOptions) {
        var promises = [];
        /**
         *  @ngdoc object
         *  @name ui.grid.moveColumns.api:ColumnDef
         *
         *  @description Column Definition for move column feature, these are available to be
         *  set using the ui-grid {@link ui.grid.class:GridOptions.columnDef gridOptions.columnDefs}
         */
        /**
         *  @ngdoc object
         *  @name enableColumnMoving
         *  @propertyOf  ui.grid.moveColumns.api:ColumnDef
         *  @description Enable column moving for the column.
         */
        colDef.enableColumnMoving = colDef.enableColumnMoving === undefined ? gridOptions.enableColumnMoving
          : colDef.enableColumnMoving;
        return $q.all(promises);
      },
      /**
       * @ngdoc method
       * @name updateColumnCache
       * @methodOf  ui.grid.moveColumns
       * @description Cache the current order of columns, so we can restore them after new columnDefs are defined
       */
      updateColumnCache: function(grid){
        grid.moveColumns.orderCache = grid.getOnlyDataColumns();
      },
      /**
       * @ngdoc method
       * @name verifyColumnOrder
       * @methodOf  ui.grid.moveColumns
       * @description dataChangeCallback which uses the cached column order to restore the column order
       * when it is reset by altering the columnDefs array.
       */
      verifyColumnOrder: function(grid){
        var headerRowOffset = grid.rowHeaderColumns.length;
        var newIndex;

        angular.forEach(grid.moveColumns.orderCache, function(cacheCol, cacheIndex){
          newIndex = grid.columns.indexOf(cacheCol);
          if ( newIndex !== -1 && newIndex - headerRowOffset !== cacheIndex ){
            var column = grid.columns.splice(newIndex, 1)[0];
            grid.columns.splice(cacheIndex + headerRowOffset, 0, column);
          }
        });
      },
      redrawColumnAtPosition: function (grid, originalPosition, newPosition) {

        var columns = grid.columns;

        var originalColumn = columns[originalPosition];
        if (!grid.options.enableColumnMoving || !originalColumn.colDef.enableColumnMoving) {
          return;
        }

        if (originalPosition > newPosition) {
          if (!columns[newPosition].colDef.enableColumnMoving) {
            this.redrawColumnAtPosition(grid, originalPosition, newPosition+1);
          }
          for (var i1 = originalPosition; i1 > newPosition; i1--) {
            columns[i1] = columns[i1 - 1];
          }
        }
        else if (newPosition > originalPosition) {
          if (!columns[newPosition].colDef.enableColumnMoving) {
            this.redrawColumnAtPosition(grid, originalPosition, newPosition-1);
            return;
          }
          for (var i2 = originalPosition; i2 < newPosition; i2++) {
            columns[i2] = columns[i2 + 1];
          }
        }
        columns[newPosition] = originalColumn;
        service.updateColumnCache(grid);
        grid.queueGridRefresh();
        $timeout(function () {
          grid.api.core.notifyDataChange( uiGridConstants.dataChange.COLUMN );
          grid.api.colMovable.raise.columnPositionChanged(originalColumn.colDef, originalPosition, newPosition);
        });
      }
    };
    return service;
  }]);

  /**
   *  @ngdoc directive
   *  @name ui.grid.moveColumns.directive:uiGridMoveColumns
   *  @element div
   *  @restrict A
   *  @description Adds column moving features to the ui-grid directive.
   *  @example
   <example module="app">
   <file name="app.js">
   var app = angular.module('app', ['ui.grid', 'ui.grid.moveColumns']);
   app.controller('MainCtrl', ['$scope', function ($scope) {
        $scope.data = [
          { name: 'Bob', title: 'CEO', age: 45 },
          { name: 'Frank', title: 'Lowly Developer', age: 25 },
          { name: 'Jenny', title: 'Highly Developer', age: 35 }
        ];
        $scope.columnDefs = [
          {name: 'name'},
          {name: 'title'},
          {name: 'age'}
        ];
      }]);
   </file>
   <file name="main.css">
   .grid {
      width: 100%;
      height: 150px;
    }
   </file>
   <file name="index.html">
   <div ng-controller="MainCtrl">
   <div class="grid" ui-grid="{ data: data, columnDefs: columnDefs }" ui-grid-move-columns></div>
   </div>
   </file>
   </example>
   */
  module.directive('uiGridMoveColumns', ['uiGridMoveColumnService', function (uiGridMoveColumnService) {
    return {
      replace: true,
      priority: 0,
      require: '^uiGrid',
      scope: false,
      compile: function () {
        return {
          pre: function ($scope, $elm, $attrs, uiGridCtrl) {
            uiGridMoveColumnService.initializeGrid(uiGridCtrl.grid);
          },
          post: function ($scope, $elm, $attrs, uiGridCtrl) {
          }
        };
      }
    };
  }]);

  /**
   *  @ngdoc directive
   *  @name ui.grid.moveColumns.directive:uiGridHeaderCell
   *  @element div
   *  @restrict A
   *
   *  @description Stacks on top of ui.grid.uiGridHeaderCell to provide capability to be able to move it to reposition column.
   *
   *  On receiving mouseDown event headerCell is cloned, now as the mouse moves the cloned header cell also moved in the grid.
   *  In case the moving cloned header cell reaches the left or right extreme of grid, grid scrolling is triggered (if horizontal scroll exists).
   *  On mouseUp event column is repositioned at position where mouse is released and cloned header cell is removed.
   *
   *  Events that invoke cloning of header cell:
   *    - mousedown
   *
   *  Events that invoke movement of cloned header cell:
   *    - mousemove
   *
   *  Events that invoke repositioning of column:
   *    - mouseup
   */
  module.directive('uiGridHeaderCell', ['$q', 'gridUtil', 'uiGridMoveColumnService', '$document', '$log', 'uiGridConstants', 'ScrollEvent',
    function ($q, gridUtil, uiGridMoveColumnService, $document, $log, uiGridConstants, ScrollEvent) {
      return {
        priority: -10,
        require: '^uiGrid',
        compile: function () {
          return {
            post: function ($scope, $elm, $attrs, uiGridCtrl) {
              $scope.$watch('grid.options.enableColumnMoving', function (enableMoving) {
                if (enableMoving) {
                  onDownEvents();
                }
                else {
                  offAllEvents();
                }
              });

              /*
               * Our general approach to column move is that we listen to a touchstart or mousedown
               * event over the column header.  When we hear one, then we wait for a move of the same type
               * - if we are a touchstart then we listen for a touchmove, if we are a mousedown we listen for
               * a mousemove (i.e. a drag) before we decide that there's a move underway.  If there's never a move,
               * and we instead get a mouseup or a touchend, then we just drop out again and do nothing.
               *
              */
              var $contentsElm = angular.element( $elm[0].querySelectorAll('.ui-grid-cell-contents') );

              var gridLeft;
              var previousMouseX;
              var totalMouseMovement;
              var visibleSavedIndex = null;
              var rightMoveLimit;
              var elmCloned = false;
              var movingElm;
              var reducedWidth;
              var moveOccurred = false;

              var downFn = function( event ){
                //Setting some variables required for calculations.
                gridLeft = $scope.grid.element[0].getBoundingClientRect().left;
                if ( $scope.grid.hasLeftContainer() ){
                    gridLeft += $scope.grid.renderContainers.left.header[0].getBoundingClientRect().width;
                }

                previousMouseX = event.pageX;
                totalMouseMovement = 0;
                rightMoveLimit = gridLeft + $scope.grid.getViewportWidth();

                if ( event.type === 'mousedown' ){
                  $document.on('mousemove', moveFn);
                  $document.on('mouseup', upFn);
                } else if ( event.type === 'touchstart' ){
                  $document.on('touchmove', moveFn);
                  $document.on('touchend', upFn);
                }
              };

              var moveFn = function( event ) {
                var changeValue = event.pageX - previousMouseX;
                if ( changeValue === 0 ){ return; }
                //Disable text selection in Chrome during column move
                document.onselectstart = function() { return false; };

                moveOccurred = true;

                if (!elmCloned) {
                  cloneElement();
                }
                else if (elmCloned) {
                  moveElement(changeValue, event.pageX);
                  previousMouseX = event.pageX;
                }
              };

              var upFn = function( event ){
                //Re-enable text selection after column move
                document.onselectstart = null;

                //Remove the cloned element on mouse up.
                if (movingElm) {
                  movingElm.remove();
                  elmCloned = false;
                }

                offAllEvents();
                onDownEvents();

                if (!moveOccurred){
                  return;
                }

                var columns = $scope.grid.columns;
                var columnIndex = 0;
                for (var i = 0; i < columns.length; i++) {
                  if (columns[i].colDef.name !== $scope.col.colDef.name) {
                    columnIndex++;
                  }
                  else {
                    break;
                  }
                }
                moveColumnPosition(true);
                $elm.parent().removeClass('columnsMoving');
                angular.element('.ui-grid-header-canvas').removeClass('headerColumnsAreMoving');
              };

              var onDownEvents = function(){
                $contentsElm.on('touchstart', downFn);
                $contentsElm.on('mousedown', downFn);
              };

              var offAllEvents = function() {
                $contentsElm.off('touchstart', downFn);
                $contentsElm.off('mousedown', downFn);

                $document.off('mousemove', moveFn);
                $document.off('touchmove', moveFn);

                $document.off('mouseup', upFn);
                $document.off('touchend', upFn);
              };

              if ($scope.col.colDef.enableColumnMoving) {
                onDownEvents();
              }

              var cloneElement = function () {
                elmCloned = true;

                //Cloning header cell and appending to current header cell.
                movingElm = $elm.clone();
                $elm.parent().append(movingElm);

                //Left of cloned element should be aligned to original header cell.
                angular.element('.ui-grid-header-canvas').addClass('headerColumnsAreMoving');
                $elm.parent().addClass('columnsMoving');
                movingElm.addClass('movingColumn');
                var movingElementStyles = {};
                var elmLeft;
                if (gridUtil.detectBrowser() === 'safari') {
                  //Correction for Safari getBoundingClientRect,
                  //which does not correctly compute when there is an horizontal scroll
                  elmLeft = $elm[0].offsetLeft + $elm[0].offsetWidth - $elm[0].getBoundingClientRect().width;
                }
                else {
                  elmLeft = $elm[0].getBoundingClientRect().left;
                }
                movingElementStyles.left = (elmLeft - gridLeft) + 'px';
                var gridRight = $scope.grid.element[0].getBoundingClientRect().right;
                var elmRight = $elm[0].getBoundingClientRect().right;
                if (elmRight > gridRight) {
                  reducedWidth = $scope.col.drawnWidth + (gridRight - elmRight);
                  movingElementStyles.width = reducedWidth + 'px';
                }
                movingElm.css(movingElementStyles);
              };

              var moveElement = function (changeValue, cursorLocation) {
                //Calculate total column width
                var columns = $scope.grid.columns;
                var totalColumnWidth = 0;
                for (var i = 0; i < columns.length; i++) {
                  if (angular.isUndefined(columns[i].colDef.visible) || columns[i].colDef.visible === true) {
                    totalColumnWidth += columns[i].drawnWidth || columns[i].width || columns[i].colDef.width;
                  }
                }

                //Calculate new position of left of column
                var currentElmLeft = movingElm[0].getBoundingClientRect().left - 1;
                var currentElmRight = movingElm[0].getBoundingClientRect().right;
                var currentElmCenter = (currentElmRight - currentElmLeft) / 2;
                var newElementLeft = cursorLocation - currentElmCenter;
                newElementLeft = newElementLeft < rightMoveLimit ? newElementLeft : rightMoveLimit;

                //Update css of moving column to adjust to new left value or fire scroll in case column has reached edge of grid
                if ((currentElmLeft >= gridLeft || changeValue > 0) && (currentElmRight <= rightMoveLimit || changeValue < 0)) {
                  movingElm.css({visibility: 'visible', 'left': newElementLeft + 'px'});
                }
                else if (totalColumnWidth > Math.ceil(uiGridCtrl.grid.gridWidth)) {
                  changeValue *= 8;
                  var scrollEvent = new ScrollEvent($scope.col.grid, null, null, 'uiGridHeaderCell.moveElement');
                  scrollEvent.x = {pixels: changeValue};
                  scrollEvent.grid.scrollContainers('',scrollEvent);
                }

                //Calculate total width of columns on the left of the moving column and the mouse movement
                var totalColumnsLeftWidth = 0;
                for (var il = 0; il < columns.length; il++) {
                  if (angular.isUndefined(columns[il].colDef.visible) || columns[il].colDef.visible === true) {
                    if (columns[il].colDef.name !== $scope.col.colDef.name) {
                      totalColumnsLeftWidth += columns[il].drawnWidth || columns[il].width || columns[il].colDef.width;
                    }
                    else {
                      break;
                    }
                  }
                }
                if ($scope.newScrollLeft === undefined) {
                  totalMouseMovement += changeValue;
                }
                else {
                  totalMouseMovement = $scope.newScrollLeft + newElementLeft - totalColumnsLeftWidth;
                }

                //Increase width of moving column, in case the rightmost column was moved and its width was
                //decreased because of overflow
                if (reducedWidth < $scope.col.drawnWidth) {
                  reducedWidth += Math.abs(changeValue);
                  movingElm.css({'width': reducedWidth + 'px'});
                }

                moveColumnPosition(false);
              };

              //this function either repositions the columns or add classes to the ui-grid-header-cells that would be repositioned
              var moveColumnPosition = function (isColumnDropped) {
                  var columns = $scope.grid.columns;
                  var columnIndex = 0;
                  var visibleMovableNewIndex = null;
                  var visibleMovableColumnIndex = 0;
                  var visibleMovableColumnsCount = 0;

                  if (isColumnDropped) {
                    $elm.parent().find('div.new_position_left').removeClass('new_position_left');
                    $elm.parent().find('div.new_position_right').removeClass('new_position_right');
                  }

                  for (var j = 0; j < columns.length; j++) {
                    if ( (angular.isUndefined(columns[j].colDef.visible) || columns[j].colDef.visible === true) && columns[j].colDef.pinnedLeft !== true && columns[j].colDef.pinnedRight !== true) {
                      visibleMovableColumnsCount++;
                    }
                  }

                  for (var i = 0; i < columns.length; i++) {
                    if (columns[i].colDef.name !== $scope.col.colDef.name) {
                      columnIndex++;
                      if ( (angular.isUndefined(columns[i].colDef.visible) || columns[i].colDef.visible === true) && columns[i].colDef.pinnedLeft !== true && columns[i].colDef.pinnedRight !== true){
                        visibleMovableColumnIndex++;
                      }
                    }
                    else {
                      if (isColumnDropped) {
                        $elm.parent().find('div.ui-grid-header-cell').eq(visibleMovableColumnIndex).removeClass('old_position');
                      } else {
                        $elm.parent().find('div.ui-grid-header-cell').eq(visibleMovableColumnIndex).addClass('old_position');
                      }
                      break;
                    }
                  }

                  //Case where column should be moved to a position on its left
                  if (totalMouseMovement < 0) {
                    var totalColumnsLeftWidth = 0;
                    var visibleMovableColumnsLeftCount = 0;
                    for (var il = columnIndex - 1; il >= 0; il--) {
                      if (angular.isUndefined(columns[il].colDef.visible) || columns[il].colDef.visible === true) {
                        if (columns[il].colDef.pinnedLeft !== true && columns[il].colDef.pinnedRight !== true) {
                            visibleMovableColumnsLeftCount++;
                        }
                        totalColumnsLeftWidth += columns[il].drawnWidth || columns[il].width || columns[il].colDef.width;
                        if (totalColumnsLeftWidth > Math.abs(totalMouseMovement)) {
                          if (isColumnDropped) {
                            uiGridMoveColumnService.redrawColumnAtPosition
                            ($scope.grid, columnIndex, il + 1);
                          } else {
                            visibleMovableNewIndex = visibleMovableColumnIndex - visibleMovableColumnsLeftCount + 1;
                          }
                          break;
                        }
                      }
                    }
                    //Case where column should be moved to beginning of the grid.
                    if (totalColumnsLeftWidth < Math.abs(totalMouseMovement)) {
                      if (isColumnDropped) {
                        uiGridMoveColumnService.redrawColumnAtPosition
                        ($scope.grid, columnIndex, 0);
                      } else {
                        visibleMovableNewIndex = 0;
                      }
                    }
                  }

                  //Case where column should be moved to a position on its right
                  else if (totalMouseMovement > 0) {
                    var totalColumnsRightWidth = 0;
                    var visibleMovableColumnsRightCount = 0;
                    for (var ir = columnIndex + 1; ir < columns.length; ir++) {
                      if (angular.isUndefined(columns[ir].colDef.visible) || columns[ir].colDef.visible === true) {
                        if (columns[ir].colDef.pinnedLeft !== true && columns[ir].colDef.pinnedRight !== true) {
                            visibleMovableColumnsRightCount++;
                        }
                        totalColumnsRightWidth += columns[ir].drawnWidth || columns[ir].width || columns[ir].colDef.width;
                        if (totalColumnsRightWidth > totalMouseMovement) {
                          if (isColumnDropped) {
                            uiGridMoveColumnService.redrawColumnAtPosition
                            ($scope.grid, columnIndex, ir - 1);
                          } else {
                            visibleMovableNewIndex = visibleMovableColumnIndex + visibleMovableColumnsRightCount - 1;
                          }
                          break;
                        }
                      }
                    }
                    //Case where column should be moved to end of the grid.
                    if (totalColumnsRightWidth < totalMouseMovement) {
                      if (isColumnDropped) {
                        uiGridMoveColumnService.redrawColumnAtPosition
                        ($scope.grid, columnIndex, columns.length - 1);
                      } else {
                        visibleMovableNewIndex = visibleMovableColumnsCount - 1;
                      }
                    }
                  }
                  if (isColumnDropped === false && visibleMovableNewIndex !== null && visibleSavedIndex !== visibleMovableNewIndex) {
                    $elm.parent().find('div.new_position_left').removeClass('new_position_left');
                    $elm.parent().find('div.new_position_right').removeClass('new_position_right');
                    if (visibleMovableColumnIndex !== visibleMovableNewIndex) {
                      if (totalMouseMovement < 0) {
                        $elm.parent().find('div.ui-grid-header-cell').eq(visibleMovableNewIndex).addClass('new_position_left');
                      }
                      else if (totalMouseMovement > 0) {
                        $elm.parent().find('div.ui-grid-header-cell').eq(visibleMovableNewIndex).addClass('new_position_right');
                      }
                    }
                    visibleSavedIndex = visibleMovableNewIndex;
                  }
              };
            }
          };
        }
      };
    }]);
})();
